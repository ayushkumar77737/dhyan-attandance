import { Navigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "../firebase/firebase";

function ProtectedRoute({ children }) {

    const [user, setUser] = useState(undefined);

    useEffect(() => {

        const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
            setUser(currentUser);
        });

        return () => unsubscribe();

    }, []);

    if (user === undefined) {
        return null; // waiting for auth check
    }

    if (!user) {
        return <Navigate to="/" />;
    }

    return children;
}

export default ProtectedRoute;