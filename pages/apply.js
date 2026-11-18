// Public loan application page for a client portal, e.g. copperbelt.sonkhela.com/apply
import { useEffect, useState } from "react";
import Head from "next/head";
import { currentPortalSlug } from "../lib/portal";
import { applyTheme } from "../lib/theme";

const LOAN_TYPES = [
  ["collateral", "Collateral Backed Loan"],
  ["payslip", "Payslip Backed Loan"],
  ["student", "Student Loan"],
  ["marketeer", "Marketeer Loan"],
  ["business", "Business Loan"],
  ["white-book", "White Book Loan"],
];

const EMPTY = {
  fullName: "", phone: "", email: "", nrcNumber: "",
  loanType: "collateral", loanAmount: "", repaymentPeriod: "4",
  collateralDescription: "", collateralImages: [], nrcFront: null, nrcBack: null,
};

// Shrink photos in the browser so uploads are fast on mobile data
function compress(file, maxSide = 1280, quality = 0.75) {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith("image/")) return reject(new Error("Please choose a photo (JPG or PNG)."));
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, maxSide / Math.max(img.width, img.height));
      const c = document.createElement("canvas");
      c.width = Math.round(img.width * scale);
      c.height = Math.round(img.height * scale);
      c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(url);
      resolve(c.toDataURL("image/jpeg", quality));
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("That photo could not be read.")); };
    img.src = url;
  });
}

