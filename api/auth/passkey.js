// api/auth/passkey.js
//
// One serverless function for every passkey operation, selected with ?action=…
// (kept as a single file so the project stays well under Vercel's per-plan
// function limit).
//
//   POST /api/auth/passkey?action=login-options      (public)
//   POST /api/auth/passkey?action=login-verify       (public)  -> Firebase custom token
//   POST /api/auth/passkey?action=list               (Bearer Firebase ID token)
//   POST /api/auth/passkey?action=reauth-options     (Bearer)
//   POST /api/auth/passkey?action=register-options   (Bearer + step-up)
//   POST /api/auth/passkey?action=register-verify    (Bearer)
//   POST /api/auth/passkey?action=rename             (Bearer)
//   POST /api/auth/passkey?action=remove             (Bearer + step-up)
//   POST /api/auth/passkey?action=admin-revoke       (Bearer, admin + step-up)
//
// The logic lives in server/passkeys/service.js.

import { verify } from "otplib";
import { adminAuth, adminDb } from "./firebaseAdmin.js";
import { createPasskeyService } from "../../server/passkeys/service.js";
import { loadPasskeyConfig } from "../../server/passkeys/config.js";

const verifyTotp = async (secret, token) => {
  const result = await verify({ secret, token });
  return result?.valid === true;
};

const handle = createPasskeyService({
  adminAuth,
  adminDb,
  verifyTotp,
  config: loadPasskeyConfig(),
});

export default function handler(req, res) {
  return handle(req, res);
}