// Test-only page: signs in as ?as=<USERID> (Firebase network is mocked by the
// e2e runner) and renders the real PasskeyManager component.
import React from "react";
import { createRoot } from "react-dom/client";
import { signInWithCustomToken, signOut } from "firebase/auth";
import "../../src/i18n/index.js";
import { auth } from "../../src/firebase/firebase";
import PasskeyManager from "../../src/components/PasskeyManager";

const params = new URLSearchParams(window.location.search);
const as = params.get("as");
const role = params.get("role") || "user";
const theme = params.get("theme") || "dark";

window.__signOut = () => signOut(auth);

(async () => {
  const res = await fetch(`/__test/custom-token?userId=${encodeURIComponent(as)}`);
  const { customToken } = await res.json();
  await signInWithCustomToken(auth, customToken);
  createRoot(document.getElementById("root")).render(
    <div className="mprf__page" data-theme={theme} style={{ padding: 24 }}>
      <PasskeyManager theme={theme} role={role} />
    </div>
  );
})();