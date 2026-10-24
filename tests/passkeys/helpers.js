// Test helpers: an in-memory Firestore/Auth stand-in and a software WebAuthn
// authenticator that produces REAL ES256 registration and assertion responses,
// so @simplewebauthn/server verifies them exactly as it would a browser's.

import crypto from "node:crypto";
import { isoCBOR } from "@simplewebauthn/server/helpers";

/* ------------------------------------------------------------------ */
/* Fake Firestore (just the subset the passkey service uses)          */
/* ------------------------------------------------------------------ */

export function createFakeDb() {
  const store = new Map(); // "col/id" -> data

  const clone = (v) => (v === undefined ? undefined : structuredClone(v));

  const docRef = (col, id) => ({
    id,
    path: `${col}/${id}`,
    async get() {
      const data = store.get(`${col}/${id}`);
      return snapshot(col, id, data);
    },
    async set(data) {
      store.set(`${col}/${id}`, clone(data));
    },
    async update(patch) {
      const key = `${col}/${id}`;
      if (!store.has(key)) throw Object.assign(new Error("NOT_FOUND"), { code: 5 });
      store.set(key, { ...store.get(key), ...clone(patch) });
    },
    async create(data) {
      const key = `${col}/${id}`;
      if (store.has(key)) throw Object.assign(new Error("6 ALREADY_EXISTS: Document already exists"), { code: 6 });
      store.set(key, clone(data));
    },
  });

  const snapshot = (col, id, data) => ({
    id,
    exists: data !== undefined,
    ref: docRef(col, id),
    data: () => clone(data),
  });

  const query = (col, filters = [], max = Infinity) => ({
    where(field, op, value) {
      if (op !== "==") throw new Error("fake db only supports ==");
      return query(col, [...filters, [field, value]], max);
    },
    limit(n) {
      return query(col, filters, n);
    },
    async get() {
      const docs = [];
      for (const [key, data] of store) {
        const [c, id] = key.split("/");
        if (c !== col) continue;
        if (filters.every(([f, v]) => data?.[f] === v)) docs.push(snapshot(col, id, data));
        if (docs.length >= max) break;
      }
      return { empty: docs.length === 0, size: docs.length, docs, forEach: (fn) => docs.forEach(fn) };
    },
  });

  const db = {
    store,
    collection: (col) => ({ doc: (id) => docRef(col, id), ...query(col) }),
    async runTransaction(fn) {
      const tx = {
        get: (ref) => ref.get(),
        set: (ref, data) => { store.set(ref.path, clone(data)); },
      };
      return fn(tx);
    },
    // helpers for tests
    put(col, id, data) { store.set(`${col}/${id}`, clone(data)); },
    read(col, id) { return clone(store.get(`${col}/${id}`)); },
    all(col) {
      return [...store.entries()].filter(([k]) => k.startsWith(`${col}/`)).map(([k, v]) => ({ id: k.slice(col.length + 1), ...v }));
    },
  };
  return db;
}

export function createFakeAuth() {
  const tokens = new Map(); // idToken -> uid
  const users = new Map(); // uid -> { disabled, customClaims }
  const revokedSessions = new Set();
  return {
    tokens,
    users,
    revokedSessions,
    async setCustomUserClaims(uid, claims) {
      if (!users.has(uid)) throw new Error("user not found");
      users.set(uid, { ...users.get(uid), customClaims: structuredClone(claims) });
    },
    async revokeRefreshTokens(uid) {
      revokedSessions.add(uid);
    },
    async verifyIdToken(token) {
      if (!tokens.has(token)) throw new Error("invalid token");
      return { uid: tokens.get(token) };
    },
    async getUser(uid) {
      if (!users.has(uid)) throw new Error("user not found");
      return { uid, ...users.get(uid) };
    },
    async createCustomToken(uid) {
      return `custom-token-for:${uid}`;
    },
  };
}

/* ------------------------------------------------------------------ */
/* Fake req / res                                                      */
/* ------------------------------------------------------------------ */

export function call(handle, action, { body = {}, idToken, ip = "203.0.113.7", method = "POST" } = {}) {
  const req = {
    method,
    query: { action },
    body,
    headers: {
      ...(idToken ? { authorization: `Bearer ${idToken}` } : {}),
      "x-forwarded-for": ip,
    },
  };
  return new Promise((resolve) => {
    const res = {
      statusCode: 200,
      headers: {},
      setHeader(k, v) { this.headers[k] = v; },
      status(code) { this.statusCode = code; return this; },
      json(payload) { resolve({ status: this.statusCode, body: payload }); return this; },
    };
    handle(req, res);
  });
}

