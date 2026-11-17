// "Get the app" banner: Install button on Android/Chrome, Share > Add to Home Screen
// instructions on iPhone. Hidden once installed, or for 14 days after "Not now".
import { useEffect, useState } from "react";

const KEY = "installAppDismissedAt";

function dismissedRecently() {
  try {
    const t = Number(localStorage.getItem(KEY) || 0);
    return Date.now() - t < 14 * 86400000;
  } catch {
    return false;
  }
}

export default function InstallApp() {
  const [prompt, setPrompt] = useState(null); // Android install event
  const [ios, setIos] = useState(false);
  const [show, setShow] = useState(false);
  const [help, setHelp] = useState(false);

  useEffect(() => {
    const standalone = window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone;
    if (standalone || dismissedRecently()) return;

    const ua = navigator.userAgent;
    const isIos = /iphone|ipad|ipod/i.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
    const isMobile = isIos || /android/i.test(ua);
    if (isIos) { setIos(true); setShow(true); }

    const onPrompt = (e) => { e.preventDefault(); setPrompt(e); if (isMobile) setShow(true); };
    const onInstalled = () => setShow(false);
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  // Leave room under the page so the banner never hides buttons (e.g. Sign In)
  useEffect(() => {
    if (!show) return;
    const prev = document.body.style.paddingBottom;
    document.body.style.paddingBottom = help ? "220px" : "140px";
    return () => { document.body.style.paddingBottom = prev; };
  }, [show, help]);

  if (!show) return null;

  const close = () => {
    try { localStorage.setItem(KEY, String(Date.now())); } catch {}
    setShow(false);
  };

  const install = async () => {
    if (prompt) {
      prompt.prompt();
      const { outcome } = await prompt.userChoice.catch(() => ({}));
      setPrompt(null);
      if (outcome === "accepted") setShow(false);
    } else {
      setHelp(true);
    }
  };

  return (
    <div style={S.wrap} role="dialog" aria-label="Install the app">
      <div style={S.card}>
        <div style={S.row}>
          <div style={S.icon}>
            <img src="/api/app-icon?size=96" alt="" width="44" height="44" style={{ borderRadius: 10, display: "block" }} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={S.title}>Get the app</div>
            <div style={S.sub}>Open your dashboard from your home screen, full screen.</div>
          </div>
          <button onClick={close} style={S.x} aria-label="Not now">×</button>
        </div>

        {help && ios ? (
          <ol style={S.steps}>
            <li>Tap the <b>Share</b> button <span style={S.share}>⬆</span> at the bottom of Safari</li>
            <li>Scroll down and tap <b>Add to Home Screen</b></li>
            <li>Tap <b>Add</b></li>
          </ol>
        ) : help ? (
          <ol style={S.steps}>
            <li>Tap the browser menu <b>⋮</b> (top right)</li>
            <li>Tap <b>Install app</b> or <b>Add to Home screen</b></li>
          </ol>
        ) : (
          <div style={S.actions}>
            <button onClick={close} style={S.ghost}>Not now</button>
            <button onClick={install} style={S.btn}>{prompt ? "Install" : "How?"}</button>
          </div>
        )}
      </div>
    </div>
  );
}

const S = {
  wrap: { position: "fixed", left: 0, right: 0, bottom: 0, padding: "0 12px calc(12px + env(safe-area-inset-bottom))", zIndex: 1000, display: "flex", justifyContent: "center", pointerEvents: "none" },
  card: { pointerEvents: "auto", width: "100%", maxWidth: 420, background: "#fff", border: "1px solid #d4e8db", borderRadius: 16, boxShadow: "0 10px 30px rgba(13,31,20,.18)", padding: 14, fontFamily: "'Nunito',system-ui,sans-serif", color: "#0d1f14" },
  row: { display: "flex", alignItems: "center", gap: 12 },
  icon: { flexShrink: 0 },
  title: { fontWeight: 800, fontSize: "0.98rem" },
  sub: { fontSize: "0.8rem", color: "#6b7c72", lineHeight: 1.35 },
  x: { border: "none", background: "transparent", fontSize: 22, lineHeight: 1, color: "#6b7c72", cursor: "pointer", padding: 4, alignSelf: "flex-start" },
  actions: { display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 12 },
  btn: { background: "#1a7a4a", color: "#fff", border: "none", borderRadius: 10, padding: "9px 18px", fontWeight: 800, fontSize: "0.88rem", cursor: "pointer", fontFamily: "inherit" },
  ghost: { background: "#fff", color: "#145f39", border: "1px solid #d4e8db", borderRadius: 10, padding: "9px 14px", fontWeight: 700, fontSize: "0.85rem", cursor: "pointer", fontFamily: "inherit" },
  steps: { margin: "12px 0 2px", paddingLeft: 20, fontSize: "0.86rem", lineHeight: 1.7 },
  share: { display: "inline-block", border: "1px solid #c5d3cb", borderRadius: 4, padding: "0 4px", fontSize: "0.75rem" },
};
