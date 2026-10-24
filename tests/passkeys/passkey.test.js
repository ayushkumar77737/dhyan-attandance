import { describe, it, expect, beforeEach } from "vitest";
import crypto from "node:crypto";
import { createPasskeyService } from "../../server/passkeys/service.js";
import { loadPasskeyConfig } from "../../server/passkeys/config.js";
import { signCredentialRecord } from "../../server/passkeys/signing.js";
import { createFakeDb, createFakeAuth, call, SoftAuthenticator } from "./helpers.js";

const SECRET = "test-secret-".padEnd(48, "x");
const GOOD_TOTP = "123456";

let db, auth, clock, handle, config;

function seed() {
  const users = [
    { id: "USER1", uid: "uid-user1", role: "user", name: "ANITA" },
    { id: "USER2", uid: "uid-user2", role: "user", name: "RAVI" },
    { id: "ADMIN2", uid: "uid-admin2", role: "admin", name: "ADMIN TWO" },
    { id: "ADMIN1", uid: "uid-admin1", role: "admin", name: "SUPER" },
  ];
  for (const u of users) {
    db.put("users", u.id, { ...u, mfaEnabled: true, mfaSecret: `secret-${u.id}` });
    auth.users.set(u.uid, { disabled: false });
    auth.tokens.set(`idtoken-${u.id}`, u.uid);
  }
}

beforeEach(() => {
  db = createFakeDb();
  auth = createFakeAuth();
  clock = { t: Date.UTC(2026, 9, 24, 10, 0, 0) };
  config = loadPasskeyConfig({ PASSKEY_SIGNING_SECRET: SECRET, NODE_ENV: "test" });
  handle = createPasskeyService({
    adminAuth: auth,
    adminDb: db,
    verifyTotp: async (_secret, code) => code === GOOD_TOTP,
    config,
    now: () => clock.t,
    logger: { warn() {}, error() {} },
  });
  seed();
});

const totp = { method: "totp", code: GOOD_TOTP };

async function registerPasskey(userId, authenticator, { label = "My phone", stepUp = totp } = {}) {
  const opts = await call(handle, "register-options", { idToken: `idtoken-${userId}`, body: { stepUp } });
  expect(opts.status, JSON.stringify(opts.body)).toBe(200);
  const response = authenticator.register(opts.body.options);
  const done = await call(handle, "register-verify", {
    idToken: `idtoken-${userId}`,
    body: { token: opts.body.token, response, label },
  });
  return { opts, response, done };
}

async function loginWith(authenticator, credentialId, overrides = {}, extraBody = {}) {
  const opts = await call(handle, "login-options");
  expect(opts.status).toBe(200);
  const response = authenticator.authenticate(opts.body.options, credentialId, overrides);
  return call(handle, "login-verify", { body: { token: opts.body.token, response, ...extraBody } });
}

/* ================================================================== */

describe("configuration", () => {
  it("falls back to localhost outside production", () => {
    expect(config.ok).toBe(true);
    expect(config.rpID).toBe("localhost");
  });

  it("refuses to run in production without RP settings", () => {
    const c = loadPasskeyConfig({ PASSKEY_SIGNING_SECRET: SECRET, VERCEL_ENV: "production" });
    expect(c.ok).toBe(false);
  });

  it("rejects origins outside the RP ID and plain http in production", () => {
    const c = loadPasskeyConfig({
      PASSKEY_SIGNING_SECRET: SECRET,
      WEBAUTHN_RP_ID: "dhyan.example.org",
      WEBAUTHN_ORIGINS: "https://evil.example.com,http://dhyan.example.org",
      VERCEL_ENV: "production",
    });
    expect(c.ok).toBe(false);
    expect(c.problems.join(" ")).toMatch(/not on the RP ID/);
    expect(c.problems.join(" ")).toMatch(/must use https/);
  });

  it("answers 503 when not configured and 405 for GET", async () => {
    const h = createPasskeyService({ adminAuth: auth, adminDb: db, verifyTotp: async () => true, config: loadPasskeyConfig({}), logger: { error() {} } });
    expect((await call(h, "login-options")).status).toBe(503);
    expect((await call(handle, "login-options", { method: "GET" })).status).toBe(405);
  });
});

