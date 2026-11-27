// Settings > "Move existing files to Drive": moves a batch, the page repeats until done.
import { getTenantContext, serviceClient } from "../../../lib/serverAuth";
import { syncPending } from "../../../lib/driveSync";
export const config = { maxDuration: 60 };

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  const ctx = await getTenantContext(req);
  if (!ctx) return res.status(401).json({ error: "Unauthorized" });
  const out = await syncPending(serviceClient(), { tenantId: ctx.tenantId, budgetMs: 40000 });
  return res.status(200).json(out);
}
