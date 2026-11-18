// pages/api/sms-reminders.js
// Checks due dates and sends SMS reminders automatically
// Triggered daily at 8AM by cron-job.org
//
// Sends exactly 2 reminder types:
//   1. Two days before due date (gentle + slightly urgent)
//   2. On the due date (pay now)
//
// Runs for Sonkhela (its own AT account, wording unchanged) and for every client
// business whose package includes SMS reminders and whose SMS account is connected.
// Each business's borrowers are texted from that business's own account.

import { createClient } from "@supabase/supabase-js";
import { sendSMS } from "../../lib/sms";
import { SONKHELA_TENANT_ID } from "../../lib/serverAuth";
import { loadPlan, businessName } from "../../lib/features";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

function messageFor(diffDays, { name, amount, dueDateStr }, isSonkhela, biz) {
  if (isSonkhela) {
    if (diffDays === 2)
      return `Hi ${name}, just a reminder that your Sonkhela loan of K${amount} is due in 2 days on ${dueDateStr}. ` +
        `Please make sure funds are ready - don't leave it too late! - Sonkhela Capital`;
    if (diffDays === 0)
      return `Hi ${name}, TODAY is your repayment day! Your Sonkhela loan of K${amount} is due now. ` +
        `Please pay immediately to avoid penalties. Thank you! - Sonkhela Capital`;
    return null;
  }
  if (diffDays === 2)
    return `Hi ${name}, a reminder that your loan of K${amount} with ${biz} is due in 2 days on ${dueDateStr}. ` +
      `Please make sure funds are ready. - ${biz}`;
  if (diffDays === 0)
    return `Hi ${name}, TODAY is your repayment day! Your loan of K${amount} with ${biz} is due now. ` +
      `Please pay today to avoid penalties. Thank you! - ${biz}`;
  return null;
}

export default async function handler(req, res) {
  // Protect endpoint with a secret token
  if (req.headers["x-cron-secret"] !== process.env.CRON_SECRET) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  // Compute "today" in Zambia time (server runs on UTC)
  const lusakaNow = new Date(
    new Date().toLocaleString("en-US", { timeZone: "Africa/Lusaka" })
  );
  const today = new Date(Date.UTC(lusakaNow.getFullYear(), lusakaNow.getMonth(), lusakaNow.getDate()));

  // Sonkhela + every client that could currently have the feature
  const { data: tenants, error: tErr } = await supabase
    .from("tenants")
    .select("id, business_name")
    .in("status", ["trial", "active", "grace"]);
  if (tErr) return res.status(500).json({ error: tErr.message });
  const ids = [SONKHELA_TENANT_ID, ...tenants.map((t) => t.id).filter((id) => id !== SONKHELA_TENANT_ID)];

  const summary = [];
  const results = [];

  for (const tenantId of ids) {
    const plan = await loadPlan(supabase, tenantId);
    if (!plan) continue;
    const label = plan.tenant.business_name;
    if (!plan.features.sms_reminders) { summary.push({ business: label, skipped: "not in package" }); continue; }
    if (!plan.smsReady) { summary.push({ business: label, skipped: "SMS account not connected" }); continue; }
    const biz = plan.isSonkhela ? "Sonkhela" : await businessName(supabase, tenantId, label);

    // All active (unsettled) loans of this business with a phone number
    const { data: loans, error } = await supabase
      .from("loans")
      .select("client_name, client_phone, amount, due_date, status")
      .eq("tenant_id", tenantId)
      .not("status", "eq", "settled")
      .not("client_phone", "is", null);
    if (error) { summary.push({ business: label, error: error.message }); continue; }

    const mine = [];
    for (const loan of loans) {
      const dueDate = new Date(loan.due_date);
      if (isNaN(dueDate.getTime())) continue; // skip bad dates
      dueDate.setHours(0, 0, 0, 0);

      const diffDays = Math.round((dueDate - today) / (1000 * 60 * 60 * 24));
      const details = {
        name: loan.client_name?.split(" ")[0] || "Client",
        amount: Number(loan.amount).toLocaleString(),
        dueDateStr: dueDate.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" }),
      };
      const message = messageFor(diffDays, details, plan.isSonkhela, biz);
      if (message && loan.client_phone) {
        const smsResult = await sendSMS(loan.client_phone, message, plan.smsCreds);
        mine.push({
          business: label,
          client: loan.client_name,
          phone: loan.client_phone,
          trigger: diffDays === 2 ? "2_days_before" : "due_today",
          sent: smsResult.success,
        });
      }
    }

    // Log per business (non-blocking, ignores errors if table missing)
    if (mine.length > 0) {
      try {
        await supabase.from("sms_logs").insert({
          tenant_id: tenantId,
          type: "reminder",
          message: `Sent ${mine.length} reminder(s)`,
          recipients_count: mine.filter((r) => r.sent).length,
          sent_at: new Date().toISOString(),
        });
      } catch (e) {
        console.warn("sms_logs insert skipped:", e.message);
      }
    }
    summary.push({ business: label, reminders: mine.length });
    results.push(...mine);
  }

  return res.status(200).json({
    success: true,
    processed: results.length,
    businesses: summary,
    results,
  });
}
