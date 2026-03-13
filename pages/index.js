import { useState, useEffect } from "react";
import { supabase, fmt, fmtDate, isOverdue, genId, AGR_STYLES } from "./shared";

const ADMIN_STYLES = `
${AGR_STYLES}
body{background:#f4fbf6;}
.shell{display:flex;min-height:100vh;}
.sidebar{width:240px;flex-shrink:0;background:#145f39;display:flex;flex-direction:column;position:sticky;top:0;height:100vh;}
.sidebar-brand{padding:28px 20px 20px;border-bottom:1px solid rgba(255,255,255,0.08);}
.brand-logo{width:44px;height:44px;border-radius:50%;background:rgba(255,255,255,0.15);display:flex;align-items:center;justify-content:center;font-family:'Lora',serif;font-size:18px;font-weight:700;color:#fff;margin-bottom:10px;overflow:hidden;}
.brand-logo img{width:100%;height:100%;object-fit:cover;}
.brand-name{font-family:'Lora',serif;color:#fff;font-size:1rem;font-weight:700;line-height:1.3;}
.brand-tag{font-size:0.72rem;color:rgba(255,255,255,0.5);margin-top:2px;}
.sidebar-nav{flex:1;padding:16px 12px;display:flex;flex-direction:column;gap:4px;}
.nav-item{display:flex;align-items:center;gap:10px;padding:11px 14px;border-radius:10px;border:none;cursor:pointer;font-family:'Nunito',sans-serif;font-size:0.875rem;font-weight:700;color:rgba(255,255,255,0.6);background:transparent;transition:all 0.18s;text-align:left;width:100%;}
.nav-item:hover{color:#fff;background:rgba(255,255,255,0.08);}
.nav-item.active{color:#145f39;background:#fff;}
.sidebar-footer{padding:16px 12px;border-top:1px solid rgba(255,255,255,0.08);}
.logout-btn{width:100%;padding:10px 14px;border-radius:10px;border:1px solid rgba(255,255,255,0.15);background:transparent;color:rgba(255,255,255,0.5);font-family:'Nunito',sans-serif;font-size:0.8rem;font-weight:700;cursor:pointer;transition:all 0.18s;display:flex;align-items:center;gap:8px;}
.logout-btn:hover{background:rgba(255,255,255,0.08);color:#fff;}
.main{flex:1;overflow-y:auto;}
.topbar{background:#fff;border-bottom:1px solid #d4e8db;padding:0 2rem;height:60px;display:flex;align-items:center;justify-content:space-between;position:sticky;top:0;z-index:50;}
.topbar-title{font-family:'Lora',serif;font-size:1.2rem;font-weight:700;}
.topbar-date{font-size:0.8rem;color:#6b7c72;}
.page{padding:2rem;max-width:1100px;}
.stats-row{display:grid;grid-template-columns:repeat(3,1fr);gap:1rem;margin-bottom:1rem;}
.stat-card{background:#fff;border-radius:12px;border:1px solid #d4e8db;padding:1.25rem 1.5rem;border-top:3px solid #1a7a4a;transition:transform 0.2s,box-shadow 0.2s;box-shadow:0 1px 6px rgba(26,122,74,0.07);}
.stat-card:hover{transform:translateY(-2px);box-shadow:0 4px 20px rgba(26,122,74,0.12);}
.stat-card.amber{border-top-color:#d97706;}
.stat-card.gray{border-top-color:#888;}
.stat-card.purple{border-top-color:#7c3aed;}
.stat-card.blue{border-top-color:#2563eb;}
.stat-card.teal{border-top-color:#0891b2;}
.stat-label{font-size:0.7rem;font-weight:800;color:#6b7c72;text-transform:uppercase;letter-spacing:0.06em;margin-bottom:8px;}
.stat-value{font-family:'Lora',serif;font-size:1.65rem;font-weight:700;color:#0d1f14;line-height:1;}
.stat-value.sm{font-size:1.2rem;}
.stat-sub{font-size:0.72rem;color:#6b7c72;margin-top:4px;}
.card{background:#fff;border-radius:12px;border:1px solid #d4e8db;margin-bottom:1.5rem;box-shadow:0 1px 6px rgba(26,122,74,0.07);}
.card-head{padding:1.25rem 1.5rem;border-bottom:1px solid #d4e8db;display:flex;align-items:center;justify-content:space-between;}
.card-title{font-family:'Lora',serif;font-size:1rem;font-weight:700;}
.card-body{padding:1.5rem;}
.tbl-wrap{overflow-x:auto;}
table{width:100%;border-collapse:collapse;font-size:0.875rem;}
th{padding:10px 14px;text-align:left;background:#f0faf4;color:#6b7c72;font-size:0.68rem;font-weight:800;text-transform:uppercase;letter-spacing:0.06em;border-bottom:2px solid #d4e8db;}
td{padding:12px 14px;border-bottom:1px solid #d4e8db;vertical-align:middle;}
tr:last-child td{border-bottom:none;}
tr:hover td{background:#f9fefb;}
.badge{display:inline-block;padding:3px 10px;border-radius:20px;font-size:0.68rem;font-weight:800;text-transform:uppercase;}
.badge-active{background:#dcf5e7;color:#145f39;}
.badge-overdue{background:#fdf0ee;color:#c0392b;}
.badge-settled{background:#e8eaed;color:#555;}
.btn{display:inline-flex;align-items:center;gap:6px;padding:10px 20px;border-radius:9px;border:none;font-family:'Nunito',sans-serif;font-weight:800;font-size:0.875rem;cursor:pointer;transition:all 0.18s;}
.btn:disabled{opacity:0.55;cursor:not-allowed;transform:none!important;box-shadow:none!important;}
.btn-green{background:#1a7a4a;color:#fff;}
.btn-green:hover:not(:disabled){background:#2da05f;transform:translateY(-1px);}
.btn-outline{background:transparent;color:#1a7a4a;border:2px solid #1a7a4a;}
.btn-outline:hover{background:#e8f5ee;}
.btn-ghost{background:transparent;color:#6b7c72;border:1px solid #d4e8db;}
.btn-ghost:hover:not(:disabled){background:#f4fbf6;color:#0d1f14;}
.btn-red{background:#c0392b;color:#fff;}
.btn-red:hover{background:#a93226;}
.btn-blue{background:#2563eb;color:#fff;}
.btn-blue:hover:not(:disabled){background:#1d4ed8;}
.btn-link{background:#e8f5ee;color:#145f39;border:1px solid #d4e8db;}
.btn-link:hover{background:#d4edda;}
.btn-sm{padding:6px 13px;font-size:0.78rem;}
.btn-xs{padding:4px 10px;font-size:0.72rem;}
.form-grid{display:grid;grid-template-columns:1fr 1fr;gap:1rem;}
.form-group{display:flex;flex-direction:column;gap:5px;}
.form-group.full{grid-column:1/-1;}
label{font-size:0.72rem;font-weight:800;color:#6b7c72;text-transform:uppercase;letter-spacing:0.06em;}
input,select,textarea{padding:10px 14px;border:1.5px solid #d4e8db;border-radius:9px;font-family:'Nunito',sans-serif;font-size:0.9rem;color:#0d1f14;background:#fff;outline:none;transition:border-color 0.18s;width:100%;}
input:focus,select:focus,textarea:focus{border-color:#1a7a4a;box-shadow:0 0 0 3px rgba(26,122,74,0.1);}
textarea{resize:vertical;min-height:80px;}
.modal-backdrop{position:fixed;inset:0;z-index:200;background:rgba(13,31,20,0.55);backdrop-filter:blur(4px);display:flex;align-items:center;justify-content:center;padding:1rem;}
.modal{background:#fff;border-radius:16px;width:100%;max-width:700px;max-height:92vh;overflow-y:auto;box-shadow:0 12px 48px rgba(26,122,74,0.16);}
.modal-head{padding:1.5rem 1.75rem;border-bottom:1px solid #d4e8db;display:flex;align-items:center;justify-content:space-between;position:sticky;top:0;background:#fff;z-index:1;}
.modal-title{font-family:'Lora',serif;font-size:1.2rem;font-weight:700;}
.modal-body{padding:1.75rem;}
.modal-foot{padding:1.25rem 1.75rem;border-top:1px solid #d4e8db;display:flex;gap:0.75rem;justify-content:flex-end;position:sticky;bottom:0;background:#fff;}
.close-btn{width:32px;height:32px;border-radius:50%;border:none;background:#f4fbf6;cursor:pointer;font-size:1rem;display:flex;align-items:center;justify-content:center;color:#6b7c72;}
.close-btn:hover{background:#d4e8db;}
.login-shell{min-height:100vh;background:#145f39;display:flex;align-items:center;justify-content:center;padding:1rem;}
.login-box{background:#fff;border-radius:20px;padding:2.5rem;width:100%;max-width:400px;text-align:center;box-shadow:0 12px 48px rgba(26,122,74,0.2);}
.login-logo{width:72px;height:72px;border-radius:50%;background:#1a7a4a;margin:0 auto 1.25rem;display:flex;align-items:center;justify-content:center;font-family:'Lora',serif;font-size:24px;font-weight:700;color:#fff;overflow:hidden;}
.login-logo img{width:100%;height:100%;object-fit:cover;}
.login-title{font-family:'Lora',serif;font-size:1.6rem;font-weight:700;margin-bottom:4px;}
.login-sub{color:#6b7c72;font-size:0.875rem;margin-bottom:2rem;}
.pin-dots{display:flex;gap:12px;justify-content:center;margin-bottom:1.5rem;}
.pin-dot{width:14px;height:14px;border-radius:50%;border:2px solid #d4e8db;transition:all 0.18s;}
.pin-dot.filled{background:#1a7a4a;border-color:#1a7a4a;}
.pin-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-bottom:1rem;}
.pin-key{padding:14px;border-radius:10px;border:1.5px solid #d4e8db;background:#f4fbf6;font-family:'Nunito',sans-serif;font-size:1.1rem;font-weight:800;color:#0d1f14;cursor:pointer;transition:all 0.15s;}
.pin-key:hover{background:#e8f5ee;border-color:#1a7a4a;color:#145f39;}
.pin-key:active{transform:scale(0.95);}
.pin-key.zero{grid-column:2;}
.pin-key.del{background:#fdf0ee;border-color:#f5c6c0;color:#c0392b;}
.pin-error{color:#c0392b;font-size:0.85rem;font-weight:700;margin-bottom:0.75rem;}
.upload-area{border:2px dashed #d4e8db;border-radius:10px;padding:1.25rem;text-align:center;cursor:pointer;transition:all 0.2s;background:#f9fefb;}
.upload-area:hover{border-color:#1a7a4a;background:#e8f5ee;}
.upload-preview{max-width:220px;max-height:90px;object-fit:contain;margin:0 auto 0.5rem;display:block;}
.upload-preview-round{width:72px;height:72px;border-radius:50%;object-fit:cover;margin:0 auto 0.5rem;display:block;}
.section-sub{font-size:0.78rem;font-weight:800;color:#1a7a4a;text-transform:uppercase;letter-spacing:0.06em;margin-bottom:0.75rem;padding-bottom:0.5rem;border-bottom:1px solid #e8f5ee;}
.toast{position:fixed;bottom:2rem;right:2rem;background:#0d1f14;color:#fff;padding:12px 22px;border-radius:10px;font-size:0.875rem;font-weight:700;z-index:999;box-shadow:0 8px 32px rgba(0,0,0,0.2);border-left:4px solid #1a7a4a;animation:fadeUp 0.25s ease;}
.toast.error{border-left-color:#c0392b;}
.toast.info{border-left-color:#2563eb;}
@media(max-width:900px){.stats-row{grid-template-columns:1fr 1fr;}}
@media(max-width:768px){.sidebar{display:none;}.form-grid{grid-template-columns:1fr;}}
`;