describe("registration", () => {
  it("registers an employee passkey and stores only public data", async () => {
    const a = new SoftAuthenticator();
    const { done, response } = await registerPasskey("USER1", a);
    expect(done.status, JSON.stringify(done.body)).toBe(200);
    expect(done.body.passkey.label).toBe("My phone");

    const stored = db.read("passkeyCredentials", response.id);
    expect(stored.uid).toBe("uid-user1");
    expect(stored.userId).toBe("USER1");
    expect(stored.status).toBe("active");
    expect(stored.publicKey).toBeTruthy();
    expect(stored.sig).toBeTruthy();
    expect(JSON.stringify(stored)).not.toMatch(/PRIVATE|privateKey|"d":/);

    const list = await call(handle, "list", { idToken: "idtoken-USER1" });
    expect(list.body.passkeys).toHaveLength(1);
    expect(list.body.passkeys[0]).not.toHaveProperty("publicKey");
  });

  it("registers an admin passkey against that admin account", async () => {
    const { done, response } = await registerPasskey("ADMIN2", new SoftAuthenticator());
    expect(done.status).toBe(200);
    const stored = db.read("passkeyCredentials", response.id);
    expect(stored.userId).toBe("ADMIN2");
    expect(stored.roleAtRegistration).toBe("admin");
  });

  it("allows several passkeys per account and excludes existing ones", async () => {
    await registerPasskey("USER1", new SoftAuthenticator(), { label: "Phone" });
    await registerPasskey("USER1", new SoftAuthenticator(), { label: "Laptop" });
    const opts = await call(handle, "register-options", { idToken: "idtoken-USER1", body: { stepUp: totp } });
    expect(opts.body.options.excludeCredentials).toHaveLength(2);
    const list = await call(handle, "list", { idToken: "idtoken-USER1" });
    expect(list.body.passkeys.map((p) => p.label)).toEqual(["Phone", "Laptop"]);
  });

  it("requires a signed-in session", async () => {
    const r = await call(handle, "register-options", { body: { stepUp: totp } });
    expect(r.status).toBe(401);
    expect(r.body.code).toBe("AUTH_REQUIRED");
  });

  it("requires step-up (a password-only session cannot add a passkey)", async () => {
    const none = await call(handle, "register-options", { idToken: "idtoken-USER1", body: {} });
    expect(none.body.code).toBe("STEP_UP_REQUIRED");
    const wrong = await call(handle, "register-options", { idToken: "idtoken-USER1", body: { stepUp: { method: "totp", code: "000000" } } });
    expect(wrong.body.code).toBe("STEP_UP_FAILED");
  });

  it("requires MFA to be enabled first", async () => {
    db.put("users", "USER1", { ...db.read("users", "USER1"), mfaEnabled: false });
    const r = await call(handle, "register-options", { idToken: "idtoken-USER1", body: { stepUp: totp } });
    expect(r.body.code).toBe("MFA_NOT_ENABLED");
  });

  it("rejects a response from the wrong origin", async () => {
    const opts = await call(handle, "register-options", { idToken: "idtoken-USER1", body: { stepUp: totp } });
    const response = new SoftAuthenticator().register(opts.body.options, { origin: "https://phish.example" });
    const r = await call(handle, "register-verify", { idToken: "idtoken-USER1", body: { token: opts.body.token, response } });
    expect(r.body.code).toBe("VERIFICATION_FAILED");
  });

  it("rejects a response for the wrong RP ID", async () => {
    const opts = await call(handle, "register-options", { idToken: "idtoken-USER1", body: { stepUp: totp } });
    const response = new SoftAuthenticator().register(opts.body.options, { rpID: "evil.test" });
    const r = await call(handle, "register-verify", { idToken: "idtoken-USER1", body: { token: opts.body.token, response } });
    expect(r.body.code).toBe("VERIFICATION_FAILED");
  });

  it("requires user verification (PIN / biometric)", async () => {
    const opts = await call(handle, "register-options", { idToken: "idtoken-USER1", body: { stepUp: totp } });
    const response = new SoftAuthenticator({ userVerified: false }).register(opts.body.options);
    const r = await call(handle, "register-verify", { idToken: "idtoken-USER1", body: { token: opts.body.token, response } });
    expect(r.body.code).toBe("VERIFICATION_FAILED");
  });

  it("cannot finish a registration challenge issued to another account", async () => {
    const opts = await call(handle, "register-options", { idToken: "idtoken-USER1", body: { stepUp: totp } });
    const response = new SoftAuthenticator().register(opts.body.options);
    // USER2 tries to attach a credential using USER1's challenge
    const r = await call(handle, "register-verify", { idToken: "idtoken-USER2", body: { token: opts.body.token, response } });
    expect(r.body.code).toBe("CHALLENGE_INVALID");
  });

  it("sanitizes labels", async () => {
    const { done } = await registerPasskey("USER1", new SoftAuthenticator(), { label: "  <b>Work\u0000 laptop</b>  " + "x".repeat(80) });
    expect(done.body.passkey.label).not.toMatch(/[<>]/);
    expect(done.body.passkey.label.includes("\u0000")).toBe(false);
    expect(done.body.passkey.label.length).toBeLessThanOrEqual(40);
  });
});

