// Hourly (cron-job.org, x-cron-secret header): moves anything not yet in Drive for
// every connected business, e.g. applications sent through sonkhela.com.
import { serviceClient } from "../../lib/serverAuth";
import { syncPending } from "../../lib/driveSync";
export const config = { maxDuration: 60 };

export default async function handler(req, res) {
  if (req.headers["x-cron-secret"] !== process.env.CRON_SECRET) return res.status(401).json({ error: "Unauthorized" });
  const out = await syncPending(serviceClient(), { budgetMs: 45000 });
  return res.status(200).json({ ok: true, ...out });
}
