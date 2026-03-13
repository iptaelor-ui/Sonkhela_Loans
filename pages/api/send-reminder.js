import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  "https://zxxdvxzgqynkuveipxqc.supabase.co",
  "sb_publishable_h8ykxzJdMDPnse7cPB_O1Q_SxEk8jh8"
);

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  const { loanId } = req.body;
  if (!loanId) return res.status(400).json({ error: "loanId required" });

  const [loanRes, bizRes] = await Promise.all([
    supabase.from("loans").select("*").eq("id", loanId).single(),
    supabase.from("business").select("*").eq("id", 1).single(),
  ]);

  if (loanRes.error || !loanRes.data) return res.status(404).json({ error: "Loan not found" });
  if (!loanRes.data.client_email) return res.status(400).json({ error: "Client has no email" });

  const loan = loanRes.data;
  const biz = bizRes.data || {};
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return res.status(500).json({ error: "Email service not configured. Add RESEND_API_KEY to Vercel environment variables." });

  const { Resend } = await import("resend");
  const resend = new Resend(apiKey);

  const dueDate = new Date(loan.due_date + "T00:00:00").toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric" });
  const total = Number(loan.amount) + (Number(loan.amount) * Number(loan.interest_rate) / 100);
  const fmtK = (n) => "K " + Number(n).toLocaleString("en", { minimumFractionDigits: 2 });

  const { error } = await resend.emails.send({
    from: `${biz.name || "Sonkhela"} <onboarding@resend.dev>`,
    to: loan.client_email,
    subject: `Loan Payment Reminder – Due ${dueDate}`,
    html: `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#f4fbf6;padding:2rem;border-radius:12px;">
      <div style="background:#145f39;padding:1.5rem 2rem;border-radius:8px;margin-bottom:1.5rem;">
        <h1 style="color:#fff;font-size:1.4rem;margin:0;">${biz.name || "Sonkhela Soft Loans"}</h1>
        <p style="color:rgba(255,255,255,0.6);margin:4px 0 0;font-size:0.85rem;">${biz.tagline || ""}</p>
      </div>
      <h2 style="color:#0d1f14;font-size:1.1rem;">Dear ${loan.client_name},</h2>
      <p style="color:#4a5a50;line-height:1.7;">This is a friendly reminder that your loan <strong>${loan.id}</strong> is due on <strong style="color:#c0392b;">${dueDate}</strong>.</p>
      <div style="background:#fff;border:1px solid #d4e8db;border-radius:8px;padding:1.25rem;margin:1.5rem 0;">
        <table style="width:100%;border-collapse:collapse;font-size:0.9rem;">
          <tr><td style="padding:6px 0;color:#6b7c72;">Principal</td><td style="text-align:right;font-weight:700;">${fmtK(loan.amount)}</td></tr>
          <tr><td style="padding:6px 0;color:#6b7c72;">Interest (${loan.interest_rate}%)</td><td style="text-align:right;font-weight:700;">${fmtK(loan.amount * loan.interest_rate / 100)}</td></tr>
          <tr style="border-top:2px solid #d4e8db;">
            <td style="padding:10px 0 6px;color:#145f39;font-weight:800;font-size:1rem;">Total Due</td>
            <td style="text-align:right;font-weight:800;font-size:1rem;color:#145f39;">${fmtK(total)}</td>
          </tr>
        </table>
      </div>
      <p style="color:#4a5a50;line-height:1.7;">Please ensure payment is made on or before the due date to avoid penalties or forfeiture of your collateral.</p>
      <p style="color:#4a5a50;">For queries, contact us at <strong>${biz.phone || ""}</strong>.</p>
      <p style="color:#4a5a50;margin-top:1.5rem;">Regards,<br/><strong>${biz.name || "Sonkhela Soft Loans"}</strong></p>
      <p style="font-size:0.72rem;color:#a0b0a8;margin-top:2rem;border-top:1px solid #d4e8db;padding-top:1rem;">Automated reminder. ${biz.address || ""}</p>
    </div>`,
  });

  if (error) return res.status(500).json({ error: error.message });
  return res.status(200).json({ success: true });
}
