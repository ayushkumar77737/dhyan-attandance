/**
 * Drop this component anywhere inside AdminDashboard's return JSX (e.g. right
 * after the opening <div className="admin-container">).
 *
 * It reads the react-router location state and shows a toast if
 * { accessDenied: true } was passed during navigation.
 */
import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";

export default function AccessDeniedToast() {
  const location = useLocation();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (location.state?.accessDenied) {
      setVisible(true);
      const t = setTimeout(() => setVisible(false), 4000);
      // Clear state so refresh doesn't re-show it
      window.history.replaceState({}, "");
      return () => clearTimeout(t);
    }
  }, [location.state]);

  if (!visible) return null;

  return (
    <div style={{
      position: "fixed", top: 20, left: "50%", transform: "translateX(-50%)",
      zIndex: 9999, display: "flex", alignItems: "center", gap: 10,
      padding: "12px 28px", borderRadius: 50,
      background: "linear-gradient(135deg,#1f0a0a,#2a0d0d)",
      border: "1px solid rgba(239,68,68,0.5)", color: "#fca5a5",
      fontSize: 14, fontWeight: 600, fontFamily: "Outfit, sans-serif",
      boxShadow: "0 10px 40px rgba(0,0,0,0.5)",
      animation: "fadeSlideDown 0.4s ease",
      whiteSpace: "nowrap",
    }}>
      🚫 You don't have access to that page.
    </div>
  );
}