import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { signOut } from "firebase/auth";
import { auth } from "../firebase/firebase";
import { logLogout } from "../utils/logActivity";

const TIMEOUT_MS = 10 * 60 * 1000;

function useAutoLogout() {
    const navigate = useNavigate();
    const timerRef = useRef(null);

    const resetTimer = () => {
        if (timerRef.current) clearTimeout(timerRef.current);
        timerRef.current = setTimeout(async () => {
            const userId = auth.currentUser?.uid;
            try {
                if (auth.currentUser) {
                    await logLogout(auth.currentUser.uid);
                }
            } catch (error) {
                console.error(error);
            }
            sessionStorage.removeItem("greetingShown");
            localStorage.removeItem("userId");
            localStorage.removeItem("adminAuth");
            localStorage.removeItem("userAuth");
            try {
                await signOut(auth);
            } catch (error) {
                console.error(error);
            }

            navigate("/");
        }, TIMEOUT_MS);
    };

    useEffect(() => {
        const events = ["mousemove", "mousedown", "keydown", "touchstart", "scroll", "click"];
        events.forEach((e) => window.addEventListener(e, resetTimer));
        resetTimer();
        return () => {
            events.forEach((e) => window.removeEventListener(e, resetTimer));
            if (timerRef.current) clearTimeout(timerRef.current);
        };
    }, []);
}

export default useAutoLogout;