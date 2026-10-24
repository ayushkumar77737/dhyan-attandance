// End-to-end passkey test in a real Chromium with its built-in virtual
// WebAuthn authenticator (CDP WebAuthn domain).
//
// What is real:  the Login page, PasskeyManager UI, src/utils/passkey.js,
//                @simplewebauthn/browser + server, server/passkeys/service.js,
//                the browser's WebAuthn implementation and its signatures.
// What is faked: Firestore + Firebase Admin (in-memory), and the Firebase Auth
//                REST calls the browser makes for signInWithCustomToken.
//
// Run: node tests/e2e/passkey.e2e.mjs   (needs Chromium + Playwright installed)

import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
import { createServer } from "vite";
import react from "@vitejs/plugin-react";
import { createPasskeyService } from "../../server/passkeys/service.js";
import { loadPasskeyConfig } from "../../server/passkeys/config.js";
import { createFakeDb, createFakeAuth } from "../passkeys/helpers.js";

const require = createRequire(import.meta.url);
let playwright;
try { playwright = require("playwright"); } catch { playwright = (await import("playwright")).default; }

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const PORT = 5179;
const ORIGIN = `http://localhost:${PORT}`;
const SHOTS = process.env.E2E_SCREENSHOTS || path.join(root, "tests/e2e/screenshots");
fs.mkdirSync(SHOTS, { recursive: true });

/* ---------------- fake backend state ---------------- */
const db = createFakeDb();
const fakeAuth = createFakeAuth();
const users = [
  { id: "USER1", uid: "uid-user1", role: "user", name: "ANITA SHARMA", email: "anita@example.com" },
  { id: "ADMIN2", uid: "uid-admin2", role: "admin", name: "RAVI KUMAR", email: "ravi@example.com" },
];
for (const u of users) {
  db.put("users", u.id, { ...u, mfaEnabled: true, mfaSecret: "unused-in-test" });
  fakeAuth.users.set(u.uid, { disabled: false });
}
// ID tokens minted by the mocked identitytoolkit are unsigned JWTs; decode them.
fakeAuth.verifyIdToken = async (token) => {
  const payload = JSON.parse(Buffer.from(String(token).split(".")[1] || "", "base64url").toString() || "{}");
  if (!payload.user_id) throw new Error("bad token");
  return { uid: payload.user_id };
};

const handle = createPasskeyService({
  adminAuth: fakeAuth,
  adminDb: db,
  verifyTotp: async (_s, code) => code === "123456",
  config: loadPasskeyConfig({
    PASSKEY_SIGNING_SECRET: "e2e-secret-".padEnd(48, "z"),
    WEBAUTHN_RP_ID: "localhost",
    WEBAUTHN_ORIGINS: ORIGIN,
    NODE_ENV: "test",
  }),
  logger: { warn() {}, error: console.error },
});

/* ---------------- vite dev server with /api mounted ---------------- */
const apiPlugin = {
  name: "passkey-api",
  configureServer(server) {
    server.middlewares.use(async (req, res, next) => {
      const url = new URL(req.url, ORIGIN);
      if (url.pathname === "/__test/custom-token") {
        const u = users.find((x) => x.id === url.searchParams.get("userId"));
        res.setHeader("Content-Type", "application/json");
        res.end(JSON.stringify({ customToken: `custom-token-for:${u.uid}` }));
        return;
      }
      if (url.pathname !== "/api/auth/passkey") return next();
      let raw = "";
      for await (const chunk of req) raw += chunk;
      const vreq = {
        method: req.method,
        headers: req.headers,
        query: Object.fromEntries(url.searchParams),
        body: raw ? JSON.parse(raw) : {},
        socket: req.socket,
      };
      const vres = {
        setHeader: (k, v) => res.setHeader(k, v),
        status(code) { res.statusCode = code; return this; },
        json(obj) { res.setHeader("Content-Type", "application/json"); res.end(JSON.stringify(obj)); return this; },
      };
      await handle(vreq, vres);
    });
  },
};

