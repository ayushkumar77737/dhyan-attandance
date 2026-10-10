import React, { useEffect, useRef } from "react";

/* Google's official "Sign in with Google" button (Google Identity Services).
   It only hands us a signed credential; the server decides who may log in
   (api/auth/google-login.js). */

const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;
const GIS_SRC = "https://accounts.google.com/gsi/client";

let gisPromise = null;
const loadGis = () => {
    if (window.google?.accounts?.id) return Promise.resolve();
    if (gisPromise) return gisPromise;

    gisPromise = new Promise((resolve, reject) => {
        const script = document.createElement("script");
        script.src = GIS_SRC;
        script.async = true;
        script.defer = true;
        script.onload = () => resolve();
        script.onerror = () => {
            gisPromise = null; // allow a retry
            reject(new Error("Could not load Google sign-in"));
        };
        document.head.appendChild(script);
    });

    return gisPromise;
};

function GoogleSignInButton({ onCredential, disabled = false }) {
    const holderRef = useRef(null);
    const callbackRef = useRef(onCredential);

    // always call the latest handler (it reads the "Remember me" state)
    useEffect(() => {
        callbackRef.current = onCredential;
    }, [onCredential]);

    useEffect(() => {
        if (!CLIENT_ID) return undefined;
        let cancelled = false;

        loadGis()
            .then(() => {
                if (cancelled || !holderRef.current) return;

                window.google.accounts.id.initialize({
                    client_id: CLIENT_ID,
                    use_fedcm_for_button: true,   // Chrome's built-in sign-in: no popup, no COOP warning
                    button_auto_select: false,
                    callback: (response) => {
                        if (response?.credential) callbackRef.current?.(response.credential);
                    },
                });

                const width = Math.min(400, holderRef.current.offsetWidth || 320);
                holderRef.current.innerHTML = "";
                window.google.accounts.id.renderButton(holderRef.current, {
                    type: "standard",
                    theme: "outline",
                    size: "large",
                    shape: "pill",
                    text: "signin_with",
                    logo_alignment: "left",
                    width,
                });
            })
            .catch((err) => console.warn(err.message));

        return () => {
            cancelled = true;
        };
    }, []);

    // No client ID configured -> show nothing instead of a broken button.
    if (!CLIENT_ID) return null;

    return (
        <div
            className={`login-google${disabled ? " login-google--disabled" : ""}`}
            aria-disabled={disabled}
        >
            <div ref={holderRef} className="login-google-holder" />
        </div>
    );
}

export default GoogleSignInButton;