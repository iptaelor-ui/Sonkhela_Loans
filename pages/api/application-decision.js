import nodemailer from "nodemailer";
import { requireAdmin, serviceClient } from "../../lib/serverAuth";


const fmtK = (n) => "K " + Number(n).toLocaleString("en", { minimumFractionDigits: 2 });

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const admin = await requireAdmin(req);
  if (!admin) return res.status(401).json({ error: "Unauthorized" });
  const supabase = serviceClient();
  const { type, applicationId, note, loanId, agreementUrl } = req.body || {};
  if (!type || !applicationId) return res.status(400).json({ error: "type and applicationId required" });
  if (!["approved", "rejected", "more_info"].includes(type)) return res.status(400).json({ error: "Invalid type" });

  const [appRes, bizRes] = await Promise.all([
    supabase.from("applications").select("*").eq("id", applicationId).single(),
    supabase.from("business").select("*").eq("id", 1).single(),
  ]);
  if (appRes.error || !appRes.data) return res.status(404).json({ error: "Application not found" });

  const app = appRes.data;
  const biz = bizRes.data || {};
  if (!app.email) return res.status(200).json({ ok: true, skipped: "Applicant has no email" });

  const gmailUser = process.env.GMAIL_USER;
  const gmailPass = process.env.GMAIL_PASS;
  if (!gmailUser || !gmailPass) return res.status(500).json({ error: "GMAIL_USER / GMAIL_PASS not configured" });

  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: { user: gmailUser, pass: gmailPass },
  });

  const bizName = biz.name || "Sonkhela Soft Loans";
  const firstName = (app.full_name || "").split(" ")[0] || "there";
  const wrap = (title, color, inner) => `
    <div style="font-family:Arial,Helvetica,sans-serif;max-width:560px;margin:0 auto;border:1px solid #d4e8db;border-radius:10px;overflow:hidden;">
      <div style="background:${color};padding:22px 26px;color:#fff;">
        <div style="font-size:1.15rem;font-weight:bold;">${bizName}</div>
        <div style="opacity:0.85;font-size:0.85rem;margin-top:2px;">${title}</div>
      </div>
      <div style="padding:24px 26px;color:#0d1f14;font-size:0.95rem;line-height:1.6;">${inner}
        <p style="margin-top:22px;color:#6b7c72;font-size:0.82rem;">
          ${bizName}${biz.phone ? " • " + biz.phone : ""}${biz.email ? " • " + biz.email : ""}
        </p>
      </div>
    </div>`;

  let subject, html;

  if (type === "approved") {
    subject = `Loan Approved — ${bizName}`;
    html = wrap("Loan Application Approved 🎉", "#145f39", `
      <p>Dear ${firstName},</p>
      <p>Great news — your loan application for <strong>${fmtK(app.loan_amount)}</strong> has been <strong style="color:#145f39;">approved</strong>.</p>
      ${loanId ? `<p>Your agreement reference is <strong>${loanId}</strong>.</p>` : ""}
      ${agreementUrl ? `<p>Please review and sign your loan agreement here:<br/>
        <a href="${agreementUrl}" style="display:inline-block;margin-top:8px;background:#1a7a4a;color:#fff;padding:10px 22px;border-radius:8px;text-decoration:none;font-weight:bold;">View & Sign Agreement</a></p>` : ""}
      <p>Your loan becomes active once the agreement is signed. If you have any questions, simply reply to this email${biz.phone ? " or call us on " + biz.phone : ""}.</p>
    `);
  } else if (type === "rejected") {
    subject = `Loan Application Update — ${bizName}`;
    html = wrap("Loan Application Update", "#555", `
      <p>Dear ${firstName},</p>
      <p>Thank you for applying for a loan of ${fmtK(app.loan_amount)} with ${bizName}. After careful review, we are unable to approve your application at this time.</p>
      ${note ? `<p><strong>Reason:</strong> ${note}</p>` : ""}
      <p>You are welcome to apply again in the future. If you believe there has been a mistake or would like to discuss this, please reply to this email${biz.phone ? " or call us on " + biz.phone : ""}.</p>
    `);
  } else {
    subject = `More Information Needed — ${bizName}`;
    html = wrap("Additional Information Required", "#1d4ed8", `
      <p>Dear ${firstName},</p>
      <p>Thank you for your loan application for ${fmtK(app.loan_amount)}. Before we can proceed, we need a little more information from you:</p>
      <p style="background:#f0f6ff;border-left:4px solid #1d4ed8;padding:12px 16px;border-radius:6px;"><strong>${note || "Please contact us for details."}</strong></p>
      <p>Please reply to this email with the requested details${biz.phone ? ", or call us on " + biz.phone : ""}, and we will continue processing your application right away.</p>
    `);
  }

  try {
    await transporter.sendMail({
      from: `${bizName} <${gmailUser}>`,
      to: app.email,
      subject,
      html,
    });
    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error("application-decision email failed:", err);
    return res.status(500).json({ error: "Email failed to send" });
  }
}
