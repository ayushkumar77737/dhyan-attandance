import { Navigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "../firebase/firebase";
import { useTranslation } from "react-i18next";

function ProtectedRoute({ children }) {
    const { t } = useTranslation();

    const [user, setUser] = useState(undefined);

    useEffect(() => {

        const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
            setUser(currentUser);
        });

        return () => unsubscribe();

    }, []);

    if (user === undefined) {
        return (
            <div
                style={{
                    minHeight: "100vh",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "center",
                    alignItems: "center",
                    background: "#050b1a",
                    color: "#fff",
                    gap: "15px"
                }}
            >
                <div
                    style={{
                        width: "60px",
                        height: "60px",
                        border: "4px solid rgba(255,255,255,0.15)",
                        borderTop: "4px solid #ffd700",
                        borderRadius: "50%",
                        animation: "spin 1s linear infinite"
                    }}
                />
                <h3>{t("appTitle")}</h3>
                <p>{t("loading")}</p>

                <style>
                    {`
                    @keyframes spin {
                        from { transform: rotate(0deg); }
                        to { transform: rotate(360deg); }
                    }
                `}
                </style>
            </div>
        );
    }

    if (!user) {
        return <Navigate to="/login" replace />;
    }
    if (!auth.currentUser && user) {
        return <Navigate to="/login" replace />;
    }

    return children;
}

export default ProtectedRoute;