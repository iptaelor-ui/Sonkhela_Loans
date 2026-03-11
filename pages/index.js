import { useState, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://zxxdvxzgqynkuveipxqc.supabase.co";
const SUPABASE_KEY = "sb_publishable_h8ykxzJdMDPnse7cPB_O1Q_SxEk8jh8";
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// ── Helpers ──────────────────────────────────────────────────────────────────
function fmt(v) {
  return "K " + Number(v).toLocaleString("en", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
function fmtDate(d) {
  if (!d) return "—";
  return new Date(d + "T00:00:00").toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric" });
}
function genId() {
  return `SSL-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 900) + 100)}`;
}
function calcLoan(amount, rate, schedule) {
  const total = Number(amount) + (Number(amount) * Number(rate)) / 100;
  const periods = schedule === "weekly" ? 12 : schedule === "monthly" ? 3 : 1;
  return { total, installment: total / periods };
}
function isOverdue(loan) {
  return loan.status === "active" && new Date(loan.due_date) < new Date();
}

// ── Styles ───────────────────────────────────────────────────────────────────
const STYLES = `
@import url('https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800;900&family=Lora:wght@600;700&display=swap');
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
:root{
  --green:#1a7a4a;--green-dark:#145f39;--green-light:#e8f5ee;
  --green-mid:#2da05f;--accent:#f0faf4;--white:#ffffff;
  --ink:#0d1f14;--muted:#6b7c72;--border:#d4e8db;--bg:#f4fbf6;
  --red:#c0392b;--red-light:#fdf0ee;--amber:#d97706;
  --shadow-sm:0 1px 6px rgba(26,122,74,0.08);
  --shadow:0 4px 20px rgba(26,122,74,0.12);
  --shadow-lg:0 12px 48px rgba(26,122,74,0.16);
  --radius:12px;
}
body{font-family:'Nunito',sans-serif;background:var(--bg);color:var(--ink);min-height:100vh;}
::-webkit-scrollbar{width:6px;}::-webkit-scrollbar-track{background:var(--green-light);}::-webkit-scrollbar-thumb{background:var(--green);border-radius:3px;}
.shell{display:flex;min-height:100vh;}
.sidebar{width:240px;flex-shrink:0;background:var(--green-dark);display:flex;flex-direction:column;position:sticky;top:0;height:100vh;}
.sidebar-brand{padding:28px 20px 20px;border-bottom:1px solid rgba(255,255,255,0.08);}
.brand-logo{width:44px;height:44px;border-radius:50%;background:rgba(255,255,255,0.15);display:flex;align-items:center;justify-content:center;font-family:'Lora',serif;font-size:18px;font-weight:700;color:#fff;margin-bottom:10px;overflow:hidden;}
.brand-logo img{width:100%;height:100%;object-fit:cover;}
.brand-name{font-family:'Lora',serif;color:#fff;font-size:1rem;font-weight:700;line-height:1.3;}
.brand-tag{font-size:0.72rem;color:rgba(255,255,255,0.5);margin-top:2px;}
.sidebar-nav{flex:1;padding:16px 12px;display:flex;flex-direction:column;gap:4px;}
.nav-item{display:flex;align-items:center;gap:10px;padding:11px 14px;border-radius:10px;border:none;cursor:pointer;font-family:'Nunito',sans-serif;font-size:0.875rem;font-weight:700;color:rgba(255,255,255,0.6);background:transparent;transition:all 0.18s;text-align:left;width:100%;}
.nav-item:hover{color:#fff;background:rgba(255,255,255,0.08);}
.nav-item.active{color:var(--green-dark);background:#fff;}
.sidebar-footer{padding:16px 12px;border-top:1px solid rgba(255,255,255,0.08);}
.logout-btn{width:100%;padding:10px 14px;border-radius:10px;border:1px solid rgba(255,255,255,0.15);background:transparent;color:rgba(255,255,255,0.5);font-family:'Nunito',sans-serif;font-size:0.8rem;font-weight:700;cursor:pointer;transition:all 0.18s;display:flex;align-items:center;gap:8px;}
.logout-btn:hover{background:rgba(255,255,255,0.08);color:#fff;}
.main{flex:1;overflow-y:auto;}
.topbar{background:var(--white);border-bottom:1px solid var(--border);padding:0 2rem;height:60px;display:flex;align-items:center;justify-content:space-between;position:sticky;top:0;z-index:50;}
.topbar-title{font-family:'Lora',serif;font-size:1.2rem;font-weight:700;}
.topbar-date{font-size:0.8rem;color:var(--muted);}
.page{padding:2rem;max-width:1060px;}
.stats{display:grid;grid-template-columns:repeat(4,1fr);gap:1rem;margin-bottom:2rem;}
.stat-card{background:var(--white);border-radius:var(--radius);border:1px solid var(--border);padding:1.25rem 1.5rem;box-shadow:var(--shadow-sm);border-top:3px solid var(--green);transition:transform 0.2s,box-shadow 0.2s;}
.stat-card:hover{transform:translateY(-2px);box-shadow:var(--shadow);}
.stat-card.amber{border-top-color:var(--amber);}
.stat-card.gray{border-top-color:#888;}
.stat-label{font-size:0.72rem;font-weight:800;color:var(--muted);text-transform:uppercase;letter-spacing:0.06em;margin-bottom:8px;}
.stat-value{font-family:'Lora',serif;font-size:1.7rem;font-weight:700;color:var(--ink);line-height:1;}
.stat-sub{font-size:0.75rem;color:var(--muted);margin-top:4px;}
.card{background:var(--white);border-radius:var(--radius);border:1px solid var(--border);box-shadow:var(--shadow-sm);margin-bottom:1.5rem;}
.card-head{padding:1.25rem 1.5rem;border-bottom:1px solid var(--border);display:flex;align-items:center;justify-content:space-between;}
.card-title{font-family:'Lora',serif;font-size:1rem;font-weight:700;}
.card-body{padding:1.5rem;}
.tbl-wrap{overflow-x:auto;}
table{width:100%;border-collapse:collapse;font-size:0.875rem;}
th{padding:10px 14px;text-align:left;background:var(--accent);color:var(--muted);font-size:0.7rem;font-weight:800;text-transform:uppercase;letter-spacing:0.06em;border-bottom:2px solid var(--border);}
td{padding:13px 14px;border-bottom:1px solid var(--border);vertical-align:middle;}
tr:last-child td{border-bottom:none;}
tr:hover td{background:var(--accent);}
.badge{display:inline-block;padding:3px 10px;border-radius:20px;font-size:0.7rem;font-weight:800;text-transform:uppercase;letter-spacing:0.04em;}
.badge-active{background:#dcf5e7;color:var(--green-dark);}
.badge-overdue{background:var(--red-light);color:var(--red);}
.badge-settled{background:#e8eaed;color:#555;}
.btn{display:inline-flex;align-items:center;gap:6px;padding:10px 20px;border-radius:9px;border:none;font-family:'Nunito',sans-serif;font-weight:800;font-size:0.875rem;cursor:pointer;transition:all 0.18s;}
.btn-green{background:var(--green);color:#fff;}
.btn-green:hover{background:var(--green-mid);transform:translateY(-1px);box-shadow:0 4px 14px rgba(26,122,74,0.3);}
.btn-outline{background:transparent;color:var(--green);border:2px solid var(--green);}
.btn-outline:hover{background:var(--green-light);}
.btn-ghost{background:transparent;color:var(--muted);border:1px solid var(--border);}
.btn-ghost:hover{background:var(--bg);color:var(--ink);}
.btn-red{background:var(--red);color:#fff;}
.btn-red:hover{background:#a93226;}
.btn-sm{padding:6px 13px;font-size:0.78rem;}
.btn-xs{padding:4px 10px;font-size:0.72rem;}
.form-grid{display:grid;grid-template-columns:1fr 1fr;gap:1rem;}
.form-group{display:flex;flex-direction:column;gap:5px;}
.form-group.full{grid-column:1/-1;}
label{font-size:0.72rem;font-weight:800;color:var(--muted);text-transform:uppercase;letter-spacing:0.06em;}
input,select,textarea{padding:10px 14px;border:1.5px solid var(--border);border-radius:9px;font-family:'Nunito',sans-serif;font-size:0.9rem;color:var(--ink);background:var(--white);outline:none;transition:border-color 0.18s,box-shadow 0.18s;width:100%;}
input:focus,select:focus,textarea:focus{border-color:var(--green);box-shadow:0 0 0 3px rgba(26,122,74,0.1);}
textarea{resize:vertical;min-height:80px;}
.modal-backdrop{position:fixed;inset:0;z-index:200;background:rgba(13,31,20,0.55);backdrop-filter:blur(4px);display:flex;align-items:center;justify-content:center;padding:1rem;}
.modal{background:var(--white);border-radius:16px;width:100%;max-width:700px;max-height:92vh;overflow-y:auto;box-shadow:var(--shadow-lg);}
.modal-head{padding:1.5rem 1.75rem;border-bottom:1px solid var(--border);display:flex;align-items:center;justify-content:space-between;position:sticky;top:0;background:var(--white);z-index:1;}
.modal-title{font-family:'Lora',serif;font-size:1.25rem;font-weight:700;}
.modal-body{padding:1.75rem;}
.modal-foot{padding:1.25rem 1.75rem;border-top:1px solid var(--border);display:flex;gap:0.75rem;justify-content:flex-end;position:sticky;bottom:0;background:var(--white);}
.close-btn{width:32px;height:32px;border-radius:50%;border:none;background:var(--bg);cursor:pointer;font-size:1rem;display:flex;align-items:center;justify-content:center;color:var(--muted);}
.close-btn:hover{background:var(--border);}
.login-shell{min-height:100vh;background:var(--green-dark);display:flex;align-items:center;justify-content:center;padding:1rem;}
.login-box{background:var(--white);border-radius:20px;padding:2.5rem;width:100%;max-width:400px;box-shadow:var(--shadow-lg);text-align:center;}
.login-logo{width:72px;height:72px;border-radius:50%;background:var(--green);margin:0 auto 1.25rem;display:flex;align-items:center;justify-content:center;font-family:'Lora',serif;font-size:24px;font-weight:700;color:#fff;box-shadow:0 8px 24px rgba(26,122,74,0.35);overflow:hidden;}
.login-logo img{width:100%;height:100%;object-fit:cover;}
.login-title{font-family:'Lora',serif;font-size:1.6rem;font-weight:700;margin-bottom:4px;}
.login-sub{color:var(--muted);font-size:0.875rem;margin-bottom:2rem;}
.pin-dots{display:flex;gap:12px;justify-content:center;margin-bottom:1.5rem;}
.pin-dot{width:14px;height:14px;border-radius:50%;border:2px solid var(--border);transition:all 0.18s;}
.pin-dot.filled{background:var(--green);border-color:var(--green);}
.pin-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-bottom:1rem;}
.pin-key{padding:14px;border-radius:10px;border:1.5px solid var(--border);background:var(--bg);font-family:'Nunito',sans-serif;font-size:1.1rem;font-weight:800;color:var(--ink);cursor:pointer;transition:all 0.15s;}
.pin-key:hover{background:var(--green-light);border-color:var(--green);color:var(--green-dark);}
.pin-key:active{transform:scale(0.95);}
.pin-key.zero{grid-column:2;}
.pin-key.del{background:var(--red-light);border-color:#f5c6c0;color:var(--red);}
.pin-error{color:var(--red);font-size:0.85rem;font-weight:700;margin-bottom:0.75rem;}
.loading-screen{min-height:100vh;background:var(--green-dark);display:flex;align-items:center;justify-content:center;flex-direction:column;gap:1rem;}
.loading-spinner{width:48px;height:48px;border:4px solid rgba(255,255,255,0.2);border-top-color:#fff;border-radius:50%;animation:spin 0.8s linear infinite;}
@keyframes spin{to{transform:rotate(360deg);}}
.loading-text{color:rgba(255,255,255,0.7);font-size:0.9rem;font-weight:700;}
.agr-page{min-height:100vh;background:#e8f5ee;padding:2rem 1rem;display:flex;flex-direction:column;align-items:center;}
.agr-doc{width:100%;max-width:740px;background:var(--white);border-radius:4px;overflow:hidden;box-shadow:0 4px 40px rgba(26,122,74,0.15);}
.agr-header{background:var(--green-dark);padding:2.5rem 2.75rem;display:flex;align-items:center;gap:1.5rem;flex-wrap:wrap;}
.agr-logo{width:68px;height:68px;border-radius:50%;background:rgba(255,255,255,0.15);display:flex;align-items:center;justify-content:center;font-family:'Lora',serif;font-size:24px;font-weight:700;color:#fff;flex-shrink:0;overflow:hidden;border:3px solid rgba(255,255,255,0.2);}
.agr-logo img{width:100%;height:100%;object-fit:cover;}
.agr-biz-name{font-family:'Lora',serif;color:#fff;font-size:1.7rem;font-weight:700;line-height:1.2;}
.agr-biz-tag{color:rgba(255,255,255,0.6);font-size:0.85rem;margin-top:4px;}
.agr-biz-contact{color:rgba(255,255,255,0.4);font-size:0.78rem;margin-top:6px;}
.agr-status-pill{margin-left:auto;flex-shrink:0;padding:7px 16px;border-radius:20px;font-size:0.78rem;font-weight:800;text-transform:uppercase;letter-spacing:0.05em;}
.agr-status-active{background:#dcf5e7;color:var(--green-dark);}
.agr-status-overdue{background:var(--red-light);color:var(--red);}
.agr-status-settled{background:#e8eaed;color:#555;}
.agr-id-bar{background:var(--accent);padding:1rem 2.75rem;display:flex;justify-content:space-between;align-items:center;border-bottom:2px solid var(--border);}
.agr-id-num{font-family:'Lora',serif;font-size:1.05rem;font-weight:700;}
.agr-id-label{font-size:0.7rem;font-weight:800;color:var(--muted);text-transform:uppercase;letter-spacing:0.06em;margin-bottom:2px;}
.agr-body{padding:2rem 2.75rem;}
.agr-section-title{font-family:'Lora',serif;font-size:0.95rem;font-weight:700;color:var(--green-dark);margin:1.75rem 0 0.85rem;padding-bottom:8px;border-bottom:2px solid var(--green-light);display:flex;align-items:center;gap:8px;}
.agr-section-title:first-child{margin-top:0;}
.agr-grid{display:grid;grid-template-columns:1fr 1fr;gap:0.75rem;}
.agr-cell{background:var(--accent);border-radius:9px;padding:0.85rem 1rem;border:1px solid var(--border);}
.agr-cell-label{font-size:0.68rem;font-weight:800;color:var(--muted);text-transform:uppercase;letter-spacing:0.06em;margin-bottom:4px;}
.agr-cell-value{font-size:0.95rem;font-weight:700;color:var(--ink);}
.agr-cell.full{grid-column:1/-1;}
.agr-money-bar{background:var(--green-dark);border-radius:10px;padding:1.25rem 1.5rem;display:grid;grid-template-columns:1fr 1fr 1fr;gap:1rem;margin-bottom:0.75rem;}
.agr-money-item .lbl{font-size:0.68rem;font-weight:800;color:rgba(255,255,255,0.5);text-transform:uppercase;letter-spacing:0.06em;margin-bottom:5px;}
.agr-money-item .val{font-family:'Lora',serif;font-size:1.2rem;font-weight:700;color:#fff;}
.agr-money-item.highlight .val{color:#7ef5a8;}
.agr-terms{background:#f0faf4;border:1px solid #b8e8cb;border-radius:9px;padding:1rem 1.25rem;font-size:0.83rem;color:#2a5a3a;line-height:1.75;white-space:pre-line;}
.agr-footer{background:var(--accent);padding:1.25rem 2.75rem;border-top:2px solid var(--border);display:flex;justify-content:space-between;align-items:center;}
.agr-footer-left{font-size:0.78rem;color:var(--muted);}
.agr-footer-right{font-size:0.78rem;font-weight:800;color:var(--green-dark);}
.sig-row{display:grid;grid-template-columns:1fr 1fr;gap:2rem;margin-top:0.75rem;}
.sig-box{text-align:center;}
.sig-line{height:1px;background:var(--ink);margin:3rem 0 8px;}
.sig-name{font-size:0.8rem;color:var(--muted);font-weight:700;}
.logo-upload-area{border:2px dashed var(--border);border-radius:10px;padding:1.5rem;text-align:center;cursor:pointer;transition:border-color 0.2s,background 0.2s;}
.logo-upload-area:hover{border-color:var(--green);background:var(--green-light);}
.logo-preview{width:80px;height:80px;border-radius:50%;object-fit:cover;margin:0 auto 0.5rem;display:block;}
.section-sub{font-size:0.8rem;font-weight:700;color:var(--green-dark);text-transform:uppercase;letter-spacing:0.06em;margin-bottom:0.75rem;padding-bottom:0.5rem;border-bottom:1px solid var(--green-light);}
.toast{position:fixed;bottom:2rem;right:2rem;background:var(--ink);color:#fff;padding:12px 20px;border-radius:10px;font-size:0.875rem;font-weight:700;z-index:999;box-shadow:var(--shadow-lg);border-left:4px solid var(--green);}
.toast.error{border-left-color:var(--red);}
@keyframes fadeUp{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:translateY(0)}}
.fade-up{animation:fadeUp 0.32s ease;}
@media(max-width:768px){
  .sidebar{display:none;}
  .stats{grid-template-columns:1fr 1fr;}
  .form-grid{grid-template-columns:1fr;}
  .agr-grid{grid-template-columns:1fr;}
  .agr-money-bar{grid-template-columns:1fr;}
  .agr-body{padding:1.5rem;}
  .agr-header{padding:1.5rem;}
  .agr-id-bar{padding:1rem 1.5rem;flex-direction:column;gap:0.5rem;}
  .agr-footer{padding:1rem 1.5rem;flex-direction:column;gap:4px;}
  .sig-row{grid-template-columns:1fr;}
}
`;

// ── Toast ────────────────────────────────────────────────────────────────────
function Toast({ msg, type }) {
  if (!msg) return null;
  return <div className={`toast ${type === "error" ? "error" : ""}`}>{msg}</div>;
}

// ── Main App ─────────────────────────────────────────────────────────────────
export default function App() {
  const [screen, setScreen] = useState("loading");
  const [pinInput, setPinInput] = useState("");
  const [pinError, setPinError] = useState("");
  const [activePage, setActivePage] = useState("dashboard");
  const [viewingLoan, setViewingLoan] = useState(null);
  const [business, setBusiness] = useState(null);
  const [loans, setLoans] = useState([]);
  const [toast, setToast] = useState({ msg: "", type: "ok" });

  const showToast = (msg, type = "ok") => {
    setToast({ msg, type });
    setTimeout(() => setToast({ msg: "", type: "ok" }), 3000);
  };

  // Load business settings on mount
  useEffect(() => {
    loadBusiness();
  }, []);

  const loadBusiness = async () => {
    const { data, error } = await supabase.from("business").select("*").eq("id", 1).single();
    if (error || !data) {
      showToast("Could not connect to database. Check your Supabase setup.", "error");
      setScreen("login");
      setBusiness({ name: "Sonkhela Soft Loans", tagline: "Simple Loans. Real People.", phone: "", email: "", address: "", admin_pin: "1234", logo: null });
    } else {
      setBusiness(data);
      setScreen("login");
    }
  };

  const loadLoans = async () => {
    const { data, error } = await supabase.from("loans").select("*").order("created_at", { ascending: false });
    if (!error && data) setLoans(data);
  };

  const handlePinKey = (k) => {
    if (k === "del") { setPinInput((p) => p.slice(0, -1)); setPinError(""); return; }
    if (pinInput.length >= 6) return;
    const next = pinInput + k;
    setPinInput(next);
    const pin = business?.admin_pin || "1234";
    if (next.length >= pin.length) {
      if (next === pin) {
        setTimeout(async () => {
          await loadLoans();
          setScreen("app");
          setPinInput("");
        }, 200);
      } else {
        setTimeout(() => { setPinError("Wrong PIN. Try again."); setPinInput(""); }, 300);
      }
    }
  };

  const openAgreement = (loan) => { setViewingLoan(loan); setScreen("agreement"); };
  const backFromAgreement = () => { setScreen("app"); setViewingLoan(null); };

  if (screen === "loading") return (
    <>
      <style>{STYLES}</style>
      <div className="loading-screen">
        <div className="loading-spinner" />
        <div className="loading-text">Loading Sonkhela Soft Loans...</div>
      </div>
    </>
  );

  if (screen === "login") return (
    <>
      <style>{STYLES}</style>
      <LoginScreen business={business} pinInput={pinInput} pinError={pinError} onKey={handlePinKey} />
    </>
  );

  if (screen === "agreement" && viewingLoan) return (
    <>
      <style>{STYLES}</style>
      <AgreementScreen loan={viewingLoan} business={business} onBack={backFromAgreement} />
    </>
  );

  return (
    <>
      <style>{STYLES}</style>
      <Toast msg={toast.msg} type={toast.type} />
      <div className="shell">
        <Sidebar activePage={activePage} setActivePage={setActivePage} business={business} onLogout={() => { setScreen("login"); setPinInput(""); }} />
        <div className="main">
          <Topbar title={activePage === "dashboard" ? "Dashboard" : activePage === "clients" ? "Clients" : "Settings"} />
          <div className="page fade-up" key={activePage}>
            {activePage === "dashboard" && <Dashboard loans={loans} openAgreement={openAgreement} setActivePage={setActivePage} />}
            {activePage === "clients" && <ClientsPage loans={loans} setLoans={setLoans} openAgreement={openAgreement} showToast={showToast} />}
            {activePage === "settings" && <SettingsPage business={business} setBusiness={setBusiness} showToast={showToast} />}
          </div>
        </div>
      </div>
    </>
  );
}

// ── Login ────────────────────────────────────────────────────────────────────
function LoginScreen({ business, pinInput, pinError, onKey }) {
  const keys = ["1","2","3","4","5","6","7","8","9","del","0"];
  const maxLen = (business?.admin_pin || "1234").length;
  return (
    <div className="login-shell">
      <div className="login-box fade-up">
        <div className="login-logo">
          {business?.logo ? <img src={business.logo} alt="logo" /> : (business?.name || "S")[0]}
        </div>
        <div className="login-title">{business?.name || "Sonkhela Soft Loans"}</div>
        <div className="login-sub">Admin Login — Enter your PIN</div>
        <div className="pin-dots">
          {Array.from({ length: maxLen }).map((_, i) => (
            <div key={i} className={`pin-dot ${i < pinInput.length ? "filled" : ""}`} />
          ))}
        </div>
        {pinError && <div className="pin-error">{pinError}</div>}
        <div className="pin-grid">
          {keys.map((k) => (
            <button key={k} className={`pin-key ${k === "0" ? "zero" : ""} ${k === "del" ? "del" : ""}`} onClick={() => onKey(k)}>
              {k === "del" ? "⌫" : k}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Sidebar ──────────────────────────────────────────────────────────────────
function Sidebar({ activePage, setActivePage, business, onLogout }) {
  const items = [
    { id: "dashboard", icon: "📊", label: "Dashboard" },
    { id: "clients", icon: "👥", label: "Clients" },
    { id: "settings", icon: "⚙️", label: "Settings" },
  ];
  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <div className="brand-logo">
          {business?.logo ? <img src={business.logo} alt="logo" /> : (business?.name || "S")[0]}
        </div>
        <div className="brand-name">{business?.name}</div>
        <div className="brand-tag">{business?.tagline}</div>
      </div>
      <nav className="sidebar-nav">
        {items.map((item) => (
          <button key={item.id} className={`nav-item ${activePage === item.id ? "active" : ""}`} onClick={() => setActivePage(item.id)}>
            <span style={{ fontSize: "1rem", width: 20, textAlign: "center" }}>{item.icon}</span> {item.label}
          </button>
        ))}
      </nav>
      <div className="sidebar-footer">
        <button className="logout-btn" onClick={onLogout}>🔒 Lock / Logout</button>
      </div>
    </aside>
  );
}

// ── Topbar ───────────────────────────────────────────────────────────────────
function Topbar({ title }) {
  const today = new Date().toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  return (
    <div className="topbar">
      <div className="topbar-title">{title}</div>
      <div className="topbar-date">{today}</div>
    </div>
  );
}

// ── Dashboard ────────────────────────────────────────────────────────────────
function Dashboard({ loans, openAgreement, setActivePage }) {
  const totalIssued = loans.reduce((s, l) => s + Number(l.amount), 0);
  const active = loans.filter((l) => l.status === "active" && !isOverdue(l)).length;
  const overdue = loans.filter(isOverdue).length;
  const settled = loans.filter((l) => l.status === "settled").length;
  const recent = loans.slice(0, 6);
  return (
    <>
      <div style={{ marginBottom: "1.75rem" }}>
        <h1 style={{ fontFamily: "'Lora',serif", fontSize: "1.6rem", fontWeight: 700, marginBottom: 4 }}>Welcome back 👋</h1>
        <p style={{ color: "var(--muted)", fontSize: "0.875rem" }}>Here's what's happening with your loan portfolio today.</p>
      </div>
      <div className="stats">
        <div className="stat-card">
          <div className="stat-label">Total Issued</div>
          <div className="stat-value" style={{ fontSize: "1.3rem" }}>{fmt(totalIssued)}</div>
          <div className="stat-sub">{loans.length} agreements</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Active Loans</div>
          <div className="stat-value">{active}</div>
          <div className="stat-sub">in good standing</div>
        </div>
        <div className="stat-card amber">
          <div className="stat-label">Overdue</div>
          <div className="stat-value" style={{ color: overdue > 0 ? "var(--amber)" : "inherit" }}>{overdue}</div>
          <div className="stat-sub">need attention</div>
        </div>
        <div className="stat-card gray">
          <div className="stat-label">Settled</div>
          <div className="stat-value">{settled}</div>
          <div className="stat-sub">fully repaid</div>
        </div>
      </div>
      <div className="card">
        <div className="card-head">
          <div className="card-title">Recent Agreements</div>
          <button className="btn btn-outline btn-sm" onClick={() => setActivePage("clients")}>View All →</button>
        </div>
        <div className="tbl-wrap">
          <table>
            <thead>
              <tr><th>Loan ID</th><th>Client Name</th><th>Amount</th><th>Due Date</th><th>Status</th><th>Action</th></tr>
            </thead>
            <tbody>
              {loans.length === 0 && <tr><td colSpan={6} style={{ textAlign: "center", color: "var(--muted)", padding: "2rem" }}>No loans yet. Add your first client!</td></tr>}
              {recent.map((loan) => {
                const over = isOverdue(loan);
                const statusLabel = over ? "overdue" : loan.status;
                return (
                  <tr key={loan.id}>
                    <td style={{ fontWeight: 800, fontFamily: "'Lora',serif", fontSize: "0.82rem" }}>{loan.id}</td>
                    <td style={{ fontWeight: 700 }}>{loan.client_name}</td>
                    <td style={{ fontWeight: 700 }}>{fmt(loan.amount)}</td>
                    <td style={{ color: over ? "var(--red)" : "inherit", fontWeight: over ? 800 : 400 }}>{fmtDate(loan.due_date)}</td>
                    <td><span className={`badge badge-${statusLabel}`}>{statusLabel}</span></td>
                    <td><button className="btn btn-green btn-xs" onClick={() => openAgreement(loan)}>View Agreement</button></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}

// ── Clients Page ─────────────────────────────────────────────────────────────
function ClientsPage({ loans, setLoans, openAgreement, showToast }) {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [showModal, setShowModal] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [saving, setSaving] = useState(false);

  const filtered = loans.filter((l) => {
    const s = ((l.client_name || "") + l.id).toLowerCase().includes(search.toLowerCase());
    if (filter === "all") return s;
    if (filter === "overdue") return s && isOverdue(l);
    return s && l.status === filter && !isOverdue(l);
  });

  const deleteLoan = async (id) => {
    if (!confirm("Delete this loan agreement permanently?")) return;
    const { error } = await supabase.from("loans").delete().eq("id", id);
    if (error) { showToast("Failed to delete. Try again.", "error"); return; }
    setLoans((prev) => prev.filter((l) => l.id !== id));
    showToast("Agreement deleted.");
  };

  const updateStatus = async (id, status) => {
    const { error } = await supabase.from("loans").update({ status }).eq("id", id);
    if (error) { showToast("Failed to update status.", "error"); return; }
    setLoans((prev) => prev.map((l) => l.id === id ? { ...l, status } : l));
  };

  const handleSave = async (data) => {
    setSaving(true);
    if (editTarget) {
      const { error } = await supabase.from("loans").update(data).eq("id", editTarget.id);
      if (error) { showToast("Failed to save changes.", "error"); setSaving(false); return; }
      setLoans((prev) => prev.map((l) => l.id === editTarget.id ? { ...l, ...data } : l));
      showToast("Agreement updated! ✓");
    } else {
      const newLoan = { ...data, id: genId() };
      const { error } = await supabase.from("loans").insert(newLoan);
      if (error) { showToast("Failed to create agreement.", "error"); setSaving(false); return; }
      setLoans((prev) => [newLoan, ...prev]);
      showToast("New agreement created! ✓");
    }
    setSaving(false);
    setShowModal(false);
  };

  return (
    <>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: "1.75rem", flexWrap: "wrap", gap: "1rem" }}>
        <div>
          <h1 style={{ fontFamily: "'Lora',serif", fontSize: "1.6rem", fontWeight: 700, marginBottom: 4 }}>Clients</h1>
          <p style={{ color: "var(--muted)", fontSize: "0.875rem" }}>{loans.length} loan agreement{loans.length !== 1 ? "s" : ""} on record</p>
        </div>
        <button className="btn btn-green" onClick={() => { setEditTarget(null); setShowModal(true); }}>+ New Agreement</button>
      </div>
      <div style={{ display: "flex", gap: "0.75rem", marginBottom: "1rem", flexWrap: "wrap" }}>
        <input style={{ flex: 1, minWidth: 200 }} placeholder="🔍 Search by name or loan ID..." value={search} onChange={(e) => setSearch(e.target.value)} />
        <select value={filter} onChange={(e) => setFilter(e.target.value)} style={{ minWidth: 150 }}>
          <option value="all">All Statuses</option>
          <option value="active">Active</option>
          <option value="overdue">Overdue</option>
          <option value="settled">Settled</option>
        </select>
      </div>
      <div className="card">
        <div className="tbl-wrap">
          <table>
            <thead>
              <tr><th>Loan ID</th><th>Client</th><th>Amount</th><th>Interest</th><th>Due Date</th><th>Collateral</th><th>Status</th><th>Actions</th></tr>
            </thead>
            <tbody>
              {filtered.length === 0 && <tr><td colSpan={8} style={{ textAlign: "center", color: "var(--muted)", padding: "2.5rem" }}>No agreements found.</td></tr>}
              {filtered.map((loan) => {
                const over = isOverdue(loan);
                const statusLabel = over ? "overdue" : loan.status;
                return (
                  <tr key={loan.id}>
                    <td style={{ fontWeight: 800, fontFamily: "'Lora',serif", fontSize: "0.82rem" }}>{loan.id}</td>
                    <td><div style={{ fontWeight: 700 }}>{loan.client_name}</div><div style={{ fontSize: "0.75rem", color: "var(--muted)" }}>{loan.client_phone}</div></td>
                    <td style={{ fontWeight: 700 }}>{fmt(loan.amount)}</td>
                    <td>{loan.interest_rate}%</td>
                    <td style={{ color: over ? "var(--red)" : "inherit", fontWeight: over ? 800 : 400 }}>{fmtDate(loan.due_date)}</td>
                    <td style={{ fontSize: "0.78rem", maxWidth: 160, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{loan.collateral}</td>
                    <td>
                      <select value={over ? "overdue" : loan.status} onChange={(e) => updateStatus(loan.id, e.target.value)} style={{ padding: "5px 8px", fontSize: "0.78rem", minWidth: 100 }}>
                        <option value="active">Active</option>
                        <option value="settled">Settled</option>
                        <option value="overdue">Overdue</option>
                      </select>
                    </td>
                    <td>
                      <div style={{ display: "flex", gap: 6 }}>
                        <button className="btn btn-green btn-xs" onClick={() => openAgreement(loan)}>View</button>
                        <button className="btn btn-ghost btn-xs" onClick={() => { setEditTarget(loan); setShowModal(true); }}>Edit</button>
                        <button className="btn btn-red btn-xs" onClick={() => deleteLoan(loan.id)}>✕</button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
      {showModal && <LoanModal loan={editTarget} saving={saving} onClose={() => setShowModal(false)} onSave={handleSave} />}
    </>
  );
}

// ── Loan Modal ────────────────────────────────────────────────────────────────
function LoanModal({ loan, onClose, onSave, saving }) {
  const blank = {
    client_name: "", client_phone: "", client_nrc: "", amount: "",
    interest_rate: "", processing_date: new Date().toISOString().slice(0, 10),
    due_date: "", repayment: "monthly", collateral: "", collateral_value: "",
    status: "active",
    terms: "The borrower agrees to repay the full loan amount plus interest by the due date. The collateral will be held by the lender until full repayment. Failure to repay by the due date may result in forfeiture of the stated collateral.",
  };
  const [f, setF] = useState(loan || blank);
  const set = (k, v) => setF((p) => ({ ...p, [k]: v }));
  const save = () => {
    if (!f.client_name || !f.amount || !f.due_date) { alert("Please fill in: Client Name, Loan Amount, and Due Date."); return; }
    onSave(f);
  };
  return (
    <div className="modal-backdrop" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal fade-up">
        <div className="modal-head">
          <div className="modal-title">{loan ? "Edit Loan Agreement" : "New Loan Agreement"}</div>
          <button className="close-btn" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">
          <p className="section-sub">👤 Client Info</p>
          <div className="form-grid" style={{ marginBottom: "1.25rem" }}>
            <div className="form-group"><label>Full Name *</label><input value={f.client_name} onChange={(e) => set("client_name", e.target.value)} placeholder="e.g. Chanda Mutale" /></div>
            <div className="form-group"><label>Phone Number</label><input value={f.client_phone} onChange={(e) => set("client_phone", e.target.value)} placeholder="+260 97..." /></div>
            <div className="form-group full"><label>NRC / National ID</label><input value={f.client_nrc} onChange={(e) => set("client_nrc", e.target.value)} placeholder="e.g. 234567/10/1" /></div>
          </div>
          <p className="section-sub">💰 Loan Details</p>
          <div className="form-grid" style={{ marginBottom: "1.25rem" }}>
            <div className="form-group"><label>Loan Amount (K) *</label><input type="number" value={f.amount} onChange={(e) => set("amount", e.target.value)} placeholder="5000" /></div>
            <div className="form-group"><label>Interest Rate (%)</label><input type="number" value={f.interest_rate} onChange={(e) => set("interest_rate", e.target.value)} placeholder="20" /></div>
            <div className="form-group"><label>Processing Date</label><input type="date" value={f.processing_date} onChange={(e) => set("processing_date", e.target.value)} /></div>
            <div className="form-group"><label>Due Date *</label><input type="date" value={f.due_date} onChange={(e) => set("due_date", e.target.value)} /></div>
            <div className="form-group full"><label>Repayment Schedule</label>
              <select value={f.repayment} onChange={(e) => set("repayment", e.target.value)}>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
                <option value="lump-sum">Lump Sum</option>
              </select>
            </div>
          </div>
          <p className="section-sub">🔒 Collateral</p>
          <div className="form-grid" style={{ marginBottom: "1.25rem" }}>
            <div className="form-group full"><label>Item / Description *</label><input value={f.collateral} onChange={(e) => set("collateral", e.target.value)} placeholder="e.g. Samsung 55-inch TV – Serial No. XYZ123" /></div>
            <div className="form-group"><label>Collateral Value (K)</label><input type="number" value={f.collateral_value} onChange={(e) => set("collateral_value", e.target.value)} placeholder="10000" /></div>
          </div>
          <p className="section-sub">📋 Terms & Conditions</p>
          <div className="form-group"><textarea value={f.terms} onChange={(e) => set("terms", e.target.value)} rows={4} /></div>
        </div>
        <div className="modal-foot">
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn btn-green" onClick={save} disabled={saving}>{saving ? "Saving..." : loan ? "Save Changes" : "✓ Create Agreement"}</button>
        </div>
      </div>
    </div>
  );
}

// ── Settings ──────────────────────────────────────────────────────────────────
function SettingsPage({ business, setBusiness, showToast }) {
  const [f, setF] = useState({ ...business });
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setF((p) => ({ ...p, [k]: v }));

  const uploadLogo = (e) => {
    const file = e.target.files[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => set("logo", ev.target.result);
    reader.readAsDataURL(file);
  };

  const handleSave = async () => {
    setSaving(true);
    const { error } = await supabase.from("business").update({
      name: f.name, tagline: f.tagline, phone: f.phone,
      email: f.email, address: f.address, admin_pin: f.admin_pin, logo: f.logo,
    }).eq("id", 1);
    setSaving(false);
    if (error) { showToast("Failed to save settings.", "error"); return; }
    setBusiness(f);
    showToast("Settings saved! ✓");
  };

  return (
    <>
      <div style={{ marginBottom: "1.75rem" }}>
        <h1 style={{ fontFamily: "'Lora',serif", fontSize: "1.6rem", fontWeight: 700, marginBottom: 4 }}>Settings</h1>
        <p style={{ color: "var(--muted)", fontSize: "0.875rem" }}>Manage your business profile and security</p>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.5rem" }}>
        <div className="card">
          <div className="card-head"><div className="card-title">Business Profile</div></div>
          <div className="card-body" style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            <div className="form-group">
              <label>Business Logo</label>
              <div className="logo-upload-area" onClick={() => document.getElementById("logoUpload").click()}>
                {f.logo ? <img className="logo-preview" src={f.logo} alt="logo" /> : <div style={{ fontSize: "2rem", marginBottom: 8 }}>🏢</div>}
                <div style={{ fontSize: "0.8rem", color: "var(--muted)", fontWeight: 700 }}>Click to upload logo</div>
                <div style={{ fontSize: "0.72rem", color: "var(--muted)" }}>PNG or JPG, square preferred</div>
              </div>
              <input id="logoUpload" type="file" accept="image/*" style={{ display: "none" }} onChange={uploadLogo} />
            </div>
            <div className="form-group"><label>Business Name</label><input value={f.name} onChange={(e) => set("name", e.target.value)} /></div>
            <div className="form-group"><label>Tagline</label><input value={f.tagline} onChange={(e) => set("tagline", e.target.value)} /></div>
            <div className="form-group"><label>Phone</label><input value={f.phone} onChange={(e) => set("phone", e.target.value)} /></div>
            <div className="form-group"><label>Email</label><input value={f.email} onChange={(e) => set("email", e.target.value)} /></div>
            <div className="form-group"><label>Address</label><input value={f.address} onChange={(e) => set("address", e.target.value)} /></div>
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
          <div className="card">
            <div className="card-head"><div className="card-title">🔐 Security</div></div>
            <div className="card-body">
              <div className="form-group">
                <label>Admin PIN</label>
                <input type="password" maxLength={6} value={f.admin_pin} onChange={(e) => set("admin_pin", e.target.value)} placeholder="4–6 digits" />
                <span style={{ fontSize: "0.72rem", color: "var(--muted)" }}>This PIN protects your dashboard.</span>
              </div>
            </div>
          </div>
          <div className="card">
            <div className="card-head"><div className="card-title">💾 Save Changes</div></div>
            <div className="card-body">
              <p style={{ fontSize: "0.85rem", color: "var(--muted)", marginBottom: "1rem" }}>All changes are saved permanently to your database.</p>
              <button className="btn btn-green" style={{ width: "100%" }} onClick={handleSave} disabled={saving}>
                {saving ? "Saving..." : "Save All Settings"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

// ── Agreement View ────────────────────────────────────────────────────────────
function AgreementScreen({ loan, business, onBack }) {
  const calc = calcLoan(loan.amount, loan.interest_rate, loan.repayment);
  const over = isOverdue(loan);
  const displayStatus = over ? "overdue" : loan.status;
  const schedMap = { weekly: "Weekly", monthly: "Monthly", "lump-sum": "Lump Sum" };
  const instLabel = loan.repayment !== "lump-sum"
    ? `${fmt(calc.installment)} / ${loan.repayment === "weekly" ? "week" : "month"}`
    : fmt(calc.total) + " (once)";

  return (
    <div className="agr-page">
      {onBack && <div style={{ width: "100%", maxWidth: 740, marginBottom: "1rem" }}><button className="btn btn-green btn-sm" onClick={onBack}>← Back to Dashboard</button></div>}
      <div className="agr-doc fade-up">
        <div className="agr-header">
          <div className="agr-logo">{business?.logo ? <img src={business.logo} alt="logo" /> : (business?.name || "S")[0]}</div>
          <div>
            <div className="agr-biz-name">{business?.name}</div>
            <div className="agr-biz-tag">{business?.tagline}</div>
            <div className="agr-biz-contact">{business?.phone} · {business?.email} · {business?.address}</div>
          </div>
          <span className={`agr-status-pill agr-status-${displayStatus}`}>{displayStatus.toUpperCase()}</span>
        </div>
        <div className="agr-id-bar">
          <div><div className="agr-id-label">Agreement Number</div><div className="agr-id-num">{loan.id}</div></div>
          <div style={{ textAlign: "right" }}><div className="agr-id-label">Date Issued</div><div style={{ fontWeight: 800, fontSize: "0.9rem" }}>{fmtDate(loan.processing_date)}</div></div>
        </div>
        <div className="agr-body">
          <div className="agr-section-title">👤 Borrower Details</div>
          <div className="agr-grid">
            <div className="agr-cell"><div className="agr-cell-label">Full Name</div><div className="agr-cell-value">{loan.client_name}</div></div>
            <div className="agr-cell"><div className="agr-cell-label">Phone Number</div><div className="agr-cell-value">{loan.client_phone || "—"}</div></div>
            <div className="agr-cell full"><div className="agr-cell-label">NRC / National ID</div><div className="agr-cell-value">{loan.client_nrc || "—"}</div></div>
          </div>
          <div className="agr-section-title">💰 Loan Financials</div>
          <div className="agr-money-bar">
            <div className="agr-money-item"><div className="lbl">Principal Amount</div><div className="val">{fmt(loan.amount)}</div></div>
            <div className="agr-money-item"><div className="lbl">Interest ({loan.interest_rate}%)</div><div className="val">{fmt(loan.amount * loan.interest_rate / 100)}</div></div>
            <div className="agr-money-item highlight"><div className="lbl">Total Repayable</div><div className="val">{fmt(calc.total)}</div></div>
          </div>
          <div className="agr-grid">
            <div className="agr-cell"><div className="agr-cell-label">Processing Date</div><div className="agr-cell-value">{fmtDate(loan.processing_date)}</div></div>
            <div className="agr-cell"><div className="agr-cell-label">Due Date</div><div className="agr-cell-value" style={{ color: over ? "var(--red)" : "inherit" }}>{fmtDate(loan.due_date)}{over ? " ⚠️" : ""}</div></div>
            <div className="agr-cell"><div className="agr-cell-label">Repayment Schedule</div><div className="agr-cell-value">{schedMap[loan.repayment] || loan.repayment}</div></div>
            <div className="agr-cell"><div className="agr-cell-label">Installment</div><div className="agr-cell-value">{instLabel}</div></div>
          </div>
          <div className="agr-section-title">🔒 Collateral Held</div>
          <div className="agr-grid">
            <div className="agr-cell full"><div className="agr-cell-label">Item / Description</div><div className="agr-cell-value">{loan.collateral}</div></div>
            {loan.collateral_value && <div className="agr-cell"><div className="agr-cell-label">Estimated Value</div><div className="agr-cell-value">{fmt(loan.collateral_value)}</div></div>}
          </div>
          {loan.terms && <><div className="agr-section-title">📋 Terms & Conditions</div><div className="agr-terms">{loan.terms}</div></>}
          <div className="agr-section-title">✍️ Signatures</div>
          <div className="sig-row">
            <div className="sig-box"><div className="sig-line" /><div className="sig-name">{business?.name} (Lender)</div></div>
            <div className="sig-box"><div className="sig-line" /><div className="sig-name">{loan.client_name} (Borrower)</div></div>
          </div>
        </div>
        <div className="agr-footer">
          <div className="agr-footer-left">{business?.name} · {business?.email}</div>
          <div className="agr-footer-right">Official Loan Agreement</div>
        </div>
      </div>
      <div style={{ marginTop: "1rem", fontSize: "0.72rem", color: "#6b9e7e", textAlign: "center" }}>This document is confidential and issued by {business?.name}</div>
    </div>
  );
}