/* ------------------------------------------------------------------ */
/* Software authenticator                                              */
/* ------------------------------------------------------------------ */

const b64u = (buf) => Buffer.from(buf).toString("base64url");
const sha256 = (data) => crypto.createHash("sha256").update(data).digest();

export class SoftAuthenticator {
  constructor({ origin = "http://localhost:3000", rpID = "localhost", userVerified = true } = {}) {
    this.origin = origin;
    this.rpID = rpID;
    this.userVerified = userVerified;
    this.credentials = new Map(); // credentialId -> { privateKey, counter, userHandle }
  }

  flags({ at = false } = {}) {
    let f = 0x01; // user present
    if (this.userVerified) f |= 0x04;
    if (at) f |= 0x40;
    return f;
  }

  /** Answer a navigator.credentials.create() using the server's options JSON. */
  register(optionsJSON, overrides = {}) {
    const { publicKey, privateKey } = crypto.generateKeyPairSync("ec", { namedCurve: "P-256" });
    const jwk = publicKey.export({ format: "jwk" });
    const credId = crypto.randomBytes(16);
    const credentialId = b64u(credId);

    const cose = isoCBOR.encode(
      new Map([
        [1, 2],
        [3, -7],
        [-1, 1],
        [-2, Buffer.from(jwk.x, "base64url")],
        [-3, Buffer.from(jwk.y, "base64url")],
      ])
    );

    const counter = Buffer.alloc(4);
    const credIdLen = Buffer.alloc(2);
    credIdLen.writeUInt16BE(credId.length);
    const authData = Buffer.concat([
      sha256(overrides.rpID || this.rpID),
      Buffer.from([this.flags({ at: true })]),
      counter,
      Buffer.alloc(16), // aaguid
      credIdLen,
      credId,
      Buffer.from(cose),
    ]);

    const attestationObject = isoCBOR.encode(
      new Map([
        ["fmt", "none"],
        ["attStmt", new Map()],
        ["authData", authData],
      ])
    );

    const clientDataJSON = Buffer.from(
      JSON.stringify({
        type: "webauthn.create",
        challenge: overrides.challenge || optionsJSON.challenge,
        origin: overrides.origin || this.origin,
        crossOrigin: false,
      })
    );

    this.credentials.set(credentialId, { privateKey, counter: 0, userHandle: optionsJSON.user.id });

    return {
      id: credentialId,
      rawId: credentialId,
      type: "public-key",
      response: {
        clientDataJSON: b64u(clientDataJSON),
        attestationObject: b64u(attestationObject),
        transports: ["internal"],
      },
      clientExtensionResults: {},
      authenticatorAttachment: "platform",
    };
  }

  /** Answer a navigator.credentials.get(). */
  authenticate(optionsJSON, credentialId = [...this.credentials.keys()][0], overrides = {}) {
    const cred = this.credentials.get(credentialId);
    if (!cred) throw new Error("no such credential on this authenticator");
    cred.counter += 1;

    const counter = Buffer.alloc(4);
    counter.writeUInt32BE(overrides.counter ?? cred.counter);
    const authData = Buffer.concat([
      sha256(overrides.rpID || this.rpID),
      Buffer.from([this.flags()]),
      counter,
    ]);
    const clientDataJSON = Buffer.from(
      JSON.stringify({
        type: "webauthn.get",
        challenge: overrides.challenge || optionsJSON.challenge,
        origin: overrides.origin || this.origin,
        crossOrigin: false,
      })
    );
    const signer = overrides.signWith || cred.privateKey;
    const signature = crypto.sign("sha256", Buffer.concat([authData, sha256(clientDataJSON)]), signer);

    return {
      id: credentialId,
      rawId: credentialId,
      type: "public-key",
      response: {
        clientDataJSON: b64u(clientDataJSON),
        authenticatorData: b64u(authData),
        signature: b64u(signature),
        userHandle: overrides.userHandle ?? cred.userHandle,
      },
      clientExtensionResults: {},
      authenticatorAttachment: "platform",
    };
  }
}