export default function App() {
  const [screen, setScreen] = useState("loading");
  const [pinInput, setPinInput] = useState("");
  const [pinError, setPinError] = useState("");
  const [activePage, setActivePage] = useState("dashboard");
  const [business, setBusiness] = useState(null);
  const [loans, setLoans] = useState([]);
  const [toast, setToast] = useState({ msg: "", type: "ok" });

  const showToast = (msg, type = "ok") => {
    setToast({ msg, type });
    setTimeout(() => setToast({ msg: "", type: "ok" }), 3500);
  };

  useEffect(() => { loadBusiness(); }, []);

  const loadBusiness = async () => {
    const { data } = await supabase.from("business").select("*").eq("id", 1).single();
    setBusiness(data || { name:"Sonkhela Soft Loans", tagline:"Simple Loans. Real People.", phone:"", email:"", address:"", admin_pin:"1234", logo:null, signature:null });
    setScreen("login");
  };

  const loadLoans = async () => {
    const { data } = await supabase.from("loans").select("*").order("created_at", { ascending: false });
    if (data) setLoans(data);
  };

  const handlePinKey = (k) => {
    if (k === "del") { setPinInput(p => p.slice(0,-1)); setPinError(""); return; }
    if (pinInput.length >= 6) return;
    const next = pinInput + k;
    setPinInput(next);
    const pin = business?.admin_pin || "1234";
    if (next.length >= pin.length) {
      if (next === pin) { setTimeout(async () => { await loadLoans(); setScreen("app"); setPinInput(""); }, 200); }
      else { setTimeout(() => { setPinError("Wrong PIN. Try again."); setPinInput(""); }, 300); }
    }
  };

  if (screen === "loading") return (
    <><style>{ADMIN_STYLES}</style>
    <div className="loading-screen"><div className="loading-spinner"/><div className="loading-text">Loading Sonkhela Soft Loans...</div></div></>
  );

  if (screen === "login") return (
    <><style>{ADMIN_STYLES}</style>
    <div className="login-shell">
      <div className="login-box fade-up">
        <div className="login-logo">{business?.logo ? <img src={business.logo} alt="logo"/> : (business?.name||"S")[0]}</div>
        <div className="login-title">{business?.name}</div>
        <div className="login-sub">Admin Login — Enter your PIN</div>
        <div className="pin-dots">
          {Array.from({length:(business?.admin_pin||"1234").length}).map((_,i) => (
            <div key={i} className={`pin-dot ${i<pinInput.length?"filled":""}`}/>
          ))}
        </div>
        {pinError && <div className="pin-error">{pinError}</div>}
        <div className="pin-grid">
          {["1","2","3","4","5","6","7","8","9","del","0"].map(k => (
            <button key={k} className={`pin-key ${k==="0"?"zero":""} ${k==="del"?"del":""}`} onClick={() => handlePinKey(k)}>
              {k==="del"?"⌫":k}
            </button>
          ))}
        </div>
      </div>
    </div></>
  );

  return (
    <><style>{ADMIN_STYLES}</style>
    {toast.msg && <div className={`toast ${toast.type==="error"?"error":toast.type==="info"?"info":""}`}>{toast.msg}</div>}
    <div className="shell">
      <aside className="sidebar">
        <div className="sidebar-brand">
          <div className="brand-logo">{business?.logo?<img src={business.logo} alt=""/>:(business?.name||"S")[0]}</div>
          <div className="brand-name">{business?.name}</div>
          <div className="brand-tag">{business?.tagline}</div>
        </div>
        <nav className="sidebar-nav">
          {[{id:"dashboard",icon:"📊",label:"Dashboard"},{id:"clients",icon:"👥",label:"Clients"},{id:"settings",icon:"⚙️",label:"Settings"}].map(item => (
            <button key={item.id} className={`nav-item ${activePage===item.id?"active":""}`} onClick={() => setActivePage(item.id)}>
              <span style={{width:20,textAlign:"center"}}>{item.icon}</span>{item.label}
            </button>
          ))}
        </nav>
        <div className="sidebar-footer">
          <button className="logout-btn" onClick={() => {setScreen("login");setPinInput("");}}>🔒 Lock / Logout</button>
        </div>
      </aside>
      <div className="main">
        <div className="topbar">
          <div className="topbar-title">{activePage==="dashboard"?"Dashboard":activePage==="clients"?"Clients":"Settings"}</div>
          <div className="topbar-date">{new Date().toLocaleDateString("en-GB",{weekday:"long",day:"numeric",month:"long",year:"numeric"})}</div>
        </div>
        <div className="page fade-up" key={activePage}>
          {activePage==="dashboard" && <Dashboard loans={loans} setActivePage={setActivePage} showToast={showToast}/>}
          {activePage==="clients" && <ClientsPage loans={loans} setLoans={setLoans} showToast={showToast} business={business}/>}
          {activePage==="settings" && <SettingsPage business={business} setBusiness={setBusiness} showToast={showToast}/>}
        </div>
      </div>
    </div></>
  );
}

