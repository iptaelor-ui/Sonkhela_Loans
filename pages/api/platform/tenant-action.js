// Super-admin actions on a client business: activate, change package,
// suspend/reactivate, reset owner password, edit details, set package prices.
import { getTenantContext, serviceClient, SONKHELA_TENANT_ID } from "../../../lib/serverAuth";
import { todayLusaka, addDays, tempPassword } from "../../../lib/platform";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  const ctx = await getTenantContext(req);
  if (!ctx) return res.status(401).json({ error: "Unauthorized" });
  if (!ctx.isPlatformAdmin) return res.status(403).json({ error: "Only the Sonkhela owner can manage clients." });

  const svc = serviceClient();
  const { action, tenantId } = req.body || {};

  // Package prices are not tied to one tenant
  if (action === "set_prices") {
    const prices = req.body.prices || {};
    for (const [id, price] of Object.entries(prices)) {
      const n = Number(price);
      if (![1, 2, 3].includes(Number(id)) || !(n >= 0)) return res.status(400).json({ error: "Invalid price." });
      const { error } = await svc.from("packages").update({ monthly_price: n }).eq("id", Number(id));
      if (error) return res.status(500).json({ error: error.message });
    }
    return res.status(200).json({ ok: true });
  }

  if (!tenantId) return res.status(400).json({ error: "tenantId required" });
  if (tenantId === SONKHELA_TENANT_ID) return res.status(400).json({ error: "Sonkhela's own account can't be changed here." });

  const { data: t, error: tErr } = await svc.from("tenants").select("*").eq("id", tenantId).single();
  if (tErr || !t) return res.status(404).json({ error: "Client not found" });

  const update = (fields) => svc.from("tenants").update(fields).eq("id", tenantId);

  switch (action) {
    case "activate": {
      // Add N days of paid time. Extends from the current end date if it's still in the future.
      const days = Number(req.body.days || 30);
      if (!(days >= 1 && days <= 400)) return res.status(400).json({ error: "Days must be between 1 and 400." });
      const today = todayLusaka();
      const from = t.status !== "trial" && t.subscription_end && t.subscription_end > today ? t.subscription_end : today;
      const fields = {
        status: "active",
        subscription_end: addDays(from, days),
        subscription_start: t.status === "trial" || !t.subscription_start ? today : t.subscription_start,
      };
      if (req.body.package_id) fields.package_id = Number(req.body.package_id);
      const { error } = await update(fields);
      if (error) return res.status(500).json({ error: error.message });
      return res.status(200).json({ ok: true, subscription_end: fields.subscription_end });
    }

    case "set_package": {
      const package_id = Number(req.body.package_id);
      if (![1, 2, 3].includes(package_id)) return res.status(400).json({ error: "Invalid package." });
      const { error } = await update({ package_id });
      if (error) return res.status(500).json({ error: error.message });
      return res.status(200).json({ ok: true });
    }

    case "set_status": {
      const status = req.body.status;
      if (!["active", "suspended", "cancelled"].includes(status)) return res.status(400).json({ error: "Invalid status." });
      const { error } = await update({ status });
      if (error) return res.status(500).json({ error: error.message });
      return res.status(200).json({ ok: true });
    }

    case "update_details": {
      const allowed = ["business_name", "contact_name", "contact_email", "contact_phone"];
      const fields = {};
      for (const k of allowed) if (k in req.body) fields[k] = String(req.body[k] || "").trim() || null;
      if ("business_name" in fields && !fields.business_name) return res.status(400).json({ error: "Business name can't be empty." });
      const { error } = await update(fields);
      if (error) return res.status(500).json({ error: error.message });
      return res.status(200).json({ ok: true });
    }

    case "reset_password": {
      // Resets the owner's password and returns a new temporary one to send them
      const { data: owner } = await svc
        .from("tenant_users").select("id").eq("tenant_id", tenantId).eq("role", "owner").limit(1).maybeSingle();
      if (!owner) return res.status(404).json({ error: "This client has no owner login." });
      const password = tempPassword();
      const { data: u, error } = await svc.auth.admin.updateUserById(owner.id, { password });
      if (error) return res.status(500).json({ error: error.message });
      return res.status(200).json({ ok: true, login: { url: "https://admin.sonkhela.com", email: u.user.email, password } });
    }

    case "delete": {
      // Only for clients with no loan records yet (e.g. a test or mistaken entry).
      const { count } = await svc.from("loans").select("id", { count: "exact", head: true }).eq("tenant_id", tenantId);
      const { count: settledCount } = await svc.from("settled_loans").select("id", { count: "exact", head: true }).eq("tenant_id", tenantId);
      if ((count || 0) + (settledCount || 0) > 0) return res.status(400).json({ error: "This client has loan records. Suspend or cancel instead." });
      const { data: members } = await svc.from("tenant_users").select("id").eq("tenant_id", tenantId);
      const { error } = await svc.from("tenants").delete().eq("id", tenantId); // cascades to business, tenant_users, etc.
      if (error) return res.status(500).json({ error: error.message });
      for (const m of members || []) await svc.auth.admin.deleteUser(m.id);
      return res.status(200).json({ ok: true });
    }

    default:
      return res.status(400).json({ error: "Unknown action" });
  }
}
