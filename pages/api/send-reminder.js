import nodemailer from "nodemailer";
import { requireAdmin, serviceClient } from "../../lib/serverAuth";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const admin = await requireAdmin(req);
  if (!admin) return res.status(401).json({ error: "Unauthorized" });
  const supabase = serviceClient();
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

  const gmailUser = process.env.GMAIL_USER;
  const gmailPass = process.env.GMAIL_PASS;
  if (!gmailUser || !gmailPass) return res.status(500).json({ error: "Add GMAIL_USER and GMAIL_PASS to Vercel environment variables." });

  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: { user: gmailUser, pass: gmailPass },
  });

  const dueDate = new Date(loan.due_date + "T00:00:00").toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric" });
  const total = Number(loan.amount) + (Number(loan.amount) * Number(loan.interest_rate) / 100);
  const fmtK = (n) => "K " + Number(n).toLocaleString("en", { minimumFractionDigits: 2 });

  await transporter.sendMail({
    from: `${biz.name || "Sonkhela Soft Loans"} <${gmailUser}>`,
    to: loan.client_email,
    subject: `Loan Payment Reminder – Due ${dueDate}`,
    html: `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#f4fbf6;padding:2rem;border-radius:12px;">
      <div style="background:#145f39;padding:1.5rem 2rem;border-radius:8px;margin-bottom:1.5rem;">
        <h1 style="color:#fff;font-size:1.4rem;margin:0;">${biz.name || "Sonkhela Soft Loans"}</h1>
        <p style="color:rgba(255,255,255,0.6);margin:4px 0 0;">${biz.tagline || ""}</p>
      </div>
      <h2 style="color:#0d1f14;">Dear ${loan.client_name},</h2>
      <p style="color:#4a5a50;line-height:1.7;">This is a friendly reminder that your loan <strong>${loan.id}</strong> is due on <strong style="color:#c0392b;">${dueDate}</strong>.</p>
      <div style="background:#fff;border:1px solid #d4e8db;border-radius:8px;padding:1.25rem;margin:1.5rem 0;">
        <table style="width:100%;border-collapse:collapse;font-size:0.9rem;">
          <tr><td style="padding:6px 0;color:#6b7c72;">Principal</td><td style="text-align:right;font-weight:700;">${fmtK(loan.amount)}</td></tr>
          <tr><td style="padding:6px 0;color:#6b7c72;">Interest (${loan.interest_rate}%)</td><td style="text-align:right;font-weight:700;">${fmtK(loan.amount * loan.interest_rate / 100)}</td></tr>
          <tr style="border-top:2px solid #d4e8db;">
            <td style="padding:10px 0 6px;color:#145f39;font-weight:800;">Total Due</td>
            <td style="text-align:right;font-weight:800;color:#145f39;">${fmtK(total)}</td>
          </tr>
        </table>
      </div>
      <p style="color:#4a5a50;">Please pay on or before the due date to avoid penalties.</p>
      <p style="color:#4a5a50;">Contact: <strong>${biz.phone || ""}</strong></p>
      <p style="color:#4a5a50;">Regards,<br/><strong>${biz.name || "Sonkhela Soft Loans"}</strong></p>
    </div>`,
  });

  return res.status(200).json({ success: true });
}
