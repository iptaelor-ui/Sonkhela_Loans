// Full Suite: send a custom SMS to one borrower, from the business's own SMS account.
import { getTenantContext, serviceClient } from "../../lib/serverAuth";
import { loadPlan } from "../../lib/features";
const { sendSMS } = require("../../lib/sms");

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  const ctx = await getTenantContext(req);
  if (!ctx) return res.status(401).json({ error: "Unauthorized" });

  const svc = serviceClient();
  const plan = await loadPlan(svc, ctx.tenantId);
  if (!plan?.canWrite) return res.status(403).json({ error: "Your subscription has ended. Renew to send messages." });
  if (!plan.features.custom_messaging) return res.status(403).json({ error: "Custom SMS is part of the Full Suite package.", upgrade: "custom_messaging" });
  if (!plan.smsReady) return res.status(400).json({ error: "Your SMS account isn't connected yet. Contact Sonkhela to set it up." });

  const { loanId } = req.body || {};
  const message = String(req.body?.message || "").trim();
  if (!message) return res.status(400).json({ error: "Type a message first." });
  if (message.length > 459) return res.status(400).json({ error: "Message too long (max 459 characters, 3 SMS)." });

  const { data: loan } = await svc
    .from("loans").select("id,client_name,client_phone").eq("id", loanId).eq("tenant_id", ctx.tenantId).maybeSingle();
  if (!loan) return res.status(404).json({ error: "Loan not found" });
  if (!loan.client_phone) return res.status(400).json({ error: "This client has no phone number." });

  const result = await sendSMS(loan.client_phone, message, plan.smsCreds);
  try {
    await svc.from("sms_logs").insert({
      tenant_id: ctx.tenantId,
      type: "custom",
      message,
      phone_number: loan.client_phone,
      recipients_count: result.success ? 1 : 0,
      status: result.success ? "Sent" : "Failed",
      sent_at: new Date().toISOString(),
    });
  } catch (e) {
    console.warn("sms_logs insert skipped:", e.message);
  }
  if (!result.success) return res.status(502).json({ error: "SMS failed: " + (result.error || "unknown error") });
  return res.status(200).json({ ok: true });
}