export default function Apply() {
  const [portal, setPortal] = useState({ loading: true });
  const [f, setF] = useState(EMPTY);
  const [err, setErr] = useState("");
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState(null);

  useEffect(() => {
    const slug = currentPortalSlug();
    if (!slug) { setPortal({ loading: false, missing: true }); return; }
    fetch(`/api/portal?portal=${encodeURIComponent(slug)}`)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((p) => setPortal({ loading: false, ...p }))
      .catch(() => setPortal({ loading: false, missing: true }));
  }, []);

  const set = (k, v) => setF((s) => ({ ...s, [k]: v }));
  const needsCollateral = f.loanType === "collateral" || f.loanType === "white-book";

  async function addPhotos(key, files, multiple) {
    setErr("");
    try {
      const list = await Promise.all([...files].map((file) => compress(file)));
      if (multiple) set(key, [...f[key], ...list].slice(0, 4));
      else set(key, list[0] || null);
    } catch (e) { setErr(e.message); }
  }

  async function submit(e) {
    e.preventDefault();
    setErr("");
    if (needsCollateral && f.collateralImages.length === 0) { setErr("Please add at least one photo of your collateral."); return; }
    setSending(true);
    try {
      const res = await fetch("/api/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...f, portal: currentPortalSlug() }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Could not submit. Please try again.");
      setDone(data);
      window.scrollTo(0, 0);
    } catch (e2) {
      setErr(e2.message);
    }
    setSending(false);
  }

  const name = portal.name || "Loan Application";

  return (
    <>
      <Head>
        <title>{portal.name ? `Apply for a loan · ${portal.name}` : "Apply for a loan"}</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>
      <style dangerouslySetInnerHTML={{ __html: applyTheme(CSS, portal.theme) }} />
      <div className="page">
        <header className="brand">
          <div className="logo">{portal.logo ? <img src={portal.logo} alt="" /> : (portal.name || "?").slice(0, 1)}</div>
          <div>
            <div className="b-name">{name}</div>
            {portal.tagline && <div className="b-tag">{portal.tagline}</div>}
          </div>
        </header>

        <main className="card">
          {portal.loading ? (
            <p className="muted">Loading…</p>
          ) : portal.missing ? (
            <Msg title="Page not found" text="This application page does not exist. Check the link you were given." />
          ) : !portal.accepting ? (
            <Msg title="Not accepting applications" text={`${portal.name} is not accepting online applications right now.${portal.phone ? ` Please call ${portal.phone}.` : ""}`} />
          ) : done ? (
            <Msg
              ok
              title="Application received"
              text={`Thank you. ${portal.name} will review your application and contact you.${done.application_number ? ` Your application number is ${done.application_number}.` : ""}${f.email ? " A confirmation has been sent to your email." : ""}`}
            />
          ) : (
            <form onSubmit={submit}>
              <h1>Apply for a loan</h1>
              <p className="muted">Fill in your details and {portal.name} will get back to you.</p>

              <h2>Your details</h2>
              <div className="grid">
                <Field label="Full name *"><input required value={f.fullName} onChange={(e) => set("fullName", e.target.value)} placeholder="John Banda" /></Field>
                <Field label="Phone number *"><input required type="tel" value={f.phone} onChange={(e) => set("phone", e.target.value)} placeholder="0977 123 456" /></Field>
                <Field label="NRC number *"><input required value={f.nrcNumber} onChange={(e) => set("nrcNumber", e.target.value)} placeholder="123456/12/1" /></Field>
                <Field label="Email (optional)"><input type="email" value={f.email} onChange={(e) => set("email", e.target.value)} placeholder="john@email.com" /></Field>
              </div>

              <h2>The loan</h2>
              <div className="grid">
                <Field label="Loan type *">
                  <select value={f.loanType} onChange={(e) => set("loanType", e.target.value)}>
                    {LOAN_TYPES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                  </select>
                </Field>
                <Field label="Amount (ZMW) *"><input required type="number" min="1" inputMode="numeric" value={f.loanAmount} onChange={(e) => set("loanAmount", e.target.value)} placeholder="1500" /></Field>
                <Field label="Repayment period *">
                  <select value={f.repaymentPeriod} onChange={(e) => set("repaymentPeriod", e.target.value)}>
                    {[1, 2, 3, 4].map((n) => <option key={n} value={n}>{n} week{n > 1 ? "s" : ""}</option>)}
                  </select>
                </Field>
              </div>

              <h2>Documents</h2>
              {(needsCollateral || f.loanType === "business") && (
                <Field label={needsCollateral ? "Describe your collateral *" : "Describe your business"}>
                  <textarea rows={3} required={needsCollateral} value={f.collateralDescription} onChange={(e) => set("collateralDescription", e.target.value)}
                    placeholder={needsCollateral ? "e.g. HP laptop, 8GB RAM, good condition, with charger" : "What does your business do?"} />
                </Field>
              )}
              {needsCollateral && (
                <Photos label={`Collateral photos * (up to 4)`} images={f.collateralImages} multiple
                  onAdd={(files) => addPhotos("collateralImages", files, true)}
                  onRemove={(i) => set("collateralImages", f.collateralImages.filter((_, j) => j !== i))} />
              )}
              <div className="grid">
                <Photos label="NRC front" images={f.nrcFront ? [f.nrcFront] : []} onAdd={(files) => addPhotos("nrcFront", files)} onRemove={() => set("nrcFront", null)} />
                <Photos label="NRC back" images={f.nrcBack ? [f.nrcBack] : []} onAdd={(files) => addPhotos("nrcBack", files)} onRemove={() => set("nrcBack", null)} />
              </div>

              {err && <div className="err">{err}</div>}
              <button className="btn" disabled={sending}>{sending ? "Submitting…" : "Submit application"}</button>
            </form>
          )}
        </main>
        <footer className="foot">
          {portal.phone && <span>{portal.phone}</span>}
          {portal.email && <span>{portal.email}</span>}
          <span className="powered">Powered by Sonkhela</span>
        </footer>
      </div>
    </>
  );
}

function Field({ label, children }) {
  return <label className="field"><span>{label}</span>{children}</label>;
}

function Photos({ label, images, multiple, onAdd, onRemove }) {
  const canAdd = multiple ? images.length < 4 : images.length === 0;
  return (
    <div className="field">
      <span>{label}</span>
      <div className="thumbs">
        {images.map((src, i) => (
          <div key={i} className="thumb">
            <img src={src} alt="" />
            <button type="button" onClick={() => onRemove(i)} aria-label="Remove photo">×</button>
          </div>
        ))}
        {canAdd && (
          <label className="add">
            <input type="file" accept="image/*" multiple={!!multiple} onChange={(e) => { onAdd(e.target.files); e.target.value = ""; }} />
            + Add photo
          </label>
        )}
      </div>
    </div>
  );
}

function Msg({ title, text, ok }) {
  return (
    <div className="msg">
      <div className={`msg-icon ${ok ? "ok" : ""}`}>{ok ? "✓" : "!"}</div>
      <h1>{title}</h1>
      <p className="muted">{text}</p>
    </div>
  );
}

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800&family=Lora:wght@700&display=swap');
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
body{font-family:'Nunito',sans-serif;background:#f4fbf6;color:#0d1f14}
.page{max-width:680px;margin:0 auto;padding:20px 16px 40px}
.brand{display:flex;align-items:center;gap:14px;background:linear-gradient(135deg,#145f39,#1a7a4a);color:#fff;border-radius:16px;padding:18px 20px;margin-bottom:16px}
.logo{width:52px;height:52px;border-radius:50%;background:rgba(255,255,255,.15);border:2px solid rgba(255,255,255,.3);display:flex;align-items:center;justify-content:center;font-weight:800;font-size:1.3rem;overflow:hidden;flex-shrink:0}
.logo img{width:100%;height:100%;object-fit:cover}
.b-name{font-family:'Lora',serif;font-size:1.3rem;font-weight:700}
.b-tag{font-size:.85rem;opacity:.75}
.card{background:#fff;border:1px solid #d4e8db;border-radius:16px;padding:22px 20px}
h1{font-family:'Lora',serif;font-size:1.4rem;margin-bottom:4px}
h2{font-size:.78rem;font-weight:800;color:#1a7a4a;text-transform:uppercase;letter-spacing:.08em;margin:22px 0 10px;padding-bottom:6px;border-bottom:2px solid #e8f5ee}
.muted{color:#6b7c72;font-size:.92rem;line-height:1.55}
.grid{display:grid;grid-template-columns:1fr 1fr;gap:12px}
.field{display:flex;flex-direction:column;gap:5px;font-size:.8rem;font-weight:800;color:#145f39;margin-bottom:12px}
input,select,textarea{font:inherit;font-size:.95rem;font-weight:600;padding:11px 12px;border:1px solid #d4e8db;border-radius:10px;background:#fff;color:#0d1f14;width:100%}
input:focus,select:focus,textarea:focus{outline:2px solid #1a7a4a33;border-color:#1a7a4a}
.thumbs{display:flex;gap:8px;flex-wrap:wrap}
.thumb{position:relative;width:84px;height:84px;border-radius:10px;overflow:hidden;border:1px solid #d4e8db}
.thumb img{width:100%;height:100%;object-fit:cover}
.thumb button{position:absolute;top:3px;right:3px;width:22px;height:22px;border-radius:50%;border:none;background:#0d1f14cc;color:#fff;font-size:15px;line-height:1;cursor:pointer}
.add{width:84px;height:84px;border:2px dashed #b8e8cb;border-radius:10px;display:flex;align-items:center;justify-content:center;text-align:center;font-size:.75rem;color:#1a7a4a;cursor:pointer;background:#f0faf4}
.add input{display:none}
.err{background:#fdf0ee;color:#c0392b;border:1px solid #f3c4bd;border-radius:10px;padding:10px 12px;font-weight:700;font-size:.88rem;margin:6px 0 12px}
.btn{width:100%;margin-top:8px;background:#1a7a4a;color:#fff;border:none;border-radius:12px;padding:14px;font:inherit;font-weight:800;font-size:1rem;cursor:pointer}
.btn:hover{background:#145f39}.btn:disabled{opacity:.6;cursor:default}
.msg{text-align:center;padding:16px 4px}
.msg-icon{width:56px;height:56px;border-radius:50%;margin:0 auto 12px;display:flex;align-items:center;justify-content:center;font-size:1.6rem;font-weight:800;background:#fef3c7;color:#92400e}
.msg-icon.ok{background:#d1fae5;color:#065f46}
.foot{display:flex;justify-content:center;flex-wrap:wrap;gap:6px 16px;margin-top:16px;font-size:.8rem;color:#6b7c72}
.powered{opacity:.7}
@media(max-width:560px){.grid{grid-template-columns:1fr}}
`;