describe("login", () => {
  it("logs an employee in and returns a custom token for the existing uid", async () => {
    const a = new SoftAuthenticator();
    const { response } = await registerPasskey("USER1", a);
    const r = await loginWith(a, response.id);
    expect(r.status, JSON.stringify(r.body)).toBe(200);
    expect(r.body.customToken).toBe("custom-token-for:uid-user1");
    expect(r.body.userId).toBe("USER1");
    expect(r.body.role).toBe("user");
    expect(r.body.mfaEnabled).toBe(true);
    const stored = db.read("passkeyCredentials", response.id);
    expect(stored.counter).toBe(1);
    expect(stored.lastUsedAt).toBe(clock.t);
  });

  it("logs an admin in with the admin role read from the database", async () => {
    const a = new SoftAuthenticator();
    const { response } = await registerPasskey("ADMIN2", a);
    const r = await loginWith(a, response.id);
    expect(r.body.role).toBe("admin");
    expect(r.body.customToken).toBe("custom-token-for:uid-admin2");
  });

  it("ignores identity or role fields sent by the browser", async () => {
    const a = new SoftAuthenticator();
    const { response } = await registerPasskey("USER1", a);
    const r = await loginWith(a, response.id, {}, { userId: "ADMIN1", role: "admin", uid: "uid-admin1" });
    expect(r.body.userId).toBe("USER1");
    expect(r.body.role).toBe("user");
  });

  it("uses the role at login time, never the one at registration (no promotion)", async () => {
    const a = new SoftAuthenticator();
    const { response } = await registerPasskey("ADMIN2", a);
    db.put("users", "ADMIN2", { ...db.read("users", "ADMIN2"), role: "user" });
    const r = await loginWith(a, response.id);
    expect(r.body.role).toBe("user");
  });

  it("rejects an unknown credential", async () => {
    const a = new SoftAuthenticator();
    const opts = await call(handle, "login-options");
    a.register({ challenge: "x", user: { id: "AAAA" } }); // credential the server never saw
    const response = a.authenticate(opts.body.options);
    const r = await call(handle, "login-verify", { body: { token: opts.body.token, response } });
    expect(r.status).toBe(401);
    expect(r.body.code).toBe("CREDENTIAL_NOT_FOUND");
  });

  it("rejects an invalid signature", async () => {
    const a = new SoftAuthenticator();
    const { response } = await registerPasskey("USER1", a);
    const { privateKey: otherKey } = crypto.generateKeyPairSync("ec", { namedCurve: "P-256" });
    const r = await loginWith(a, response.id, { signWith: otherKey });
    expect(r.body.code).toBe("VERIFICATION_FAILED");
  });

  it("rejects an assertion for a different challenge", async () => {
    const a = new SoftAuthenticator();
    const { response } = await registerPasskey("USER1", a);
    const r = await loginWith(a, response.id, { challenge: "c29tZS1vdGhlci1jaGFsbGVuZ2U" });
    expect(r.body.code).toBe("VERIFICATION_FAILED");
  });

  it("rejects an expired challenge", async () => {
    const a = new SoftAuthenticator();
    const { response: reg } = await registerPasskey("USER1", a);
    const opts = await call(handle, "login-options");
    const response = a.authenticate(opts.body.options, reg.id);
    clock.t += 6 * 60 * 1000;
    const r = await call(handle, "login-verify", { body: { token: opts.body.token, response } });
    expect(r.body.code).toBe("CHALLENGE_EXPIRED");
  });

  it("rejects challenge reuse (replay)", async () => {
    const a = new SoftAuthenticator();
    const { response: reg } = await registerPasskey("USER1", a);
    const opts = await call(handle, "login-options");
    const response = a.authenticate(opts.body.options, reg.id);
    const first = await call(handle, "login-verify", { body: { token: opts.body.token, response } });
    expect(first.status).toBe(200);
    const again = await call(handle, "login-verify", { body: { token: opts.body.token, response } });
    expect(again.body.code).toBe("CHALLENGE_USED");
  });

  it("rejects a tampered challenge token", async () => {
    const opts = await call(handle, "login-options");
    const [body, sig] = opts.body.token.split(".");
    const payload = JSON.parse(Buffer.from(body, "base64url").toString());
    payload.exp += 10 ** 9;
    const forged = `${Buffer.from(JSON.stringify(payload)).toString("base64url")}.${sig}`;
    const r = await call(handle, "login-verify", { body: { token: forged, response: { id: "x", type: "public-key", response: {} } } });
    expect(r.body.code).toBe("CHALLENGE_INVALID");
  });

  it("rejects a registration token used as a login token", async () => {
    const opts = await call(handle, "register-options", { idToken: "idtoken-USER1", body: { stepUp: totp } });
    const r = await call(handle, "login-verify", { body: { token: opts.body.token, response: { id: "x", type: "public-key", response: {} } } });
    expect(r.body.code).toBe("CHALLENGE_INVALID");
  });

  it("rejects a cloned authenticator (counter went backwards)", async () => {
    const a = new SoftAuthenticator();
    const { response } = await registerPasskey("USER1", a);
    expect((await loginWith(a, response.id, { counter: 5 })).status).toBe(200);
    const r = await loginWith(a, response.id, { counter: 3 });
    expect(r.body.code).toBe("VERIFICATION_FAILED");
  });

  it("rejects an assertion whose user handle belongs to someone else", async () => {
    const a = new SoftAuthenticator();
    const { response } = await registerPasskey("USER1", a);
    const r = await loginWith(a, response.id, { userHandle: "c29tZW9uZS1lbHNl" });
    expect(r.body.code).toBe("VERIFICATION_FAILED");
  });

  it("requires user verification at login", async () => {
    const a = new SoftAuthenticator();
    const { response } = await registerPasskey("USER1", a);
    a.userVerified = false;
    const r = await loginWith(a, response.id);
    expect(r.body.code).toBe("VERIFICATION_FAILED");
  });

  it.each([
    ["disabled in the portal", (d) => db.put("users", "USER1", { ...d, disabled: true }), "ACCOUNT_DISABLED"],
    ["deleted", (d) => db.put("users", "USER1", { ...d, deleted: true }), "ACCOUNT_UNAVAILABLE"],
    ["disabled in Firebase Auth", () => auth.users.set("uid-user1", { disabled: true }), "ACCOUNT_DISABLED"],
    ["locked after wrong passwords", () => db.put("loginAttempts", "USER1", { attempts: 3, lockUntil: clock.t + 3600_000 }), "ACCOUNT_LOCKED"],
  ])("denies a valid passkey when the account is %s", async (_label, mutate, code) => {
    const a = new SoftAuthenticator();
    const { response } = await registerPasskey("USER1", a);
    mutate(db.read("users", "USER1"));
    const r = await loginWith(a, response.id);
    expect(r.body.code).toBe(code);
    expect(r.body.customToken).toBeUndefined();
  });

  it("denies a disabled admin", async () => {
    const a = new SoftAuthenticator();
    const { response } = await registerPasskey("ADMIN2", a);
    db.put("users", "ADMIN2", { ...db.read("users", "ADMIN2"), disabled: true });
    const r = await loginWith(a, response.id);
    expect(r.body.code).toBe("ACCOUNT_DISABLED");
  });

  it("rate-limits login attempts per IP", async () => {
    let last;
    for (let i = 0; i < 31; i++) {
      last = await call(handle, "login-verify", { body: { token: "nope", response: {} }, ip: "198.51.100.9" });
    }
    expect(last.status).toBe(429);
    // a different IP is unaffected
    const other = await call(handle, "login-verify", { body: { token: "nope", response: {} }, ip: "198.51.100.10" });
    expect(other.body.code).toBe("CHALLENGE_INVALID");
  });
});

