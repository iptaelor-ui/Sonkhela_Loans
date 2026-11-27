// After a loan is saved or edited in the dashboard: update its Drive folder.
import { getTenantContext, serviceClient } from "../../../lib/serverAuth";
import { syncLoan } from "../../../lib/driveSync";
export const config = { maxDuration: 60 };

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  const ctx = await getTenantContext(req);
  if (!ctx) return res.status(401).json({ error: "Unauthorized" });
  const svc = serviceClient();
  const { data: loan } = await svc.from("loans").select("id").eq("id", req.body?.loanId).eq("tenant_id", ctx.tenantId).maybeSingle();
  if (!loan) return res.status(404).json({ error: "Loan not found" });
  try {
    const r = await syncLoan(svc, loan.id, { force: !!req.body?.force });
    return res.status(200).json({ ok: true, ...r });
  } catch (e) {
    console.error("sync-loan:", e);
    return res.status(502).json({ error: e.message });
  }
}
