// pages/api/retry-sms.js
import { createClient } from "@supabase/supabase-js";
const { sendSMS } = require("../../lib/sms");
import { getTenantContext } from "../../lib/serverAuth";
import { loadPlan } from "../../lib/features";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const ctx = await getTenantContext(req);
  if (!ctx) return res.status(401).json({ error: "Unauthorized" });

  const { log_id } = req.body;
  if (!log_id) return res.status(400).json({ error: "log_id required" });

  // Fetch the failed log
  const { data: log, error: fetchErr } = await supabase
    .from("sms_logs")
    .select("*")
    .eq("id", log_id)
    .eq("tenant_id", ctx.tenantId)
    .single();

  if (fetchErr || !log) {
    return res.status(404).json({ error: "Log not found" });
  }

  const plan = await loadPlan(supabase, ctx.tenantId);
  if (!plan?.canWrite) return res.status(403).json({ error: "Your subscription has ended. Renew to send messages." });
  if (!plan.smsReady) return res.status(400).json({ error: "Your SMS account isn't connected yet." });

  // Resend from this business's own SMS account
  const result = await sendSMS(log.phone_number, log.message, plan.smsCreds);

  // Update log status
  const newStatus = result.success ? "Retried-Success" : "Retried-Failed";
  await supabase
    .from("sms_logs")
    .update({
      status: newStatus,
      retried_at: new Date().toISOString(),
    })
    .eq("id", log_id);

  return res.status(200).json({ success: result.success, result });
}