describe("forged records (browser writes to Firestore)", () => {
  it("ignores a credential record written without the server signature", async () => {
    // Attacker registers their own key on their own account...
    const a = new SoftAuthenticator();
    const { response } = await registerPasskey("USER1", a);
    // ...then edits the record in Firestore to point at the super admin.
    const rec = db.read("passkeyCredentials", response.id);
    db.put("passkeyCredentials", response.id, { ...rec, uid: "uid-admin1", userId: "ADMIN1" });
    const r = await loginWith(a, response.id);
    expect(r.body.code).toBe("CREDENTIAL_NOT_FOUND");
  });

  it("ignores a revoked record flipped back to active", async () => {
    const a = new SoftAuthenticator();
    const { response } = await registerPasskey("USER1", a);
    const del = await call(handle, "remove", { idToken: "idtoken-USER1", body: { credentialId: response.id, stepUp: totp } });
    expect(del.status).toBe(200);
    const rec = db.read("passkeyCredentials", response.id);
    db.put("passkeyCredentials", response.id, { ...rec, status: "active" });
    expect((await loginWith(a, response.id)).body.code).toBe("CREDENTIAL_NOT_FOUND");
  });

  it("would accept the same record if signed with the server secret (sanity check)", async () => {
    const a = new SoftAuthenticator();
    const { response } = await registerPasskey("USER1", a);
    const rec = db.read("passkeyCredentials", response.id);
    rec.label = "renamed directly";
    rec.sig = signCredentialRecord(SECRET, rec);
    db.put("passkeyCredentials", response.id, rec);
    expect((await loginWith(a, response.id)).status).toBe(200);
  });
});

