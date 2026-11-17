// Daily cron (cron-job.org, with the x-cron-secret header):
// moves client subscriptions along when their end date passes.
//   trial  -> suspended   (trial ended without paying)
//   active -> grace       (paid period ended; GRACE_DAYS to pay)
//   grace  -> suspended   (grace period over)
// Sonkhela itself has no end date, so it is never touched.
import { serviceClient } from "../../lib/serverAuth";
import { todayLusaka, addDays, GRACE_DAYS } from "../../lib/platform";

export default async function handler(req, res) {
  if (req.headers["x-cron-secret"] !== process.env.CRON_SECRET) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  const svc = serviceClient();
  const today = todayLusaka();
  const graceCutoff = addDays(today, -GRACE_DAYS);
  const changes = {};

  const run = async (label, from, to, endBefore) => {
    const { data, error } = await svc
      .from("tenants")
      .update({ status: to })
      .eq("status", from)
      .not("subscription_end", "is", null)
      .lt("subscription_end", endBefore)
      .select("business_name");
    if (error) throw error;
    changes[label] = (data || []).map((t) => t.business_name);
  };

  try {
    await run("trial_ended", "trial", "suspended", today);
    await run("grace_ended", "grace", "suspended", graceCutoff);
    await run("entered_grace", "active", "grace", today);
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
  return res.status(200).json({ ok: true, today, changes });
}