function CopyLinkBtn({ loanId, showToast }) {
  return (
    <button className="btn btn-link btn-xs" onClick={() => {
      navigator.clipboard.writeText(`${window.location.origin}/agreement/${loanId}`)
        .then(() => showToast("✓ Client link copied!"));
    }}>🔗 Copy Link</button>
  );
}

function Dashboard({ loans, setActivePage, showToast }) {
  const totalIssued   = loans.reduce((s,l) => s+Number(l.amount), 0);
  const totalInterest = loans.reduce((s,l) => s+(Number(l.amount)*Number(l.interest_rate||0)/100), 0);
  const salary        = totalInterest * 0.30;
  const active  = loans.filter(l => l.status==="active" && !isOverdue(l)).length;
  const overdue = loans.filter(isOverdue).length;
  const settled = loans.filter(l => l.status==="settled").length;

  return (
    <>
      <div style={{marginBottom:"1.75rem"}}>
        <h1 style={{fontFamily:"'Lora',serif",fontSize:"1.6rem",fontWeight:700,marginBottom:4}}>Welcome back 👋</h1>
        <p style={{color:"#6b7c72",fontSize:"0.875rem"}}>Here's what's happening with your loan portfolio today.</p>
      </div>
      <div className="stats-row">
        <div className="stat-card">
          <div className="stat-label">Total Issued</div>
          <div className="stat-value sm">{fmt(totalIssued)}</div>
          <div className="stat-sub">{loans.length} agreement{loans.length!==1?"s":""}</div>
        </div>
        <div className="stat-card purple">
          <div className="stat-label">Total Interest Expected</div>
          <div className="stat-value sm">{fmt(totalInterest)}</div>
          <div className="stat-sub">from all issued loans</div>
        </div>
        <div className="stat-card teal">
          <div className="stat-label">💼 Salary (30% of Interest)</div>
          <div className="stat-value sm">{fmt(salary)}</div>
          <div className="stat-sub">your estimated earnings</div>
        </div>
      </div>
      <div className="stats-row" style={{marginBottom:"2rem"}}>
        <div className="stat-card blue">
          <div className="stat-label">Active Loans</div>
          <div className="stat-value">{active}</div>
          <div className="stat-sub">in good standing</div>
        </div>
        <div className="stat-card amber">
          <div className="stat-label">Overdue</div>
          <div className="stat-value" style={{color:overdue>0?"#d97706":"inherit"}}>{overdue}</div>
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
            <thead><tr><th>Loan ID</th><th>Client</th><th>Amount</th><th>Due Date</th><th>Status</th><th>Client Link</th></tr></thead>
            <tbody>
              {loans.length===0 && <tr><td colSpan={6} style={{textAlign:"center",color:"#6b7c72",padding:"2rem"}}>No loans yet. Add your first client!</td></tr>}
              {loans.slice(0,6).map(loan => {
                const over = isOverdue(loan);
                return (
                  <tr key={loan.id}>
                    <td style={{fontWeight:800,fontFamily:"'Lora',serif",fontSize:"0.82rem"}}>{loan.id}</td>
                    <td style={{fontWeight:700}}>{loan.client_name}</td>
                    <td style={{fontWeight:700}}>{fmt(loan.amount)}</td>
                    <td style={{color:over?"#c0392b":"inherit",fontWeight:over?800:400}}>{fmtDate(loan.due_date)}</td>
                    <td><span className={`badge badge-${over?"overdue":loan.status}`}>{over?"overdue":loan.status}</span></td>
                    <td><CopyLinkBtn loanId={loan.id} showToast={showToast}/></td>
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

function ClientsPage({ loans, setLoans, showToast, business }) {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [showModal, setShowModal] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [saving, setSaving] = useState(false);
  const [sendingEmail, setSendingEmail] = useState(null);

  const filtered = loans.filter(l => {
    const s = ((l.client_name||"")+l.id).toLowerCase().includes(search.toLowerCase());
    if (filter==="all") return s;
    if (filter==="overdue") return s && isOverdue(l);
    return s && l.status===filter && !isOverdue(l);
  });

  const deleteLoan = async (id) => {
    if (!confirm("Delete this loan agreement permanently?")) return;
    const { error } = await supabase.from("loans").delete().eq("id", id);
    if (error) { showToast("Failed to delete.", "error"); return; }
    setLoans(p => p.filter(l => l.id!==id));
    showToast("Agreement deleted.");
  };

  const updateStatus = async (id, status) => {
    const { error } = await supabase.from("loans").update({ status }).eq("id", id);
    if (error) { showToast("Failed to update.", "error"); return; }
    setLoans(p => p.map(l => l.id===id ? {...l,status} : l));
  };

  const handleSave = async (data) => {
    setSaving(true);
    if (editTarget) {
      const { error } = await supabase.from("loans").update(data).eq("id", editTarget.id);
      if (error) { showToast("Failed to save.", "error"); setSaving(false); return; }
      setLoans(p => p.map(l => l.id===editTarget.id ? {...l,...data} : l));
      showToast("Agreement updated! ✓");
    } else {
      const newLoan = { ...data, id: genId() };
      const { error } = await supabase.from("loans").insert(newLoan);
      if (error) { showToast("Failed to create.", "error"); setSaving(false); return; }
      setLoans(p => [newLoan,...p]);
      showToast("Agreement created! ✓");
    }
    setSaving(false); setShowModal(false);
  };

  const sendReminder = async (loan) => {
    if (!loan.client_email) { showToast("This client has no email address.", "error"); return; }
    setSendingEmail(loan.id);
    try {
      const res = await fetch("/api/send-reminder", {
        method:"POST", headers:{"Content-Type":"application/json"},
        body: JSON.stringify({
          clientEmail: loan.client_email, clientName: loan.client_name,
          loanId: loan.id, dueDate: loan.due_date,
          amount: loan.amount, interestRate: loan.interest_rate,
          businessName: business?.name, businessPhone: business?.phone, businessEmail: business?.email,
        }),
      });
      const d = await res.json();
      if (d.success) showToast(`✉️ Reminder sent to ${loan.client_email}`);
      else showToast("Email failed. Check Vercel env variables.", "error");
    } catch { showToast("Email service unavailable.", "error"); }
    setSendingEmail(null);
  };

  return (
    <>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-end",marginBottom:"1.75rem",flexWrap:"wrap",gap:"1rem"}}>
        <div>
          <h1 style={{fontFamily:"'Lora',serif",fontSize:"1.6rem",fontWeight:700,marginBottom:4}}>Clients</h1>
          <p style={{color:"#6b7c72",fontSize:"0.875rem"}}>{loans.length} agreement{loans.length!==1?"s":""} on record</p>
        </div>
        <button className="btn btn-green" onClick={() => { setEditTarget(null); setShowModal(true); }}>+ New Agreement</button>
      </div>
      <div style={{display:"flex",gap:"0.75rem",marginBottom:"1rem",flexWrap:"wrap"}}>
        <input style={{flex:1,minWidth:200}} placeholder="🔍 Search by name or loan ID..." value={search} onChange={e => setSearch(e.target.value)}/>
        <select value={filter} onChange={e => setFilter(e.target.value)} style={{minWidth:150}}>
          <option value="all">All Statuses</option>
          <option value="active">Active</option>
          <option value="overdue">Overdue</option>
          <option value="settled">Settled</option>
        </select>
      </div>
      <div className="card">
        <div className="tbl-wrap">
          <table>
            <thead><tr><th>Loan ID</th><th>Client</th><th>Amount</th><th>Due Date</th><th>Collateral</th><th>Status</th><th>Link</th><th>Actions</th></tr></thead>
            <tbody>
              {filtered.length===0 && <tr><td colSpan={8} style={{textAlign:"center",color:"#6b7c72",padding:"2.5rem"}}>No agreements found.</td></tr>}
              {filtered.map(loan => {
                const over = isOverdue(loan);
                const dueSoon = !over && loan.status==="active" && new Date(loan.due_date+"T00:00:00") <= new Date(Date.now()+3*86400000);
                return (
                  <tr key={loan.id}>
                    <td style={{fontWeight:800,fontFamily:"'Lora',serif",fontSize:"0.82rem"}}>{loan.id}</td>
                    <td>
                      <div style={{fontWeight:700}}>{loan.client_name}</div>
                      {loan.client_phone && <div style={{fontSize:"0.72rem",color:"#6b7c72"}}>{loan.client_phone}</div>}
                      {loan.client_email && <div style={{fontSize:"0.7rem",color:"#2563eb"}}>✉️ {loan.client_email}</div>}
                    </td>
                    <td style={{fontWeight:700}}>{fmt(loan.amount)}</td>
                    <td>
                      <div style={{color:over?"#c0392b":"inherit",fontWeight:over?800:400}}>{fmtDate(loan.due_date)}</div>
                      {dueSoon && <div style={{fontSize:"0.68rem",color:"#d97706",fontWeight:800}}>⚠️ Due soon</div>}
                    </td>
                    <td style={{fontSize:"0.78rem",maxWidth:130,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{loan.collateral}</td>
                    <td>
                      <select value={over?"overdue":loan.status} onChange={e => updateStatus(loan.id,e.target.value)} style={{padding:"5px 8px",fontSize:"0.78rem",minWidth:100}}>
                        <option value="active">Active</option>
                        <option value="settled">Settled</option>
                        <option value="overdue">Overdue</option>
                      </select>
                    </td>
                    <td><CopyLinkBtn loanId={loan.id} showToast={showToast}/></td>
                    <td>
                      <div style={{display:"flex",gap:4,flexWrap:"wrap"}}>
                        <button className="btn btn-ghost btn-xs" onClick={() => { setEditTarget(loan); setShowModal(true); }}>Edit</button>
                        {loan.client_email && (
                          <button className="btn btn-blue btn-xs" disabled={sendingEmail===loan.id} onClick={() => sendReminder(loan)} title={`Remind ${loan.client_email}`}>
                            {sendingEmail===loan.id?"...":"📧"}
                          </button>
                        )}
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
      {showModal && <LoanModal loan={editTarget} saving={saving} onClose={() => setShowModal(false)} onSave={handleSave}/>}
    </>
  );
}

function LoanModal({ loan, onClose, onSave, saving }) {
  const blank = {
    client_name:"", client_phone:"", client_nrc:"", client_email:"",
    amount:"", interest_rate:"",
    processing_date: new Date().toISOString().slice(0,10),
    due_date:"", repayment:"monthly", collateral:"", collateral_value:"",
    status:"active",
    terms:"The borrower agrees to repay the full loan amount plus interest by the due date. The collateral will be held by the lender until full repayment. Failure to repay by the due date may result in forfeiture of the stated collateral.",
  };
  const [f, setF] = useState(loan || blank);
  const set = (k,v) => setF(p => ({...p,[k]:v}));
  return (
    <div className="modal-backdrop" onClick={e => e.target===e.currentTarget && onClose()}>
      <div className="modal fade-up">
        <div className="modal-head">
          <div className="modal-title">{loan?"Edit Agreement":"New Loan Agreement"}</div>
          <button className="close-btn" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">
          <p className="section-sub">👤 Client Info</p>
          <div className="form-grid" style={{marginBottom:"1.25rem"}}>
            <div className="form-group"><label>Full Name *</label><input value={f.client_name} onChange={e => set("client_name",e.target.value)} placeholder="e.g. Chanda Mutale"/></div>
            <div className="form-group"><label>Phone Number</label><input value={f.client_phone} onChange={e => set("client_phone",e.target.value)} placeholder="+260 97..."/></div>
            <div className="form-group"><label>NRC / National ID</label><input value={f.client_nrc} onChange={e => set("client_nrc",e.target.value)} placeholder="234567/10/1"/></div>
            <div className="form-group">
              <label>Email <span style={{color:"#9ca3af",fontWeight:400,textTransform:"none",fontSize:"0.68rem"}}>(optional — for reminders)</span></label>
              <input type="email" value={f.client_email||""} onChange={e => set("client_email",e.target.value)} placeholder="client@example.com"/>
            </div>
          </div>
          <p className="section-sub">💰 Loan Details</p>
          <div className="form-grid" style={{marginBottom:"1.25rem"}}>
            <div className="form-group"><label>Loan Amount (K) *</label><input type="number" value={f.amount} onChange={e => set("amount",e.target.value)} placeholder="5000"/></div>
            <div className="form-group"><label>Interest Rate (%)</label><input type="number" value={f.interest_rate} onChange={e => set("interest_rate",e.target.value)} placeholder="20"/></div>
            <div className="form-group"><label>Processing Date</label><input type="date" value={f.processing_date} onChange={e => set("processing_date",e.target.value)}/></div>
            <div className="form-group"><label>Due Date *</label><input type="date" value={f.due_date} onChange={e => set("due_date",e.target.value)}/></div>
            <div className="form-group full"><label>Repayment Schedule</label>
              <select value={f.repayment} onChange={e => set("repayment",e.target.value)}>
                <option value="weekly">Weekly</option><option value="monthly">Monthly</option><option value="lump-sum">Lump Sum</option>
              </select>
            </div>
          </div>
          <p className="section-sub">🔒 Collateral</p>
          <div className="form-grid" style={{marginBottom:"1.25rem"}}>
            <div className="form-group full"><label>Item / Description *</label><input value={f.collateral} onChange={e => set("collateral",e.target.value)} placeholder="e.g. Samsung TV – Serial No. XYZ123"/></div>
            <div className="form-group"><label>Collateral Value (K)</label><input type="number" value={f.collateral_value} onChange={e => set("collateral_value",e.target.value)} placeholder="10000"/></div>
          </div>
          <p className="section-sub">📋 Terms & Conditions</p>
          <div className="form-group"><textarea value={f.terms} onChange={e => set("terms",e.target.value)} rows={4}/></div>
        </div>
        <div className="modal-foot">
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn btn-green" disabled={saving} onClick={() => {
            if (!f.client_name||!f.amount||!f.due_date) { alert("Please fill: Name, Amount, Due Date"); return; }
            onSave(f);
          }}>{saving?"Saving...":loan?"Save Changes":"✓ Create Agreement"}</button>
        </div>
      </div>
    </div>
  );
}

function SettingsPage({ business, setBusiness, showToast }) {
  const [f, setF] = useState({...business});
  const [saving, setSaving] = useState(false);
  const set = (k,v) => setF(p => ({...p,[k]:v}));

  const uploadImage = (key, e) => {
    const file = e.target.files[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => set(key, ev.target.result);
    reader.readAsDataURL(file);
  };

  const handleSave = async () => {
    setSaving(true);
    const { error } = await supabase.from("business").update({
      name:f.name, tagline:f.tagline, phone:f.phone, email:f.email,
      address:f.address, admin_pin:f.admin_pin, logo:f.logo, signature:f.signature,
    }).eq("id",1);
    setSaving(false);
    if (error) { showToast("Failed to save.","error"); return; }
    setBusiness(f); showToast("Settings saved! ✓");
  };

  return (
    <>
      <div style={{marginBottom:"1.75rem"}}>
        <h1 style={{fontFamily:"'Lora',serif",fontSize:"1.6rem",fontWeight:700,marginBottom:4}}>Settings</h1>
        <p style={{color:"#6b7c72",fontSize:"0.875rem"}}>Manage your profile, signature and security</p>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"1.5rem"}}>
        <div className="card">
          <div className="card-head"><div className="card-title">🏢 Business Profile</div></div>
          <div className="card-body" style={{display:"flex",flexDirection:"column",gap:"1rem"}}>
            <div className="form-group">
              <label>Business Logo</label>
              <div className="upload-area" onClick={() => document.getElementById("logoUpload").click()}>
                {f.logo?<img className="upload-preview-round" src={f.logo} alt="logo"/>:<div style={{fontSize:"2rem",marginBottom:6}}>🏢</div>}
                <div style={{fontSize:"0.78rem",color:"#6b7c72",fontWeight:700}}>Click to upload logo</div>
                <div style={{fontSize:"0.68rem",color:"#6b7c72"}}>PNG or JPG, square preferred</div>
              </div>
              <input id="logoUpload" type="file" accept="image/*" style={{display:"none"}} onChange={e => uploadImage("logo",e)}/>
            </div>
            <div className="form-group"><label>Business Name</label><input value={f.name||""} onChange={e => set("name",e.target.value)}/></div>
            <div className="form-group"><label>Tagline</label><input value={f.tagline||""} onChange={e => set("tagline",e.target.value)}/></div>
            <div className="form-group"><label>Phone</label><input value={f.phone||""} onChange={e => set("phone",e.target.value)}/></div>
            <div className="form-group"><label>Email</label><input value={f.email||""} onChange={e => set("email",e.target.value)}/></div>
            <div className="form-group"><label>Address</label><input value={f.address||""} onChange={e => set("address",e.target.value)}/></div>
          </div>
        </div>
        <div style={{display:"flex",flexDirection:"column",gap:"1.5rem"}}>
          <div className="card">
            <div className="card-head"><div className="card-title">✍️ Your Signature</div></div>
            <div className="card-body">
              <p style={{fontSize:"0.82rem",color:"#6b7c72",marginBottom:"1rem",lineHeight:1.65}}>
                Upload a photo or scan of your signature. It will appear on every PDF agreement — only your signature will be shown, not the client's.
              </p>
              <div className="upload-area" onClick={() => document.getElementById("sigUpload").click()}>
                {f.signature?<img className="upload-preview" src={f.signature} alt="sig"/>:<div style={{fontSize:"2rem",marginBottom:6}}>✍️</div>}
                <div style={{fontSize:"0.78rem",color:"#6b7c72",fontWeight:700}}>Click to upload signature</div>
                <div style={{fontSize:"0.68rem",color:"#6b7c72"}}>PNG with transparent background works best</div>
              </div>
              <input id="sigUpload" type="file" accept="image/*" style={{display:"none"}} onChange={e => uploadImage("signature",e)}/>
              {f.signature && <button className="btn btn-ghost btn-sm" style={{marginTop:"0.75rem",width:"100%"}} onClick={() => set("signature",null)}>Remove Signature</button>}
            </div>
          </div>
          <div className="card">
            <div className="card-head"><div className="card-title">📧 Email Reminders Setup</div></div>
            <div className="card-body">
              <p style={{fontSize:"0.82rem",color:"#6b7c72",lineHeight:1.7,marginBottom:"0.75rem"}}>
                To send email reminders, add these to Vercel → Settings → Environment Variables, then redeploy:
              </p>
              <div style={{background:"#f0faf4",borderRadius:8,padding:"12px 14px",fontSize:"0.8rem",lineHeight:2.2,border:"1px solid #d4e8db"}}>
                <div><code style={{fontWeight:800,color:"#145f39"}}>GMAIL_USER</code> = your Gmail address</div>
                <div><code style={{fontWeight:800,color:"#145f39"}}>GMAIL_PASS</code> = your Gmail App Password</div>
              </div>
              <a href="https://support.google.com/accounts/answer/185833" target="_blank" rel="noreferrer"
                style={{fontSize:"0.78rem",color:"#1a7a4a",fontWeight:800,display:"block",marginTop:"0.75rem"}}>
                → How to create a Gmail App Password ↗
              </a>
            </div>
          </div>
          <div className="card">
            <div className="card-head"><div className="card-title">🔐 Security</div></div>
            <div className="card-body">
              <div className="form-group">
                <label>Admin PIN</label>
                <input type="password" maxLength={6} value={f.admin_pin||""} onChange={e => set("admin_pin",e.target.value)} placeholder="4–6 digits"/>
                <span style={{fontSize:"0.7rem",color:"#6b7c72"}}>Only you should know this PIN.</span>
              </div>
            </div>
          </div>
          <button className="btn btn-green" style={{width:"100%",padding:"14px"}} onClick={handleSave} disabled={saving}>
            {saving?"Saving...":"💾 Save All Settings"}
          </button>
        </div>
      </div>
    </>
  );
}
