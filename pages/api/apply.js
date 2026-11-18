// Public: loan application submitted on a client portal's /apply page.
// The business is worked out on the server from the subdomain, never from the browser,
// so an application can only ever land with the portal it was submitted on.
import crypto from "crypto";
import nodemailer from "nodemailer";
import { serviceClient } from "../../lib/serverAuth";
import { resolvePortal } from "../../lib/portal";
import { makeCode } from "../../lib/codes";

export const config = { api: { bodyParser: { sizeLimit: "4mb" } } };

const LOAN_NAMES = {
  collateral: "Collateral Backed Loan",
  payslip: "Payslip Backed Loan",
  student: "Student Loan",
  marketeer: "Marketeer Loan",
  business: "Business Loan",
  "white-book": "White Book Loan",
};

const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const fmtK = (n) => "K " + Number(n).toLocaleString("en", { minimumFractionDigits: 2 });

// "data:image/jpeg;base64,...." -> uploaded storage path
async function uploadImage(svc, dataUrl, folder) {
  const m = /^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=]+)$/.exec(String(dataUrl || ""));
  if (!m) throw new Error("Invalid image");
  const buf = Buffer.from(m[2], "base64");
  if (buf.length > 1.5 * 1024 * 1024) throw new Error("Image too large");
  const ext = m[1].split("/")[1].replace("jpeg", "jpg");
  const path = `${folder}/${Date.now()}-${crypto.randomUUID()}.${ext}`;
  const { error } = await svc.storage.from("loan-documents").upload(path, buf, { contentType: m[1] });
  if (error) throw error;
  return path;
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const svc = serviceClient();
  const portal = await resolvePortal(svc, req);
  if (!portal) return res.status(404).json({ error: "This application page does not exist." });
  if (!portal.accepting) return res.status(403).json({ error: `${portal.tenant.business_name} is not accepting applications right now.` });

  const b = req.body || {};
  const full_name = String(b.fullName || "").trim();
  const phone = String(b.phone || "").trim();
  const email = String(b.email || "").trim();
  const nrc_number = String(b.nrcNumber || "").trim();
  const loan_type = String(b.loanType || "");
  const loan_amount = Number(String(b.loanAmount || "").replace(/,/g, ""));
  const repayment_period = Number(b.repaymentPeriod || 1);
  const collateral_description = String(b.collateralDescription || "").trim();

  if (!full_name || !phone || !nrc_number) return res.status(400).json({ error: "Name, phone number and NRC number are required." });
  if (email && !/^\S+@\S+\.\S+$/.test(email)) return res.status(400).json({ error: "Enter a valid email address or leave it blank." });
  if (!LOAN_NAMES[loan_type]) return res.status(400).json({ error: "Choose a loan type." });
  if (!(loan_amount > 0)) return res.status(400).json({ error: "Enter a valid loan amount." });
  if (![1, 2, 3, 4].includes(repayment_period)) return res.status(400).json({ error: "Choose a repayment period." });

  const t = portal.tenant;
  const base = `t/${t.id}`; // each business's uploads live in their own folder

  let collateral_images = [], nrc_front = null, nrc_back = null;
  try {
    for (const img of (b.collateralImages || []).slice(0, 4)) collateral_images.push(await uploadImage(svc, img, `${base}/collateral`));
    if (b.nrcFront) nrc_front = await uploadImage(svc, b.nrcFront, `${base}/nrc`);
    if (b.nrcBack) nrc_back = await uploadImage(svc, b.nrcBack, `${base}/nrc`);
  } catch (e) {
    console.error("apply upload failed:", e);
    return res.status(400).json({ error: "One of the photos could not be uploaded. Please try a different photo." });
  }

  // The business's own numbering: RTC-APP-2026-000001, 000002, ...
  const code = t.code || makeCode(t.business_name);
  const prefix = `${code}-APP-${new Date().getFullYear()}-`;
  const { count: soFar } = await svc
    .from("applications")
    .select("id", { count: "exact", head: true })
    .eq("tenant_id", t.id)
    .like("app_ref", `${prefix}%`);

  const id = crypto.randomUUID();
  let application_number = null, error = null;
  for (let attempt = 1; attempt <= 5; attempt++) {
    application_number = prefix + String((soFar || 0) + attempt).padStart(6, "0");
    ({ error } = await svc.from("applications").insert({
      id,
      tenant_id: t.id,
      app_ref: application_number,
      full_name, email: email || null, phone, nrc_number,
      country: "Zambia",
      loan_type, loan_amount, repayment_period,
      collateral_description: collateral_description || null,
      collateral_images, nrc_front, nrc_back,
    }));
    if (!error || error.code !== "23505") break; // 23505: two people applied at the same moment, take the next number
  }
  if (error) {
    console.error("apply insert failed:", error);
    return res.status(500).json({ error: "Could not submit your application. Please try again." });
  }

  // Emails never block the application
  await notify({ portal, application_number, full_name, email, phone, loan_type, loan_amount, repayment_period }).catch((e) =>
    console.error("apply notify failed:", e)
  );

  return res.status(200).json({ ok: true, application_number });
}

