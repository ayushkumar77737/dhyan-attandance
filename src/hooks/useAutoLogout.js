import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { signOut } from "firebase/auth";
import { auth } from "../firebase/firebase";

const TIMEOUT_MS = 10 * 60 * 1000; 

function useAutoLogout() {
    const navigate = useNavigate();
    const timerRef = useRef(null);

    const resetTimer = () => {
        if (timerRef.current) clearTimeout(timerRef.current);
        timerRef.current = setTimeout(async () => {
            await signOut(auth);
            navigate("/");
        }, TIMEOUT_MS);
    };

    useEffect(() => {
        const events = ["mousemove", "mousedown", "keydown", "touchstart", "scroll", "click"];
        events.forEach((e) => window.addEventListener(e, resetTimer));
        resetTimer(); // start timer on mount
        return () => {
            events.forEach((e) => window.removeEventListener(e, resetTimer));
            if (timerRef.current) clearTimeout(timerRef.current);
        };
    }, []);
}

export default useAutoLogout;