describe("managing passkeys", () => {
  it("renames only your own passkey", async () => {
    const { response } = await registerPasskey("USER1", new SoftAuthenticator());
    const mine = await call(handle, "rename", { idToken: "idtoken-USER1", body: { credentialId: response.id, label: "Pixel 9" } });
    expect(mine.body.passkey.label).toBe("Pixel 9");
    const theirs = await call(handle, "rename", { idToken: "idtoken-USER2", body: { credentialId: response.id, label: "hacked" } });
    expect(theirs.body.code).toBe("NOT_FOUND");
    expect(db.read("passkeyCredentials", response.id).label).toBe("Pixel 9");
  });

  it("removes a passkey after passkey re-authentication; it can no longer sign in", async () => {
    const a = new SoftAuthenticator();
    const { response: p1 } = await registerPasskey("USER1", a, { label: "one" });
    const { response: p2 } = await registerPasskey("USER1", a, { label: "two" });

    const re = await call(handle, "reauth-options", { idToken: "idtoken-USER1" });
    expect(re.body.options.allowCredentials).toHaveLength(2);
    const assertion = a.authenticate(re.body.options, p2.id);
    const del = await call(handle, "remove", {
      idToken: "idtoken-USER1",
      body: { credentialId: p1.id, stepUp: { method: "passkey", token: re.body.token, response: assertion } },
    });
    expect(del.status, JSON.stringify(del.body)).toBe(200);
    expect(del.body.remaining).toBe(1);

    expect((await loginWith(a, p1.id)).body.code).toBe("CREDENTIAL_NOT_FOUND");
    expect((await loginWith(a, p2.id)).status).toBe(200);
  });

  it("requires step-up to remove", async () => {
    const { response } = await registerPasskey("USER1", new SoftAuthenticator());
    const r = await call(handle, "remove", { idToken: "idtoken-USER1", body: { credentialId: response.id } });
    expect(r.body.code).toBe("STEP_UP_REQUIRED");
  });

  it("cannot remove another account's passkey", async () => {
    const { response } = await registerPasskey("USER1", new SoftAuthenticator());
    const r = await call(handle, "remove", { idToken: "idtoken-USER2", body: { credentialId: response.id, stepUp: totp } });
    expect(r.body.code).toBe("NOT_FOUND");
    expect(db.read("passkeyCredentials", response.id).status).toBe("active");
  });

  it("cannot use another account's passkey as step-up", async () => {
    const a = new SoftAuthenticator();
    const { response: victimKey } = await registerPasskey("USER1", a);
    const { response: attackerKey } = await registerPasskey("USER2", new SoftAuthenticator());
    const re = await call(handle, "reauth-options", { idToken: "idtoken-USER2" });
    const assertion = a.authenticate(re.body.options, victimKey.id);
    const r = await call(handle, "remove", {
      idToken: "idtoken-USER2",
      body: { credentialId: attackerKey.id, stepUp: { method: "passkey", token: re.body.token, response: assertion } },
    });
    expect(r.body.code).toBe("STEP_UP_FAILED");
  });

  it("rate-limits step-up guesses", async () => {
    let last;
    for (let i = 0; i < 9; i++) {
      last = await call(handle, "register-options", { idToken: "idtoken-USER1", body: { stepUp: { method: "totp", code: "000000" } } });
    }
    expect(last.status).toBe(429);
  });
});

