import nodemailer from "nodemailer";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  const { clientEmail, clientName, loanId, dueDate, amount, interestRate, businessName, businessPhone, businessEmail } = req.body;
  if (!clientEmail) return res.status(400).json({ error: "Missing email" });

  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: { user: process.env.GMAIL_USER, pass: process.env.GMAIL_PASS },
  });

  const total = Number(amount) + (Number(amount) * Number(interestRate) / 100);
  const formattedDue = new Date(dueDate + "T00:00:00").toLocaleDateString("en-GB", { day:"2-digit", month:"long", year:"numeric" });
  const fmtK = v => "K " + Number(v).toLocaleString("en", { minimumFractionDigits:2, maximumFractionDigits:2 });

  const html = `
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#f4fbf6;padding:20px;">
      <div style="background:#145f39;padding:30px;border-radius:8px 8px 0 0;text-align:center;">
        <h1 style="color:#fff;margin:0;font-size:22px;">${businessName}</h1>
        <p style="color:rgba(255,255,255,0.7);margin:6px 0 0;font-size:13px;">Loan Repayment Reminder</p>
      </div>
      <div style="background:#fff;padding:30px;border-radius:0 0 8px 8px;border:1px solid #d4e8db;">
        <p style="font-size:16px;color:#0d1f14;">Dear <strong>${clientName}</strong>,</p>
        <p style="color:#4a6655;line-height:1.7;">
          This is a friendly reminder that your loan repayment is <strong>due on ${formattedDue}</strong>.
          Please ensure the total amount of <strong style="color:#145f39;">${fmtK(total)}</strong> is paid by the due date to avoid penalties.
        </p>
        <div style="background:#e8f5ee;border-radius:8px;padding:16px 20px;margin:20px 0;border-left:4px solid #1a7a4a;">
          <p style="margin:0 0 4px;font-size:11px;color:#6b7c72;text-transform:uppercase;letter-spacing:0.05em;">Agreement Reference</p>
          <p style="margin:0;font-size:18px;font-weight:bold;color:#145f39;">${loanId}</p>
        </div>
        <table style="width:100%;border-collapse:collapse;margin:20px 0;">
          <tr style="background:#f0faf4;">
            <td style="padding:10px 14px;font-size:13px;color:#6b7c72;border-bottom:1px solid #d4e8db;">Loan Amount</td>
            <td style="padding:10px 14px;font-size:13px;font-weight:bold;color:#0d1f14;border-bottom:1px solid #d4e8db;text-align:right;">${fmtK(amount)}</td>
          </tr>
          <tr>
            <td style="padding:10px 14px;font-size:13px;color:#6b7c72;border-bottom:1px solid #d4e8db;">Interest (${interestRate}%)</td>
            <td style="padding:10px 14px;font-size:13px;font-weight:bold;color:#0d1f14;border-bottom:1px solid #d4e8db;text-align:right;">${fmtK(Number(amount)*Number(interestRate)/100)}</td>
          </tr>
          <tr style="background:#145f39;">
            <td style="padding:10px 14px;font-size:13px;color:#fff;font-weight:bold;">Total Due</td>
            <td style="padding:10px 14px;font-size:15px;font-weight:bold;color:#7ef5a8;text-align:right;">${fmtK(total)}</td>
          </tr>
        </table>
        <p style="color:#4a6655;line-height:1.7;font-size:14px;">Questions? Contact us:</p>
        <p style="color:#145f39;font-weight:bold;font-size:14px;">📞 ${businessPhone}<br/>✉️ ${businessEmail}</p>
        <p style="color:#9ca3af;font-size:12px;margin-top:24px;padding-top:16px;border-top:1px solid #e5e7eb;">
          This is an automated reminder from ${businessName}.
        </p>
      </div>
    </div>`;

  try {
    await transporter.sendMail({
      from: `"${businessName}" <${process.env.GMAIL_USER}>`,
      to: clientEmail,
      subject: `⚠️ Loan Repayment Due – ${formattedDue} | ${loanId}`,
      html,
    });
    return res.status(200).json({ success: true });
  } catch(err) {
    console.error("Email error:", err);
    return res.status(500).json({ error: "Failed to send", details: err.message });
  }
}
