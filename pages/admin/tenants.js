// Super-admin panel: manage the businesses renting the Sonkhela system.
// URL: admin.sonkhela.com/admin/tenants  (Sonkhela owner logins only)
import { useState, useEffect, useMemo } from "react";
import Head from "next/head";
import { supabase, authFetch } from "../shared";

const STATUS = {
  trial:     { label: "Trial",     bg: "#e0ecff", fg: "#1d4ed8" },
  active:    { label: "Active",    bg: "#d1fae5", fg: "#065f46" },
  grace:     { label: "Grace",     bg: "#fef3c7", fg: "#92400e" },
  suspended: { label: "Suspended", bg: "#fee2e2", fg: "#991b1b" },
  cancelled: { label: "Cancelled", bg: "#e5e7eb", fg: "#374151" },
};

const fmtK = (n) => "K " + Number(n || 0).toLocaleString("en", { maximumFractionDigits: 0 });
const fmtDay = (d) => (d ? new Date(d + "T00:00:00").toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "No end date");

const EMPTY_FORM = { business_name: "", slug: "", contact_name: "", contact_phone: "", owner_email: "", package_id: 1, trial_days: 14 };

export default function TenantsPanel() {
  const [state, setState] = useState({ loading: true, error: "", tenants: [], packages: [] });
  const [prices, setPrices] = useState({});
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [busy, setBusy] = useState("");
  const [creds, setCreds] = useState(null); // login details to hand to a client
  const [setup, setSetup] = useState(null); // portal setup steps for a client
  const [smsFor, setSmsFor] = useState(null); // client whose SMS account is being edited
  const [toast, setToast] = useState("");
  const [filter, setFilter] = useState("all");

  const flash = (m) => { setToast(m); setTimeout(() => setToast(""), 3500); };

  async function load() {
    const res = await authFetch("/api/platform/tenants");
    const data = await res.json().catch(() => ({}));
    if (!res.ok) { setState({ loading: false, error: data.error || "Could not load clients.", tenants: [], packages: [] }); return; }
    setState({ loading: false, error: "", tenants: data.tenants, packages: data.packages });
    setPrices(Object.fromEntries(data.packages.map((p) => [p.id, p.monthly_price])));
  }

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getSession();
      if (!data?.session) { window.location.href = "/"; return; }
      load();
    })();
  }, []);

  async function act(body, okMsg) {
    setBusy(body.tenantId || body.action);
    const res = await authFetch("/api/platform/tenant-action", {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    setBusy("");
    if (!res.ok) { flash(data.error || "Something went wrong."); return null; }
    if (okMsg) flash(okMsg);
    await load();
    return data;
  }

  async function createClient(e) {
    e.preventDefault();
    setBusy("create");
    const res = await authFetch("/api/platform/tenants", {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form),
    });
    const data = await res.json().catch(() => ({}));
    setBusy("");
    if (!res.ok) { flash(data.error || "Could not create client."); return; }
    setCreds({ business: form.business_name, slug: data.slug, ...data.login });
    setForm(EMPTY_FORM);
    setShowForm(false);
    await load();
  }

  const pkgById = useMemo(() => Object.fromEntries(state.packages.map((p) => [p.id, p])), [state.packages]);
  const clients = state.tenants.filter((t) => !t.is_sonkhela);
  const shown = clients.filter((t) => filter === "all" || t.status === filter || (filter === "expiring" && t.days_left !== null && t.days_left <= 7 && ["active", "grace", "trial"].includes(t.status)));
  const stats = {
    total: clients.length,
    active: clients.filter((t) => t.status === "active").length,
    trial: clients.filter((t) => t.status === "trial").length,
    expiring: clients.filter((t) => t.days_left !== null && t.days_left <= 7 && ["active", "grace", "trial"].includes(t.status)).length,
    mrr: clients.filter((t) => t.status === "active").reduce((s, t) => s + Number(pkgById[t.package_id]?.monthly_price || 0), 0),
  };

  if (state.loading) return <Shell><p className="muted">Loading clients…</p></Shell>;
  if (state.error) return <Shell><div className="card"><h2>Not available</h2><p className="muted">{state.error}</p><a href="/" className="btn">Back to dashboard</a></div></Shell>;

  return (
    <Shell>
      {toast && <div className="toast">{toast}</div>}

      {smsFor && (
        <div className="overlay" onClick={() => setSmsFor(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <SmsForm t={smsFor} act={act} close={() => setSmsFor(null)} />
          </div>
        </div>
      )}

      {setup && (
        <div className="overlay" onClick={() => setSetup(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>Portal setup: {setup.business_name}</h2>
            <SetupSteps slug={setup.slug} flash={flash} />
            <button className="btn ghost" onClick={() => setSetup(null)}>Close</button>
          </div>
        </div>
      )}

      {creds && (
        <div className="overlay" onClick={() => setCreds(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>Login details for {creds.business}</h2>
            <p className="muted">Send these to the client. The password is shown only once; they can change it under Settings after logging in.</p>
            <pre className="creds">{`Sonkhela Loan System\nLogin: ${creds.url}\nEmail: ${creds.email}\nPassword: ${creds.password}`}</pre>
            <div className="row">
              <button className="btn" onClick={() => { navigator.clipboard?.writeText(`Sonkhela Loan System\nLogin: ${creds.url}\nEmail: ${creds.email}\nPassword: ${creds.password}`); flash("Copied"); }}>Copy</button>
              <button className="btn ghost" onClick={() => setCreds(null)}>Done</button>
            </div>
            {creds.slug && <><hr /><h2>Before you send them: set up the portal</h2><SetupSteps slug={creds.slug} flash={flash} /></>}
          </div>
        </div>
      )}

      <section className="stats">
        <Stat label="Clients" value={stats.total} />
        <Stat label="Paying" value={stats.active} />
        <Stat label="On trial" value={stats.trial} />
        <Stat label="Ending in 7 days" value={stats.expiring} warn={stats.expiring > 0} />
        <Stat label="Monthly income" value={fmtK(stats.mrr)} />
      </section>

      <section className="card">
        <div className="card-head">
          <h2>Packages</h2>
          <button className="btn small" disabled={busy === "set_prices"} onClick={() => act({ action: "set_prices", prices }, "Prices saved")}>Save prices</button>
        </div>
        <div className="pkgs">
          {state.packages.map((p) => (
            <div key={p.id} className="pkg">
              <div className="pkg-name">{p.name}</div>
              <ul>
                <li>Loans, clients, PDFs, dashboard</li>
                <li className={p.can_sms_reminders ? "" : "off"}>Automatic SMS reminders</li>
                <li className={p.can_custom_messaging ? "" : "off"}>Custom messaging</li>
                <li className={p.can_weekly_quotes ? "" : "off"}>Weekly AI quotes</li>
              </ul>
              <label className="price">K
                <input type="number" min="0" value={prices[p.id] ?? 0} onChange={(e) => setPrices({ ...prices, [p.id]: e.target.value })} />
                <span className="muted">/ month</span>
              </label>
            </div>
          ))}
        </div>
      </section>

      <section className="card">
        <div className="card-head">
          <h2>Clients</h2>
          <div className="row">
            <select value={filter} onChange={(e) => setFilter(e.target.value)}>
              <option value="all">All</option>
              <option value="expiring">Ending soon</option>
              {Object.entries(STATUS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
            </select>
            <button className="btn" onClick={() => setShowForm(!showForm)}>{showForm ? "Close" : "+ New client"}</button>
          </div>
        </div>

        {showForm && (
          <form className="form" onSubmit={createClient}>
            <Field label="Business name" required>
              <input required value={form.business_name} onChange={(e) => {
                const business_name = e.target.value;
                const auto = business_name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 30);
                setForm((f) => ({ ...f, business_name, slug: f.slugEdited ? f.slug : auto }));
              }} />
            </Field>
            <Field label="Portal name" hint={`${form.slug || "name"}.sonkhela.com`} required>
              <input required value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value.toLowerCase(), slugEdited: true })} />
            </Field>
            <Field label="Owner's login email" required>
              <input required type="email" value={form.owner_email} onChange={(e) => setForm({ ...form, owner_email: e.target.value })} />
            </Field>
            <Field label="Contact person">
              <input value={form.contact_name} onChange={(e) => setForm({ ...form, contact_name: e.target.value })} />
            </Field>
            <Field label="Phone">
              <input value={form.contact_phone} onChange={(e) => setForm({ ...form, contact_phone: e.target.value })} />
            </Field>
            <Field label="Package">
              <select value={form.package_id} onChange={(e) => setForm({ ...form, package_id: Number(e.target.value) })}>
                {state.packages.map((p) => <option key={p.id} value={p.id}>{p.name} ({fmtK(p.monthly_price)})</option>)}
              </select>
            </Field>
            <Field label="Free trial (days)">
              <input type="number" min="0" max="90" value={form.trial_days} onChange={(e) => setForm({ ...form, trial_days: e.target.value })} />
            </Field>
            <div className="form-actions">
              <button className="btn" disabled={busy === "create"}>{busy === "create" ? "Creating…" : "Create client"}</button>
            </div>
          </form>
        )}

        {shown.length === 0 ? (
          <p className="muted empty">{clients.length === 0 ? "No clients yet. Add your first one with + New client." : "No clients match this filter."}</p>
        ) : (
          <div className="list">
            {shown.map((t) => (
              <TenantRow key={t.id} t={t} packages={state.packages} busy={busy === t.id} act={act} setCreds={setCreds} setSetup={setSetup} setSmsFor={setSmsFor} />
            ))}
          </div>
        )}
      </section>
    </Shell>
  );
}

function TenantRow({ t, packages, busy, act, setCreds, setSetup, setSmsFor }) {
  const [days, setDays] = useState(30);
  const s = STATUS[t.status] || STATUS.cancelled;
  const owner = t.users.find((u) => u.role === "owner");
  const ending = t.days_left === null ? "" : t.days_left < 0 ? `ended ${-t.days_left} day${t.days_left === -1 ? "" : "s"} ago` : t.days_left === 0 ? "ends today" : `${t.days_left} day${t.days_left === 1 ? "" : "s"} left`;

  return (
    <div className={`tenant ${busy ? "is-busy" : ""}`}>
      <div className="t-main">
        <div className="t-title">
          <strong>{t.business_name}</strong>
          <span className="pill" style={{ background: s.bg, color: s.fg }}>{s.label}</span>
        </div>
        <div className="muted small"><a href={`https://${t.slug}.sonkhela.com`} target="_blank" rel="noreferrer">{t.slug}.sonkhela.com</a> · <a href={`https://${t.slug}.sonkhela.com/apply`} target="_blank" rel="noreferrer">apply page</a> · {t.loan_count} loan{t.loan_count === 1 ? "" : "s"}</div>
        <div className="muted small">{owner?.email || "no login"}{t.contact_name ? ` · ${t.contact_name}` : ""}{t.contact_phone ? ` · ${t.contact_phone}` : ""}</div>
        <div className={`small ${t.days_left !== null && t.days_left <= 7 ? "warn" : "muted"}`}>
          {t.status === "trial" ? "Trial" : ["suspended", "cancelled"].includes(t.status) ? "Access" : "Paid"} until {fmtDay(t.subscription_end)}{ending ? ` (${ending})` : ""}
        </div>
      </div>

      <div className="t-actions">
        <select value={t.package_id} disabled={busy} onChange={(e) => act({ action: "set_package", tenantId: t.id, package_id: Number(e.target.value) }, "Package changed")}>
          {packages.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
        <div className="row tight">
          <input type="number" min="1" max="400" value={days} onChange={(e) => setDays(e.target.value)} className="days" aria-label="days" />
          <button className="btn small" disabled={busy} onClick={() => {
            if (confirm(`Record payment and add ${days} days for ${t.business_name}?`)) act({ action: "activate", tenantId: t.id, days: Number(days) }, `Activated: ${days} days added`);
          }}>Add days</button>
        </div>
        <div className="row tight">
          {["suspended", "cancelled"].includes(t.status) ? (
            <button className="btn small ghost" disabled={busy} onClick={() => act({ action: "set_status", tenantId: t.id, status: "active" }, "Reactivated")}>Reactivate</button>
          ) : (
            <button className="btn small danger" disabled={busy} onClick={() => {
              if (confirm(`Suspend ${t.business_name}? Their data is kept.`)) act({ action: "set_status", tenantId: t.id, status: "suspended" }, "Suspended");
            }}>Suspend</button>
          )}
          <button className="btn small ghost" disabled={busy} onClick={async () => {
            if (!confirm(`Reset the login password for ${t.business_name}?`)) return;
            const r = await act({ action: "reset_password", tenantId: t.id });
            if (r?.login) setCreds({ business: t.business_name, ...r.login });
          }}>Reset password</button>
          <button className="btn small ghost" onClick={() => setSetup(t)}>Portal setup</button>
          <button className="btn small ghost" onClick={() => setSmsFor(t)}>{t.sms_connected ? "SMS ✓" : "SMS account"}</button>
          {t.loan_count === 0 && (
            <button className="btn small danger" disabled={busy} onClick={() => {
              if (confirm(`Permanently delete ${t.business_name} and its login? Only possible while it has no loans.`)) act({ action: "delete", tenantId: t.id }, "Client deleted");
            }}>Delete</button>
          )}
        </div>
      </div>
    </div>
  );
}

function SmsForm({ t, act, close }) {
  const [f, setF] = useState({ at_username: t.at_username || "", at_api_key: "", at_sender_id: t.at_sender_id || "" });
  const [saving, setSaving] = useState(false);
  const save = async (e) => {
    e.preventDefault();
    setSaving(true);
    const r = await act({ action: "set_sms", tenantId: t.id, ...f }, "SMS account saved");
    setSaving(false);
    if (r) close();
  };
  return (
    <form onSubmit={save} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <h2>SMS account: {t.business_name}</h2>
      <p className="muted small">
        The client's own Africa's Talking account. Their reminders, weekly tips and custom texts are sent from it,
        using their airtime and sender name. {t.sms_connected ? "Currently connected." : "Not connected yet."}
      </p>
      <label className="field"><span>Username (live, not "sandbox") *</span>
        <input required value={f.at_username} onChange={(e) => setF({ ...f, at_username: e.target.value })} /></label>
      <label className="field"><span>API key {t.sms_connected ? "(leave blank to keep the saved key)" : "*"}</span>
        <input type="password" autoComplete="off" required={!t.sms_connected} value={f.at_api_key} onChange={(e) => setF({ ...f, at_api_key: e.target.value })} /></label>
      <label className="field"><span>Sender ID (optional, must be approved on Africa's Talking)</span>
        <input value={f.at_sender_id} onChange={(e) => setF({ ...f, at_sender_id: e.target.value.toUpperCase() })} placeholder="e.g. RTCREDIT" /></label>
      <div className="row">
        <button className="btn" disabled={saving}>{saving ? "Saving…" : "Save"}</button>
        <button type="button" className="btn ghost" onClick={close}>Cancel</button>
        {t.sms_connected && (
          <button type="button" className="btn danger" onClick={async () => {
            if (confirm(`Disconnect ${t.business_name}'s SMS account? Their texts will stop.`) && await act({ action: "clear_sms", tenantId: t.id }, "SMS account removed")) close();
          }}>Disconnect</button>
        )}
      </div>
    </form>
  );
}

function SetupSteps({ slug, flash }) {
  const host = `${slug}.sonkhela.com`;
  const copy = (text) => { navigator.clipboard?.writeText(text); flash("Copied: " + text); };
  return (
    <ol className="steps">
      <li>
        <b>Vercel:</b> open the admin project (the one serving admin.sonkhela.com), go to <b>Settings &gt; Domains</b>, add{" "}
        <code onClick={() => copy(host)}>{host}</code> and click <b>Add</b>. Vercel then shows a <b>CNAME</b> value. Copy it.
      </li>
      <li>
        <b>Namecheap:</b> Domain List &gt; sonkhela.com &gt; <b>Manage</b> &gt; <b>Advanced DNS</b> &gt; <b>Add new record</b>.
        Type <b>CNAME Record</b>, Host <code onClick={() => copy(slug)}>{slug}</code>, Value = the CNAME from Vercel, TTL Automatic. Click the green tick.
      </li>
      <li>Wait 5 to 30 minutes until Vercel shows <b>Valid Configuration</b> next to the domain.</li>
      <li>
        Then the client logs in at <code onClick={() => copy(`https://${host}`)}>https://{host}</code> and borrowers apply at{" "}
        <code onClick={() => copy(`https://${host}/apply`)}>https://{host}/apply</code>.
      </li>
    </ol>
  );
}

function Stat({ label, value, warn }) {
  return <div className={`stat ${warn ? "warn-bg" : ""}`}><div className="stat-v">{value}</div><div className="stat-l">{label}</div></div>;
}

function Field({ label, hint, required, children }) {
  return <label className="field"><span>{label}{required ? " *" : ""}</span>{children}{hint && <em>{hint}</em>}</label>;
}

function Shell({ children }) {
  return (
    <>
      <Head><title>Clients · Sonkhela Platform</title><meta name="viewport" content="width=device-width, initial-scale=1" /></Head>
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      <div className="wrap">
        <header className="top">
          <div><div className="eyebrow">Sonkhela Platform</div><h1>Client businesses</h1></div>
          <a href="/" className="btn ghost">← Dashboard</a>
        </header>
        {children}
      </div>
    </>
  );
}

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800&family=Lora:wght@700&display=swap');
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
body{font-family:'Nunito',sans-serif;background:#f4fbf6;color:#0d1f14}
.wrap{max-width:1040px;margin:0 auto;padding:24px 16px 64px}
.top{display:flex;justify-content:space-between;align-items:flex-end;gap:12px;margin-bottom:20px}
.eyebrow{font-size:.72rem;font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:#1a7a4a}
h1{font-family:'Lora',serif;font-size:1.6rem}
h2{font-family:'Lora',serif;font-size:1.1rem}
.muted{color:#6b7c72}.small{font-size:.82rem}.warn{color:#b45309;font-weight:700}
.card{background:#fff;border:1px solid #d4e8db;border-radius:14px;padding:18px;margin-bottom:18px}
.card-head{display:flex;justify-content:space-between;align-items:center;gap:10px;margin-bottom:14px;flex-wrap:wrap}
.row{display:flex;gap:8px;align-items:center;flex-wrap:wrap}.row.tight{gap:6px}
.btn{display:inline-flex;align-items:center;justify-content:center;background:#1a7a4a;color:#fff;border:none;border-radius:8px;padding:9px 16px;font:inherit;font-weight:800;font-size:.86rem;cursor:pointer;text-decoration:none;white-space:nowrap}
.btn:hover{background:#145f39}.btn:disabled{opacity:.5;cursor:default}
.btn.small{padding:6px 11px;font-size:.78rem}
.btn.ghost{background:#fff;color:#145f39;border:1px solid #d4e8db}.btn.ghost:hover{background:#f0faf4}
.btn.danger{background:#fff;color:#c0392b;border:1px solid #f3c4bd}.btn.danger:hover{background:#fdf0ee}
input,select{font:inherit;font-size:.88rem;padding:8px 10px;border:1px solid #d4e8db;border-radius:8px;background:#fff;color:#0d1f14;min-width:0}
input:focus,select:focus{outline:2px solid #1a7a4a33;border-color:#1a7a4a}
.stats{display:grid;grid-template-columns:repeat(5,1fr);gap:10px;margin-bottom:18px}
.stat{background:#fff;border:1px solid #d4e8db;border-radius:12px;padding:12px 14px}
.stat.warn-bg{background:#fffbeb;border-color:#fde68a}
.stat-v{font-family:'Lora',serif;font-size:1.35rem;font-weight:700}
.stat-l{font-size:.72rem;font-weight:800;color:#6b7c72;text-transform:uppercase;letter-spacing:.05em}
.pkgs{display:grid;grid-template-columns:repeat(3,1fr);gap:10px}
.pkg{border:1px solid #d4e8db;border-radius:10px;padding:12px;background:#f9fdfb}
.pkg-name{font-weight:800;margin-bottom:6px}
.pkg ul{list-style:none;font-size:.8rem;margin-bottom:10px}
.pkg li{padding:2px 0}.pkg li::before{content:"✓ ";color:#1a7a4a;font-weight:800}
.pkg li.off{color:#a3b0a8;text-decoration:line-through}.pkg li.off::before{content:"– ";color:#a3b0a8}
.price{display:flex;align-items:center;gap:6px;font-weight:800}.price input{width:90px}
.form{display:grid;grid-template-columns:repeat(2,1fr);gap:12px;padding:14px;margin-bottom:14px;background:#f0faf4;border-radius:10px}
.field{display:flex;flex-direction:column;gap:4px;font-size:.78rem;font-weight:800;color:#145f39}
.field em{font-style:normal;font-weight:600;color:#6b7c72}
.form-actions{grid-column:1/-1}
.list{display:flex;flex-direction:column;gap:10px}
.tenant{display:flex;justify-content:space-between;gap:16px;border:1px solid #d4e8db;border-radius:10px;padding:14px}
.tenant.is-busy{opacity:.55;pointer-events:none}
.t-main{display:flex;flex-direction:column;gap:3px;min-width:0}
.t-title{display:flex;align-items:center;gap:8px;flex-wrap:wrap}
.pill{font-size:.68rem;font-weight:800;padding:2px 9px;border-radius:20px;text-transform:uppercase;letter-spacing:.04em}
.t-actions{display:flex;flex-direction:column;gap:6px;align-items:flex-end;flex-shrink:0}
.days{width:64px}
.empty{padding:18px 0;text-align:center}
.toast{position:fixed;bottom:20px;left:50%;transform:translateX(-50%);background:#0d1f14;color:#fff;padding:10px 18px;border-radius:10px;font-weight:700;font-size:.88rem;z-index:30}
.overlay{position:fixed;inset:0;background:#0d1f1499;display:flex;align-items:center;justify-content:center;padding:16px;z-index:20}
.modal{background:#fff;border-radius:14px;padding:20px;max-width:440px;width:100%;display:flex;flex-direction:column;gap:12px}
.steps{padding-left:20px;display:flex;flex-direction:column;gap:8px;font-size:.86rem;line-height:1.5}
.steps code{background:#f0faf4;border:1px solid #d4e8db;border-radius:5px;padding:1px 6px;cursor:pointer;font-size:.82rem;word-break:break-all}
.modal hr{border:none;border-top:1px solid #d4e8db}
.modal{max-height:90vh;overflow:auto}
.t-main a{color:inherit}
.creds{background:#f0faf4;border:1px solid #d4e8db;border-radius:8px;padding:12px;font-size:.85rem;white-space:pre-wrap;word-break:break-all}
@media(max-width:760px){
  .stats{grid-template-columns:repeat(2,1fr)}
  .pkgs,.form{grid-template-columns:1fr}
  .tenant{flex-direction:column}
  .t-actions{align-items:stretch}
  .top{align-items:flex-start}
}
`;