describe("admin recovery (lost device)", () => {
  it("an employee cannot use the admin revoke action", async () => {
    await registerPasskey("USER2", new SoftAuthenticator());
    const r = await call(handle, "admin-revoke", { idToken: "idtoken-USER1", body: { targetUserId: "USER2", stepUp: totp } });
    expect(r.status).toBe(403);
  });

  it("an admin revokes an employee's passkeys; they stop working", async () => {
    const a = new SoftAuthenticator();
    const { response } = await registerPasskey("USER1", a);
    const r = await call(handle, "admin-revoke", { idToken: "idtoken-ADMIN2", body: { targetUserId: "USER1", stepUp: totp } });
    expect(r.body.revoked).toBe(1);
    expect((await loginWith(a, response.id)).body.code).toBe("CREDENTIAL_NOT_FOUND");
  });

  it("only the super admin can revoke another admin's passkeys", async () => {
    await registerPasskey("ADMIN2", new SoftAuthenticator());
    const byAdmin = await call(handle, "admin-revoke", { idToken: "idtoken-ADMIN2", body: { targetUserId: "ADMIN1", stepUp: totp } });
    expect(byAdmin.status).toBe(403);
    const bySuper = await call(handle, "admin-revoke", { idToken: "idtoken-ADMIN1", body: { targetUserId: "ADMIN2", stepUp: totp } });
    expect(bySuper.body.revoked).toBe(1);
  });

  it("requires step-up", async () => {
    const r = await call(handle, "admin-revoke", { idToken: "idtoken-ADMIN2", body: { targetUserId: "USER1" } });
    expect(r.body.code).toBe("STEP_UP_REQUIRED");
  });
});