const server = await createServer({
  root,
  configFile: false,
  logLevel: "error",
  plugins: [react(), apiPlugin],
  resolve: { alias: [{ find: /^\.\.\/utils\/logActivity$/, replacement: path.join(root, "tests/e2e/logActivity.stub.js") }] },
  server: { port: PORT, strictPort: true, hmr: false },
  optimizeDeps: { entries: ["index.html", "tests/e2e/harness.html"] },
});
await server.listen();

/* ---------------- Firebase Auth REST mock ---------------- */
const jwt = (uid) => {
  const enc = (o) => Buffer.from(JSON.stringify(o)).toString("base64url");
  const now = Math.floor(Date.now() / 1000);
  return `${enc({ alg: "none", typ: "JWT" })}.${enc({ user_id: uid, sub: uid, iat: now, exp: now + 3600, auth_time: now, firebase: { sign_in_provider: "custom" } })}.sig`;
};

async function mockFirebase(context) {
  await context.route("https://identitytoolkit.googleapis.com/**", async (route) => {
    const req = route.request();
    const body = req.postDataJSON() || {};
    if (req.url().includes("accounts:signInWithCustomToken")) {
      const uid = String(body.token).replace("custom-token-for:", "");
      return route.fulfill({ json: { kind: "identitytoolkit#VerifyCustomTokenResponse", idToken: jwt(uid), refreshToken: `refresh-${uid}`, expiresIn: "3600", isNewUser: false } });
    }
    if (req.url().includes("accounts:lookup")) {
      const uid = JSON.parse(Buffer.from(body.idToken.split(".")[1], "base64url").toString()).user_id;
      const u = users.find((x) => x.uid === uid);
      return route.fulfill({ json: { users: [{ localId: uid, email: u?.email, emailVerified: true, providerUserInfo: [], createdAt: "1700000000000", lastLoginAt: "1700000000000" }] } });
    }
    return route.fulfill({ status: 400, json: { error: { message: "UNMOCKED" } } });
  });
  // Nothing else may leave the machine (Firestore, Google sign-in script, fonts…)
  await context.route(/^https:\/\/(?!identitytoolkit)/, (route) => route.abort());
}

async function addAuthenticator(page) {
  const cdp = await page.context().newCDPSession(page);
  await cdp.send("WebAuthn.enable");
  const { authenticatorId } = await cdp.send("WebAuthn.addVirtualAuthenticator", {
    options: {
      protocol: "ctap2",
      transport: "internal",
      hasResidentKey: true,
      hasUserVerification: true,
      isUserVerified: true,
      automaticPresenceSimulation: true,
    },
  });
  return { cdp, authenticatorId };
}

/* ---------------- tiny test runner ---------------- */
const results = [];
async function step(name, fn) {
  try {
    await fn();
    results.push({ name, ok: true });
    console.log(`  ✓ ${name}`);
  } catch (err) {
    results.push({ name, ok: false, err });
    console.log(`  ✗ ${name}\n      ${String(err?.message || err).split("\n").slice(0, 6).join("\n      ")}`);
  }
}
const settle = (page) => page.waitForTimeout(1200); // let entrance animations finish before screenshots
const expect = (cond, msg) => { if (!cond) throw new Error(msg); };

const browser = await playwright.chromium.launch();

async function freshPage({ viewport = { width: 1280, height: 900 }, init } = {}) {
  const context = await browser.newContext({ viewport, locale: "en-US" });
  await mockFirebase(context);
  if (init) await context.addInitScript(init);
  await context.addInitScript(() => localStorage.setItem("appLanguage", "en"));
  const page = await context.newPage();
  page.on("pageerror", (e) => console.log("    [pageerror]", e.message));
  return page;
}

async function registerVia(page, userId, label, role = "user") {
  await page.goto(`${ORIGIN}/tests/e2e/harness.html?as=${userId}&role=${role}`);
  await page.getByRole("button", { name: "Set Up Passkey" }).click();
  await page.getByLabel("Passkey name").fill(label);
  await page.getByLabel("Authenticator code").fill("123456");
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByRole("button", { name: "Create passkey" }).click();
  await page.getByText("Passkey Registered Successfully").waitFor({ timeout: 10000 });
  await page.getByText(label, { exact: true }).waitFor();
}

