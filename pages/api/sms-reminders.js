// pages/api/send-reminders.js
// Checks due dates and sends SMS reminders automatically
// Triggered daily at 8AM by cron-job.org
//
// Sends exactly 2 reminder types:
//   1. Two days before due date (gentle + slightly urgent)
//   2. On the due date (pay now)

import { createClient } from "@supabase/supabase-js";
import { sendSMS } from "../../lib/sms";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

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

  // Fetch all active (unsettled) loans with a phone number
  const { data: loans, error } = await supabase
    .from("loans")
    .select("client_name, client_phone, amount, due_date, status")
    .not("status", "eq", "settled")
    .not("client_phone", "is", null);

  if (error) {
    console.error("Supabase error:", error);
    return res.status(500).json({ error: error.message });
  }

  const results = [];

  for (const loan of loans) {
    const dueDate = new Date(loan.due_date);
    if (isNaN(dueDate.getTime())) continue; // skip bad dates
    dueDate.setHours(0, 0, 0, 0);

    const diffDays = Math.round((dueDate - today) / (1000 * 60 * 60 * 24));
    const name = loan.client_name?.split(" ")[0] || "Client";
    const amount = Number(loan.amount).toLocaleString();
    const dueDateStr = dueDate.toLocaleDateString("en-GB", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });

    let message = null;
    let trigger = null;

    if (diffDays === 2) {
      // 2 days before: gentle but with a nudge of urgency
      message =
        `Hi ${name}, just a reminder that your Sonkhela loan of K${amount} is due in 2 days on ${dueDateStr}. ` +
        `Please make sure funds are ready - don't leave it too late! - Sonkhela Capital`;
      trigger = "2_days_before";
    } else if (diffDays === 0) {
      // Due today: firm pay now message
      message =
        `Hi ${name}, TODAY is your repayment day! Your Sonkhela loan of K${amount} is due now. ` +
        `Please pay immediately to avoid penalties. Thank you! - Sonkhela Capital`;
      trigger = "due_today";
    }

    if (message && loan.client_phone) {
      const smsResult = await sendSMS(loan.client_phone, message);
      results.push({
        client: loan.client_name,
        phone: loan.client_phone,
        trigger,
        sent: smsResult.success,
      });
    }
  }

  // Log to Supabase (non-blocking, ignores errors if table missing)
  if (results.length > 0) {
    try {
      await supabase.from("sms_logs").insert({
        type: "reminder",
        message: `Sent ${results.length} reminder(s)`,
        recipients_count: results.filter((r) => r.sent).length,
        sent_at: new Date().toISOString(),
      });
    } catch (e) {
      console.warn("sms_logs insert skipped:", e.message);
    }
  }

  return res.status(200).json({
    success: true,
    processed: results.length,
    results,
  });
}
