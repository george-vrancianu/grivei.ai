// PROTOTYPE, throwaway. Floating variant switcher; dev builds only.
import { useEffect } from "react";
export default function Switcher({ variants, current, onChange }) {
  const keys = Object.keys(variants);
  const i = keys.indexOf(current);
  const go = (d) => onChange(keys[(i + d + keys.length) % keys.length]);
  useEffect(() => {
    const h = (e) => {
      const t = e.target;
      if (t.closest?.("input,textarea,[contenteditable]")) return;
      if (e.key === "ArrowLeft") go(-1);
      if (e.key === "ArrowRight") go(1);
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  });
  if (!import.meta.env.DEV) return null;
  const b = { background: "none", border: 0, color: "#fff", fontSize: 18, cursor: "pointer", padding: "0 10px" };
  return (
    <div style={{ position: "fixed", bottom: 16, left: "50%", transform: "translateX(-50%)", zIndex: 9999,
      background: "#d6005c", color: "#fff", borderRadius: 999, padding: "6px 8px", display: "flex", alignItems: "center",
      boxShadow: "0 4px 18px rgba(0,0,0,.35)", font: "600 13px system-ui" }}>
      <button style={b} onClick={() => go(-1)}>←</button>
      <span>PROTOTYPE · {current} ({variants[current]})</span>
      <button style={b} onClick={() => go(1)}>→</button>
    </div>
  );
}
