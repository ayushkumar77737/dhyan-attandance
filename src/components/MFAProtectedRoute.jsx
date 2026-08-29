import { Navigate, useLocation } from "react-router-dom";
import { useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "../firebase/firebase";
import { getMfaStatus, isMfaVerified } from "../utils/mfa";

function MFAProtectedRoute({ children }) {
    const location = useLocation();

    const [user, setUser] = useState(undefined);
    const [mfaLoading, setMfaLoading] = useState(true);
    const [mfaEnabled, setMfaEnabled] = useState(false);
    const [mfaVerified, setMfaVerified] = useState(false);

    useEffect(() => {
        let mounted = true;

        const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
            if (!mounted) return;

            // --------------------------------------------------
            // 1. Firebase authentication
            // --------------------------------------------------
            setUser(currentUser);

            if (!currentUser) {
                setMfaLoading(false);
                setMfaEnabled(false);
                setMfaVerified(false);
                return;
            }

            // --------------------------------------------------
            // 2. CHECK MFA VERIFICATION FIRST
            //
            // If user has already entered the OTP during this
            // session, don't show "Checking Security" again.
            // --------------------------------------------------
            const alreadyVerified = isMfaVerified();

            if (alreadyVerified === true) {
                if (!mounted) return;

                setMfaVerified(true);
                setMfaEnabled(true);
                setMfaLoading(false);

                return;
            }

            // --------------------------------------------------
            // 3. MFA has NOT been verified yet
            //
            // Now check whether MFA is enabled.
            // --------------------------------------------------
            try {
                const result = await getMfaStatus();

                if (!mounted) return;

                const enabled =
                    result?.success === true &&
                    result?.mfaEnabled === true;

                setMfaEnabled(enabled);

                // If MFA is enabled, user still needs
                // to enter the authenticator code.
                if (enabled) {
                    setMfaVerified(false);
                } else {
                    setMfaVerified(false);
                }

            } catch (error) {
                console.error("MFA status check failed:", error);

                if (mounted) {
                    setMfaEnabled(false);
                    setMfaVerified(false);
                }

            } finally {
                if (mounted) {
                    setMfaLoading(false);
                }
            }
        });

        return () => {
            mounted = false;
            unsubscribe();
        };
    }, []);

    // --------------------------------------------------
    // Firebase authentication loading
    // --------------------------------------------------
    if (user === undefined) {
        return (
            <div style={loadingStyle}>
                <div style={spinnerStyle} />
                <h3>Checking Authentication</h3>
                <p>Please wait...</p>
            </div>
        );
    }

    // --------------------------------------------------
    // User is not logged in
    // --------------------------------------------------
    if (!user) {
        return <Navigate to="/login" replace />;
    }

    // --------------------------------------------------
    // MFA status loading
    // --------------------------------------------------
    if (mfaLoading) {
        return (
            <div style={loadingStyle}>
                <div style={spinnerStyle} />

                <h3>Checking Security</h3>

                <p>
                    Verifying multi-factor authentication...
                </p>

                <style>
                    {`
                        @keyframes mfaSpin {
                            from {
                                transform: rotate(0deg);
                            }

                            to {
                                transform: rotate(360deg);
                            }
                        }
                    `}
                </style>
            </div>
        );
    }

    // --------------------------------------------------
    // MFA NOT enabled
    // --------------------------------------------------
    if (!mfaEnabled) {
        return (
            <Navigate
                to="/mfa-setup"
                replace
                state={{
                    from: location.pathname,
                    message:
                        "Multi-factor authentication must be enabled before accessing the dashboard.",
                }}
            />
        );
    }

    // --------------------------------------------------
    // MFA enabled but NOT verified
    // --------------------------------------------------
    if (!mfaVerified) {
        return (
            <Navigate
                to="/mfa-verify"
                replace
                state={{
                    from: location.pathname,
                    message:
                        "Enter your authenticator code to continue.",
                }}
            />
        );
    }

    // --------------------------------------------------
    // MFA enabled + verified
    // --------------------------------------------------
    return children;
}


// ------------------------------------------------------
// Loading styles
// ------------------------------------------------------

const loadingStyle = {
    minHeight: "100vh",
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    alignItems: "center",
    background: "#050b1a",
    color: "#fff",
    gap: "12px",
};

const spinnerStyle = {
    width: "50px",
    height: "50px",
    border: "4px solid rgba(255,255,255,0.15)",
    borderTop: "4px solid #ffd700",
    borderRadius: "50%",
    animation: "mfaSpin 1s linear infinite",
};

export default MFAProtectedRoute;