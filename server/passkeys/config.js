// server/passkeys/config.js
//
// WebAuthn relying-party configuration, read from environment variables.
//
//   WEBAUTHN_RP_ID          domain the passkeys are bound to, e.g. "dhyan.example.org"
//                           (no scheme, no port). Must equal the site's hostname or a
//                           parent domain of it.
//   WEBAUTHN_RP_NAME        name shown in the browser prompt (default "Dhyan Attendance")
//   WEBAUTHN_ORIGINS        comma-separated list of exact origins allowed to use passkeys,
//                           e.g. "https://dhyan.example.org"
//   PASSKEY_SIGNING_SECRET  long random string (>= 32 chars). Signs challenges and
//                           credential records so they cannot be forged from the browser.
//
// Local development (`vercel dev` / non-production) falls back to localhost when the
// RP variables are not set. Production never falls back — it refuses to run instead.

const DEV_ORIGINS = ["http://localhost:3000", "http://localhost:5173"];

// Vercel sets VERCEL_ENV to "production" | "preview" | "development".
// Outside Vercel, fall back to NODE_ENV.
const isProduction = (env) =>
  env.VERCEL_ENV ? env.VERCEL_ENV === "production" : env.NODE_ENV === "production";

export function loadPasskeyConfig(env = process.env) {
  const secret = env.PASSKEY_SIGNING_SECRET || "";
  const rpName = (env.WEBAUTHN_RP_NAME || "Dhyan Attendance").trim();

  let rpID = (env.WEBAUTHN_RP_ID || "").trim().toLowerCase();
  let origins = (env.WEBAUTHN_ORIGINS || "")
    .split(",")
    .map((o) => o.trim().replace(/\/+$/, ""))
    .filter(Boolean);

  const problems = [];

  if (!rpID && !origins.length && !isProduction(env)) {
    rpID = "localhost";
    origins = DEV_ORIGINS;
  }

  if (!rpID) problems.push("WEBAUTHN_RP_ID is not set");
  if (!origins.length) problems.push("WEBAUTHN_ORIGINS is not set");
  if (secret.length < 32) problems.push("PASSKEY_SIGNING_SECRET must be at least 32 characters");

  if (rpID && /[:/]/.test(rpID)) problems.push("WEBAUTHN_RP_ID must be a bare domain (no scheme or port)");

  for (const origin of origins) {
    let url;
    try {
      url = new URL(origin);
    } catch {
      problems.push(`Invalid origin in WEBAUTHN_ORIGINS: ${origin}`);
      continue;
    }
    const host = url.hostname.toLowerCase();
    if (rpID && host !== rpID && !host.endsWith(`.${rpID}`)) {
      problems.push(`Origin ${origin} is not on the RP ID domain ${rpID}`);
    }
    if (url.protocol !== "https:" && host !== "localhost") {
      problems.push(`Origin ${origin} must use https (only localhost may use http)`);
    }
  }

  return {
    ok: problems.length === 0,
    problems,
    rpID,
    rpName,
    origins,
    secret,
    challengeTtlMs: 5 * 60 * 1000,
    maxPasskeysPerUser: 10,
  };
}