async function notify({ portal, application_number, full_name, email, phone, loan_type, loan_amount, repayment_period }) {
  const user = process.env.GMAIL_USER, pass = process.env.GMAIL_PASS;
  if (!user || !pass) return;
  const tx = nodemailer.createTransport({ service: "gmail", auth: { user, pass } });
  const bizName = portal.biz.name || portal.tenant.business_name;
  const ownerEmail = portal.tenant.contact_email || portal.biz.email;
  const ref = application_number ? ` ${application_number}` : "";
  const box = (title, inner) => `
    <div style="font-family:Arial,Helvetica,sans-serif;max-width:560px;margin:0 auto;border:1px solid #d4e8db;border-radius:10px;overflow:hidden;">
      <div style="background:#145f39;padding:20px 22px;color:#fff;">
        <div style="font-size:1.1rem;font-weight:bold;">${esc(bizName)}</div>
        <div style="opacity:.85;font-size:.85rem;margin-top:2px;">${title}</div>
      </div>
      <div style="padding:22px;color:#0d1f14;font-size:.95rem;line-height:1.6;">${inner}</div>
    </div>`;

  const jobs = [];
  if (ownerEmail) {
    jobs.push(tx.sendMail({
      from: `Sonkhela Loan System <${user}>`,
      to: ownerEmail,
      subject: `New loan application${ref}: ${full_name}`,
      html: box("New loan application", `
        <p><strong>${esc(full_name)}</strong> applied for <strong>${fmtK(loan_amount)}</strong> (${esc(LOAN_NAMES[loan_type])}, ${repayment_period} week${repayment_period > 1 ? "s" : ""}).</p>
        <p>Phone: ${esc(phone)}${email ? `<br/>Email: ${esc(email)}` : ""}</p>
        <p><a href="https://${portal.tenant.slug}.sonkhela.com" style="display:inline-block;background:#1a7a4a;color:#fff;padding:10px 20px;border-radius:8px;text-decoration:none;font-weight:bold;">Review in your dashboard</a></p>`),
    }));
  }
  if (email) {
    jobs.push(tx.sendMail({
      from: `${bizName} <${user}>`,
      to: email,
      ...(ownerEmail ? { replyTo: ownerEmail } : {}),
      subject: `Application received${ref}: ${bizName}`,
      html: box("Application received", `
        <p>Dear ${esc(full_name.split(" ")[0])},</p>
        <p>Thank you for applying for a loan of <strong>${fmtK(loan_amount)}</strong> with ${esc(bizName)}.${application_number ? ` Your application number is <strong>${esc(application_number)}</strong>.` : ""}</p>
        <p>We will review it and get back to you shortly.${portal.biz.phone ? ` For questions, call ${esc(portal.biz.phone)}.` : ""}</p>`),
    }));
  }
  await Promise.all(jobs);
}
