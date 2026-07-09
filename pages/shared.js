import { createClient } from "@supabase/supabase-js";

export const supabase = createClient(
  "https://zxxdvxzgqynkuveipxqc.supabase.co",
  "sb_publishable_h8ykxzJdMDPnse7cPB_O1Q_SxEk8jh8"
);

export const fmt = (n) => "K " + Number(n || 0).toLocaleString("en", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
export const fmtDate = (d) => { if (!d) return "—"; return new Date(d + "T00:00:00").toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric" }); };
export const calcLoan = (amount, rate, repayment) => {
  const principal = Number(amount || 0);
  const interest = principal * Number(rate || 0) / 100;
  const total = principal + interest;
  const installment = repayment === "weekly" ? total / 4 : repayment === "monthly" ? total / 3 : total;
  return { principal, interest, total, installment };
};
export const isOverdue = (loan) => loan.status === "active" && loan.due_date && new Date(loan.due_date + "T00:00:00") < new Date();
export const genId = () => {
  // Unguessable ID: ~1 trillion combinations (was only 900 — enumerable).
  // Excludes ambiguous chars (0/O, 1/I/L) for easy reading over the phone.
  const chars = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
  const arr = new Uint32Array(8);
  crypto.getRandomValues(arr);
  let s = "";
  for (let i = 0; i < 8; i++) s += chars[arr[i] % chars.length];
  return `SSL-${new Date().getFullYear()}-${s}`;
};

// fetch() that attaches the admin's Supabase session token.
// API routes verify this token — without it they return 401.
export const authFetch = async (url, options = {}) => {
  const { data } = await supabase.auth.getSession();
  const token = data?.session?.access_token;
  return fetch(url, {
    ...options,
    headers: {
      ...(options.headers || {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
};

export const AGR_STYLES = `
@import url('https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800&family=Lora:wght@700&display=swap');
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
:root {
  --green: #1a7a4a;
  --green-dark: #145f39;
  --green-light: #e8f5ee;
  --ink: #0d1f14;
  --muted: #6b7c72;
  --border: #d4e8db;
  --white: #ffffff;
  --bg: #f4fbf6;
  --red: #c0392b;
  --red-light: #fdf0ee;
  --accent: #f0faf4;
}
body { font-family: 'Nunito', sans-serif; color: var(--ink); background: var(--bg); }
.loading-screen { min-height: 100vh; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 1rem; background: var(--bg); }
.loading-spinner { width: 40px; height: 40px; border: 3px solid var(--border); border-top-color: var(--green); border-radius: 50%; animation: spin 0.8s linear infinite; }
.loading-text { font-size: 0.875rem; color: var(--muted); font-weight: 700; }
@keyframes spin { to { transform: rotate(360deg); } }
.error-screen { min-height: 100vh; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 0.75rem; background: var(--bg); padding: 2rem; }
.error-icon { font-size: 3rem; }
.error-title { font-family: 'Lora', serif; font-size: 1.5rem; font-weight: 700; }
.error-sub { color: var(--muted); font-size: 0.875rem; text-align: center; }
.fade-up { animation: fadeUp 0.4s ease both; }
@keyframes fadeUp { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: translateY(0); } }

.agr-page { min-height: 100vh; background: var(--bg); display: flex; flex-direction: column; align-items: center; padding: 2rem 1rem; }
.agr-doc { background: var(--white); border-radius: 16px; width: 100%; max-width: 740px; box-shadow: 0 4px 32px rgba(26,122,74,0.10); overflow: hidden; border: 1px solid var(--border); }
.agr-header { background: linear-gradient(135deg, var(--green-dark) 0%, var(--green) 100%); padding: 2rem; display: flex; align-items: flex-start; gap: 1.25rem; position: relative; }
.agr-logo { width: 64px; height: 64px; border-radius: 50%; background: rgba(255,255,255,0.15); display: flex; align-items: center; justify-content: center; font-size: 24px; font-weight: 800; color: #fff; flex-shrink: 0; overflow: hidden; border: 2px solid rgba(255,255,255,0.3); }
.agr-logo img { width: 100%; height: 100%; object-fit: cover; }
.agr-biz-name { font-family: 'Lora', serif; font-size: 1.5rem; font-weight: 700; color: #fff; }
.agr-biz-tag { font-size: 0.82rem; color: rgba(255,255,255,0.65); margin-top: 2px; }
.agr-biz-contact { font-size: 0.75rem; color: rgba(255,255,255,0.5); margin-top: 6px; }
.agr-status-pill { position: absolute; top: 1.5rem; right: 1.5rem; padding: 5px 14px; border-radius: 20px; font-size: 0.7rem; font-weight: 800; letter-spacing: 0.06em; }
.agr-status-active { background: #d1fae5; color: #065f46; }
.agr-status-overdue { background: #fee2e2; color: #991b1b; }
.agr-status-settled { background: #e5e7eb; color: #374151; }
.agr-id-bar { background: var(--accent); padding: 1rem 2rem; display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid var(--border); }
.agr-id-label { font-size: 0.65rem; font-weight: 800; color: var(--muted); text-transform: uppercase; letter-spacing: 0.08em; margin-bottom: 2px; }
.agr-id-num { font-family: 'Lora', serif; font-size: 1.1rem; font-weight: 700; color: var(--green-dark); }
.agr-body { padding: 1.75rem 2rem; }
.agr-section-title { font-size: 0.78rem; font-weight: 800; color: var(--green); text-transform: uppercase; letter-spacing: 0.08em; margin: 1.5rem 0 0.75rem; padding-bottom: 0.5rem; border-bottom: 2px solid var(--green-light); display: flex; align-items: center; gap: 6px; }
.agr-section-title:first-child { margin-top: 0; }
.agr-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem; margin-bottom: 0.5rem; }
.agr-cell { background: var(--accent); border: 1px solid var(--border); border-radius: 8px; padding: 0.75rem 1rem; }
.agr-cell.full { grid-column: 1 / -1; }
.agr-cell-label { font-size: 0.65rem; font-weight: 800; color: var(--muted); text-transform: uppercase; letter-spacing: 0.06em; margin-bottom: 4px; }
.agr-cell-value { font-size: 0.9rem; font-weight: 700; color: var(--ink); }
.agr-money-bar { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 0.75rem; margin-bottom: 0.75rem; }
.agr-money-item { background: var(--accent); border: 1px solid var(--border); border-radius: 8px; padding: 0.75rem 1rem; }
.agr-money-item.highlight { background: linear-gradient(135deg, var(--green-dark), var(--green)); border-color: var(--green); }
.agr-money-item .lbl { font-size: 0.65rem; font-weight: 800; color: var(--muted); text-transform: uppercase; letter-spacing: 0.06em; margin-bottom: 4px; }
.agr-money-item.highlight .lbl { color: rgba(255,255,255,0.7); }
.agr-money-item .val { font-family: 'Lora', serif; font-size: 1rem; font-weight: 700; color: var(--ink); }
.agr-money-item.highlight .val { color: #fff; }
.agr-terms { background: var(--accent); border: 1px solid var(--border); border-radius: 8px; padding: 1rem; font-size: 0.82rem; color: var(--muted); line-height: 1.7; }
.agr-footer { background: var(--green-dark); padding: 1rem 2rem; display: flex; justify-content: space-between; align-items: center; }
.agr-footer-left { font-size: 0.75rem; color: rgba(255,255,255,0.5); }
.agr-footer-right { font-size: 0.75rem; color: rgba(255,255,255,0.5); font-weight: 700; }
`;

export default function Shared() { return null; }
