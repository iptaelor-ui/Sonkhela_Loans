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
  if (!apiKey) return res.status(500).json({ error: "Add RESEND_API_KEY to Vercel environment variables." });

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
      </div>
      <h2 style="color:#0d1f14;">Dear ${loan.client_name},</h2>
      <p style="color:#4a5a50;">Your loan <strong>${loan.id}</strong> is due on <strong style="color:#c0392b;">${dueDate}</strong>.</p>
      <p style="color:#4a5a50;">Total due: <strong>${fmtK(total)}</strong></p>
      <p style="color:#4a5a50;">Contact us: <strong>${biz.phone || ""}</strong></p>
      <p style="color:#4a5a50;">Regards,<br/><strong>${biz.name || "Sonkhela Soft Loans"}</strong></p>
    </div>`,
  });

  if (error) return res.status(500).json({ error: error.message });
  return res.status(200).json({ success: true });
}