async function loginWithPasskey(page) {
  await page.evaluate(() => window.__signOut?.());
  await page.goto(`${ORIGIN}/login`);
  await page.evaluate(() => { localStorage.removeItem("userId"); localStorage.removeItem("userAuth"); localStorage.removeItem("adminAuth"); sessionStorage.clear(); });
  await page.getByRole("button", { name: "Login with Passkey" }).click();
}

console.log("\nPasskey e2e (Chromium virtual authenticator)\n");

/* ===== employee ===== */
const emp = await freshPage();
await addAuthenticator(emp);

await step("employee registers a passkey from Profile → Security", async () => {
  await registerVia(emp, "USER1", "Test laptop");
  await emp.screenshot({ path: path.join(SHOTS, "manager-dark.png"), fullPage: true });
  const recs = db.all("passkeyCredentials");
  expect(recs.length === 1 && recs[0].userId === "USER1", "credential not stored for USER1");
});

await step("employee renames the passkey", async () => {
  await emp.getByRole("button", { name: "Rename: Test laptop" }).click();
  await emp.getByLabel("Passkey name").fill("Work laptop");
  await emp.getByRole("button", { name: "Save" }).click();
  await emp.getByText("Passkey renamed.").waitFor();
  expect(db.all("passkeyCredentials")[0].label === "Work laptop", "label not saved");
});

await step("login page still shows ID/password form and the passkey option", async () => {
  await emp.evaluate(() => window.__signOut?.());
  await emp.goto(`${ORIGIN}/login`);
  await emp.locator('input[autocomplete="username"]').waitFor();
  await emp.locator('input[autocomplete="current-password"]').waitFor();
  await emp.getByRole("button", { name: "Login with Passkey" }).waitFor();
  await settle(emp);
  await emp.screenshot({ path: path.join(SHOTS, "login-desktop.png") });
});

await step("employee signs in with the passkey and lands on the Employee Dashboard", async () => {
  await loginWithPasskey(emp);
  await emp.waitForURL("**/user-dashboard", { timeout: 15000 });
  const state = await emp.evaluate(() => ({
    userId: localStorage.getItem("userId"),
    userAuth: localStorage.getItem("userAuth"),
    adminAuth: localStorage.getItem("adminAuth"),
    mfa: sessionStorage.getItem("mfaVerified"),
  }));
  expect(state.userId === "USER1" && state.userAuth === "true" && !state.adminAuth && state.mfa === "true", JSON.stringify(state));
  expect(db.all("passkeyCredentials")[0].lastUsedAt, "lastUsedAt not recorded");
});

await step("disabled employee is denied even with a valid passkey", async () => {
  db.put("users", "USER1", { ...db.read("users", "USER1"), disabled: true });
  await loginWithPasskey(emp);
  await emp.getByText("Your account has been disabled. Contact admin.").waitFor({ timeout: 10000 });
  expect(emp.url().endsWith("/login"), "navigated away");
  const signedIn = await emp.evaluate(() => localStorage.getItem("userAuth"));
  expect(!signedIn, "session flags were set");
  db.put("users", "USER1", { ...db.read("users", "USER1"), disabled: false });
});

await step("'Back to ID & password' returns to the normal form", async () => {
  await emp.getByRole("button", { name: /Back to ID & password/ }).click();
  await emp.locator('input[autocomplete="username"]').waitFor();
});

await step("employee removes the passkey (re-auth with code); it can no longer sign in", async () => {
  await emp.goto(`${ORIGIN}/tests/e2e/harness.html?as=USER1&theme=light`);
  await emp.getByRole("button", { name: "Remove: Work laptop" }).click();
  await emp.getByText("This is your last passkey.", { exact: false }).waitFor();
  await emp.screenshot({ path: path.join(SHOTS, "remove-modal-light.png") });
  await emp.getByLabel("Authenticator code").fill("123456");
  await emp.getByRole("button", { name: "Remove passkey" }).click();
  await emp.getByText("Passkey removed.", { exact: false }).waitFor();
  expect(db.all("passkeyCredentials")[0].status === "revoked", "not revoked");

  await loginWithPasskey(emp);
  await emp.getByText("This passkey is not registered with the portal", { exact: false }).waitFor({ timeout: 10000 });
  await emp.getByText("No passkey on this device yet?", { exact: false }).waitFor();
});