describe("hardening (from security review)", () => {
  it("restoring an older, validly signed copy of a removed passkey does not bring it back", async () => {
    const a = new SoftAuthenticator();
    const { response } = await registerPasskey("USER1", a);
    const saved = db.read("passkeyCredentials", response.id); // attacker keeps a copy
    const del = await call(handle, "remove", { idToken: "idtoken-USER1", body: { credentialId: response.id, stepUp: totp } });
    expect(del.status).toBe(200);
    db.put("passkeyCredentials", response.id, saved); // ...and writes it back
    expect((await loginWith(a, response.id)).body.code).toBe("CREDENTIAL_NOT_FOUND");
  });

  it("restoring old copies after an admin revoke does not work either", async () => {
    const a = new SoftAuthenticator();
    const { response } = await registerPasskey("USER1", a);
    const saved = db.read("passkeyCredentials", response.id);
    await call(handle, "admin-revoke", { idToken: "idtoken-ADMIN2", body: { targetUserId: "USER1", stepUp: totp } });
    db.put("passkeyCredentials", response.id, saved);
    expect((await loginWith(a, response.id)).body.code).toBe("CREDENTIAL_NOT_FOUND");
  });

  it("an admin revoke also ends the account's existing sessions", async () => {
    await registerPasskey("USER1", new SoftAuthenticator());
    const r = await call(handle, "admin-revoke", { idToken: "idtoken-ADMIN2", body: { targetUserId: "USER1", stepUp: totp } });
    expect(r.body.signedOut).toBe(true);
    expect(auth.revokedSessions.has("uid-user1")).toBe(true);
  });

  it("other passkeys keep working after one is removed (they are re-signed)", async () => {
    const a = new SoftAuthenticator();
    const { response: p1 } = await registerPasskey("USER1", a, { label: "one" });
    const { response: p2 } = await registerPasskey("USER1", a, { label: "two" });
    await call(handle, "remove", { idToken: "idtoken-USER1", body: { credentialId: p1.id, stepUp: totp } });
    expect((await loginWith(a, p2.id)).status).toBe(200);
    const list = await call(handle, "list", { idToken: "idtoken-USER1" });
    expect(list.body.passkeys.map((p) => p.label)).toEqual(["two"]);
  });

  it("a counter edited in Firestore invalidates the record instead of bricking the key", async () => {
    const a = new SoftAuthenticator();
    const { response } = await registerPasskey("USER1", a);
    db.put("passkeyCredentials", response.id, { ...db.read("passkeyCredentials", response.id), counter: 2 ** 32 - 1 });
    expect((await loginWith(a, response.id)).body.code).toBe("CREDENTIAL_NOT_FOUND");
  });

  it("an admin cannot become super admin by editing the 'id' field of their users doc", async () => {
    await registerPasskey("ADMIN1", new SoftAuthenticator());
    db.put("users", "ADMIN2", { ...db.read("users", "ADMIN2"), id: "ADMIN1" });
    const r = await call(handle, "admin-revoke", { idToken: "idtoken-ADMIN2", body: { targetUserId: "ADMIN1", stepUp: totp } });
    expect(r.status).toBe(403);
  });

  it("stores the user handle the authenticator was given, even if the handle doc changes mid-way", async () => {
    const a = new SoftAuthenticator();
    const opts = await call(handle, "register-options", { idToken: "idtoken-USER1", body: { stepUp: totp } });
    db.put("passkeyUsers", "uid-user1", { uid: "uid-user1", userHandle: "dGFtcGVyZWQ", sig: "bad" });
    const response = a.register(opts.body.options);
    const done = await call(handle, "register-verify", { idToken: "idtoken-USER1", body: { token: opts.body.token, response } });
    expect(done.status).toBe(200);
    expect((await loginWith(a, response.id)).status).toBe(200);
  });

  it("re-checks the passkey limit when finishing a registration", async () => {
    const limited = createPasskeyService({
      adminAuth: auth, adminDb: db, verifyTotp: async (_s, c) => c === GOOD_TOTP,
      config: { ...config, maxPasskeysPerUser: 1 }, now: () => clock.t, logger: { warn() {}, error() {} },
    });
    const o1 = await call(limited, "register-options", { idToken: "idtoken-USER1", body: { stepUp: totp } });
    const o2 = await call(limited, "register-options", { idToken: "idtoken-USER1", body: { stepUp: totp } });
    const a = new SoftAuthenticator();
    const r1 = await call(limited, "register-verify", { idToken: "idtoken-USER1", body: { token: o1.body.token, response: a.register(o1.body.options) } });
    expect(r1.status).toBe(200);
    const r2 = await call(limited, "register-verify", { idToken: "idtoken-USER1", body: { token: o2.body.token, response: new SoftAuthenticator().register(o2.body.options) } });
    expect(r2.body.code).toBe("LIMIT_REACHED");
  });

  it("rate-limit document IDs cannot be computed without the server secret", async () => {
    await call(handle, "login-options", { ip: "192.0.2.1" });
    const ids = db.all("passkeyRateLimits").map((d) => d.id);
    const crypto = await import("node:crypto");
    const naive = crypto.createHash("sha256").update("login-options:192.0.2.1").digest("hex");
    expect(ids).not.toContain(naive);
    expect(ids.length).toBe(1);
  });

  it("uses Vercel's IP header rather than a client-supplied X-Forwarded-For", async () => {
    let last;
    for (let i = 0; i < 31; i++) {
      // attacker rotates the spoofable header, but Vercel's header stays the same
      const req = { method: "POST", query: { action: "login-verify" }, body: { token: "x", response: {} },
        headers: { "x-forwarded-for": `10.0.0.${i}`, "x-vercel-forwarded-for": "198.51.100.77" } };
      last = await new Promise((resolve) => handle(req, { setHeader() {}, status(c) { this.c = c; return this; }, json(b) { resolve({ status: this.c, body: b }); } }));
    }
    expect(last.status).toBe(429);
  });
});