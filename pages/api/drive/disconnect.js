// Stops saving to Google Drive. Files already in Drive stay there.
import { getTenantContext, serviceClient } from "../../../lib/serverAuth";
import { revoke } from "../../../lib/drive";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  const ctx = await getTenantContext(req);
  if (!ctx) return res.status(401).json({ error: "Unauthorized" });
  if (ctx.role !== "owner") return res.status(403).json({ error: "Only the business owner can do this." });
  const svc = serviceClient();
  const { data: acc } = await svc.from("drive_accounts").select("refresh_token").eq("tenant_id", ctx.tenantId).maybeSingle();
  await svc.from("drive_accounts").delete().eq("tenant_id", ctx.tenantId);
  if (acc) await revoke(acc.refresh_token);
  return res.status(200).json({ ok: true });
}