/* ===== admin ===== */
const adm = await freshPage();
await addAuthenticator(adm);

await step("admin registers a passkey from Admin → Security", async () => {
  await registerVia(adm, "ADMIN2", "Admin phone", "admin");
  const rec = db.all("passkeyCredentials").find((r) => r.userId === "ADMIN2");
  expect(rec?.roleAtRegistration === "admin", "admin credential missing");
});

await step("admin adds a second passkey using the first as re-auth", async () => {
  // second virtual authenticator = a second device
  await adm.getByRole("button", { name: "Add another passkey" }).click();
  await adm.getByLabel("Passkey name").fill("Admin laptop");
  // The first passkey lives on the single authenticator; excludeCredentials would block
  // creating another on the SAME device, so the UI should say so.
  await adm.getByRole("button", { name: "Confirm with an existing passkey instead" }).click();
  await adm.getByRole("button", { name: "Create passkey" }).click();
  await adm.getByText("This device already has a passkey for your account.").waitFor({ timeout: 10000 });
});

await step("admin signs in with the passkey and lands on the Admin Dashboard", async () => {
  await adm.keyboard.press("Escape");
  await loginWithPasskey(adm);
  await adm.waitForURL("**/admin-dashboard", { timeout: 15000 });
  const state = await adm.evaluate(() => ({ userId: localStorage.getItem("userId"), adminAuth: localStorage.getItem("adminAuth") }));
  expect(state.userId === "ADMIN2" && state.adminAuth === "true", JSON.stringify(state));
});

await step("admin demoted in the database signs in as an employee, not admin", async () => {
  db.put("users", "ADMIN2", { ...db.read("users", "ADMIN2"), role: "user" });
  await loginWithPasskey(adm);
  await adm.waitForURL("**/user-dashboard", { timeout: 15000 });
  db.put("users", "ADMIN2", { ...db.read("users", "ADMIN2"), role: "admin" });
});

/* ===== edge cases ===== */
await step("no passkey on this device: prompt fails cleanly with guidance", async () => {
  const p = await freshPage();
  await addAuthenticator(p); // empty authenticator
  await p.goto(`${ORIGIN}/login`);
  await p.getByRole("button", { name: "Login with Passkey" }).click();
  await p.getByText("The passkey prompt was closed or timed out.").waitFor({ timeout: 20000 });
  await p.getByText("No passkey on this device yet?", { exact: false }).waitFor();
  await p.getByRole("button", { name: "Try again" }).waitFor();
  await settle(p);
  await p.screenshot({ path: path.join(SHOTS, "login-panel-error.png") });
  await p.context().close();
});

await step("unsupported browser shows a compatibility message", async () => {
  const p = await freshPage({ init: () => { delete window.PublicKeyCredential; } });
  await p.goto(`${ORIGIN}/login`);
  await p.getByRole("button", { name: "Login with Passkey" }).click();
  await p.getByText("This browser or device doesn't support passkeys.", { exact: false }).waitFor();
  await p.getByRole("button", { name: /Back to ID & password/ }).waitFor();
  await p.context().close();
});

await step("mobile layout (390px): login option and passkey manager fit without horizontal scroll", async () => {
  const p = await freshPage({ viewport: { width: 390, height: 844 } });
  await addAuthenticator(p);
  await p.goto(`${ORIGIN}/login`);
  await p.getByRole("button", { name: "Login with Passkey" }).waitFor();
  await settle(p);
  await p.screenshot({ path: path.join(SHOTS, "login-mobile.png"), fullPage: true });
  const overflowLogin = await p.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  await p.goto(`${ORIGIN}/tests/e2e/harness.html?as=USER1`);
  await p.getByRole("button", { name: "Set Up Passkey" }).waitFor();
  const overflowMgr = await p.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  await p.screenshot({ path: path.join(SHOTS, "manager-mobile.png"), fullPage: true });
  expect(overflowLogin <= 1 && overflowMgr <= 1, `overflow login=${overflowLogin} manager=${overflowMgr}`);
  await p.context().close();
});

await browser.close();
await server.close();

const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} e2e checks passed. Screenshots: ${SHOTS}\n`);
process.exit(failed.length ? 1 : 0);