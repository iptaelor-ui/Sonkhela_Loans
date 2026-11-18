// The logged-in business's subscription and features, for the dashboard.
import { getTenantContext, serviceClient, SONKHELA_TENANT_ID } from "../../lib/serverAuth";
import { loadPlan } from "../../lib/features";
import { todayLusaka, daysBetween } from "../../lib/platform";

export default async function handler(req, res) {
  const ctx = await getTenantContext(req);
  if (!ctx) return res.status(401).json({ error: "Unauthorized" });
  const svc = serviceClient();
  const plan = await loadPlan(svc, ctx.tenantId);
  if (!plan) return res.status(404).json({ error: "Business not found" });

  const [{ data: packages }, { data: sonkhela }] = await Promise.all([
    svc.from("packages").select("*").order("id"),
    svc.from("business").select("name,phone,email").eq("tenant_id", SONKHELA_TENANT_ID).order("id").limit(1).maybeSingle(),
  ]);
  const t = plan.tenant;
  return res.status(200).json({
    isSonkhela: plan.isSonkhela,
    status: t.status,
    canWrite: plan.canWrite,
    features: plan.features,
    smsReady: plan.smsReady,
    package: (packages || []).find((p) => p.id === t.package_id) || null,
    packages: packages || [],
    subscription_end: t.subscription_end,
    days_left: t.subscription_end ? daysBetween(todayLusaka(), t.subscription_end) : null,
    contact: { name: sonkhela?.name || "Sonkhela Soft Loans", phone: sonkhela?.phone || "", email: sonkhela?.email || "" },
  });
}
