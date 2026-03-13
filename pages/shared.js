import { createClient } from "@supabase/supabase-js";

export const supabase = createClient(
  "https://zxxdvxzgqynkuveipxqc.supabase.co",
  "sb_publishable_h8ykxzJdMDPnse7cPB_O1Q_SxEk8jh8"
);

export function fmt(v) {
  return "K " + Number(v).toLocaleString("en", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
export function fmtDate(d) {
  if (!d) return "—";
  return new Date(d + "T00:00:00").toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric" });
}
export function genId() {
  return `SSL-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 900) + 100)}`;
}
export function calcLoan(amount, rate, schedule) {
  const total = Number(amount) + (Number(amount) * Number(rate)) / 100;
  const periods = schedule === "weekly" ? 12 : schedule === "monthly" ? 3 : 1;
  return { total, installment: total / periods };
}
export function isOverdue(loan) {
  return loan.status === "active" && new Date(loan.due_date) < new Date();
}

export const AGR_STYLES = `
@import url('https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800;900&family=Lora:wght@600;700&display=swap');
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
:root{
  --green:#1a7a4a;--green-dark:#145f39;--green-light:#e8f5ee;
  --accent:#f0faf4;--white:#ffffff;--ink:#0d1f14;
  --muted:#6b7c72;--border:#d4e8db;--bg:#f4fbf6;
  --red:#c0392b;--red-light:#fdf0ee;
}
body{font-family:'Nunito',sans-serif;background:#e8f5ee;color:var(--ink);}
.agr-page{min-height:100vh;padding:2rem 1rem;display:flex;flex-direction:column;align-items:center;}
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
.loading-screen{min-height:100vh;background:var(--green-dark);display:flex;align-items:center;justify-content:center;flex-direction:column;gap:1rem;}
.loading-spinner{width:48px;height:48px;border:4px solid rgba(255,255,255,0.2);border-top-color:#fff;border-radius:50%;animation:spin 0.8s linear infinite;}
@keyframes spin{to{transform:rotate(360deg);}}
.loading-text{color:rgba(255,255,255,0.7);font-size:0.9rem;font-weight:700;}
.error-screen{min-height:100vh;background:var(--green-dark);display:flex;align-items:center;justify-content:center;flex-direction:column;gap:1rem;padding:2rem;text-align:center;}
.error-icon{font-size:3rem;}
.error-title{color:#fff;font-family:'Lora',serif;font-size:1.5rem;font-weight:700;}
.error-sub{color:rgba(255,255,255,0.6);font-size:0.9rem;}
@media(max-width:768px){
  .agr-grid{grid-template-columns:1fr;}
  .agr-money-bar{grid-template-columns:1fr;}
  .agr-body{padding:1.5rem;}
  .agr-header{padding:1.5rem;}
  .agr-id-bar{padding:1rem 1.5rem;flex-direction:column;gap:0.5rem;}
  .agr-footer{padding:1rem 1.5rem;flex-direction:column;gap:4px;}
  .sig-row{grid-template-columns:1fr;}
}
@keyframes fadeUp{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:translateY(0)}}
.fade-up{animation:fadeUp 0.32s ease;}
`;
export default function Shared() { return null; }
