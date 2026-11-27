// Is this business's Google Drive connected, and is anything still waiting to move?
import { getTenantContext, serviceClient } from "../../../lib/serverAuth";
import { driveConfigured, folderUrl } from "../../../lib/drive";

export default async function handler(req, res) {
  const ctx = await getTenantContext(req);
  if (!ctx) return res.status(401).json({ error: "Unauthorized" });
  const svc = serviceClient();
  const { data: acc } = await svc.from("drive_accounts").select("email,root_id,connected_at").eq("tenant_id", ctx.tenantId).maybeSingle();
  let pending = 0;
  if (acc) {
    const [{ count: a }, { count: l }] = await Promise.all([
      svc.from("applications").select("id", { count: "exact", head: true }).eq("tenant_id", ctx.tenantId).is("files_moved_at", null),
      svc.from("loans").select("id", { count: "exact", head: true }).eq("tenant_id", ctx.tenantId).is("drive_folder_id", null),
    ]);
    pending = (a || 0) + (l || 0);
  }
  return res.status(200).json({
    configured: driveConfigured(), canManage: ctx.role === "owner",
    connected: !!acc, email: acc?.email || null, connected_at: acc?.connected_at || null,
    folder: folderUrl(acc?.root_id), pending,
  });
}
