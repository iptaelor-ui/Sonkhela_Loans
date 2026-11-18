// Super-admin: list all client businesses (GET) and create a new one (POST).
// Only owners of Sonkhela (tenant #1) can use this.
import { getTenantContext, serviceClient, SONKHELA_TENANT_ID } from "../../../lib/serverAuth";
import { RESERVED_SLUGS, SLUG_RE, todayLusaka, addDays, daysBetween, tempPassword } from "../../../lib/platform";
import { makeCode } from "../../../lib/codes";

const TENANT_COLS =
  "id,slug,code,business_name,contact_name,contact_email,contact_phone,package_id,status,subscription_start,subscription_end,at_sender_id,created_at";

export default async function handler(req, res) {
  const ctx = await getTenantContext(req);
  if (!ctx) return res.status(401).json({ error: "Unauthorized" });
  if (!ctx.isPlatformAdmin) return res.status(403).json({ error: "Only the Sonkhela owner can manage clients." });

  const svc = serviceClient();
  if (req.method === "GET") return list(svc, res);
  if (req.method === "POST") return create(svc, req, res);
  return res.status(405).json({ error: "Method not allowed" });
}

async function list(svc, res) {
  const [tenantsRes, pkgRes, membersRes, usersRes] = await Promise.all([
    svc.from("tenants").select(TENANT_COLS).order("created_at", { ascending: true }),
    svc.from("packages").select("*").order("id"),
    svc.from("tenant_users").select("id,tenant_id,role"),
    svc.auth.admin.listUsers({ page: 1, perPage: 1000 }),
  ]);
  if (tenantsRes.error) return res.status(500).json({ error: tenantsRes.error.message });

  const emailById = new Map((usersRes.data?.users || []).map((u) => [u.id, u.email]));
  const today = todayLusaka();

  const tenants = await Promise.all(
    tenantsRes.data.map(async (t) => {
      const { count } = await svc
        .from("loans")
        .select("id", { count: "exact", head: true })
        .eq("tenant_id", t.id);
      const users = (membersRes.data || [])
        .filter((m) => m.tenant_id === t.id)
        .map((m) => ({ id: m.id, role: m.role, email: emailById.get(m.id) || "?" }));
      return {
        ...t,
        is_sonkhela: t.id === SONKHELA_TENANT_ID,
        loan_count: count || 0,
        users,
        days_left: t.subscription_end ? daysBetween(today, t.subscription_end) : null,
      };
    })
  );

  return res.status(200).json({ tenants, packages: pkgRes.data || [], today });
}

async function create(svc, req, res) {
  const b = req.body || {};
  const business_name = String(b.business_name || "").trim();
  const slug = String(b.slug || "").trim().toLowerCase();
  const owner_email = String(b.owner_email || "").trim().toLowerCase();
  const package_id = Number(b.package_id || 1);
  const trial_days = Math.min(Math.max(Number(b.trial_days ?? 14), 0), 90);

  if (!business_name) return res.status(400).json({ error: "Business name is required." });
  if (!SLUG_RE.test(slug)) return res.status(400).json({ error: "Portal name: lowercase letters, numbers and dashes only (e.g. copperbelt-loans)." });
  if (RESERVED_SLUGS.has(slug)) return res.status(400).json({ error: `"${slug}" is reserved. Choose another portal name.` });
  if (!/^\S+@\S+\.\S+$/.test(owner_email)) return res.status(400).json({ error: "A valid owner email is required." });
  if (![1, 2, 3].includes(package_id)) return res.status(400).json({ error: "Invalid package." });

  const { data: taken } = await svc.from("tenants").select("id").eq("slug", slug).maybeSingle();
  if (taken) return res.status(400).json({ error: `Portal name "${slug}" is already in use.` });

  // Short code for numbering (RTC-APP-2026-000001); add a number if taken
  const base = makeCode(business_name);
  let code = base;
  for (let i = 2; i < 100; i++) {
    const { data: clash } = await svc.from("tenants").select("id").eq("code", code).maybeSingle();
    if (!clash) break;
    code = base + i;
  }

  const password = tempPassword();
  const today = todayLusaka();

  // 1. Login account for the client's owner
  const { data: userData, error: userErr } = await svc.auth.admin.createUser({
    email: owner_email,
    password,
    email_confirm: true,
  });
  if (userErr) {
    const msg = /already/i.test(userErr.message)
      ? "That email already has a login. Use a different email for this client."
      : userErr.message;
    return res.status(400).json({ error: msg });
  }
  const userId = userData.user.id;

  let tenantId = null;
  try {
    // 2. The tenant (business) row
    const { data: tenant, error: tErr } = await svc
      .from("tenants")
      .insert({
        slug,
        code,
        business_name,
        contact_name: b.contact_name || null,
        contact_email: b.contact_email || owner_email,
        contact_phone: b.contact_phone || null,
        package_id,
        status: "trial",
        subscription_start: today,
        subscription_end: addDays(today, trial_days),
      })
      .select("id")
      .single();
    if (tErr) throw tErr;
    tenantId = tenant.id;

    // 3. Link the login to the tenant
    const { error: mErr } = await svc
      .from("tenant_users")
      .insert({ id: userId, tenant_id: tenantId, role: "owner" });
    if (mErr) throw mErr;

    // 4. Branding/profile row (name, phone, logo...) used by the dashboard and PDFs
    const bizRow = {
      tenant_id: tenantId,
      name: business_name,
      phone: b.contact_phone || "",
      email: b.contact_email || owner_email,
    };
    let { error: bErr } = await svc.from("business").insert(bizRow);
    if (bErr && (bErr.code === "23502" || bErr.code === "23505")) {
      // business.id has no default (23502), or its counter is behind the
      // existing rows (23505 duplicate key): use the next free number
      const { data: maxRow } = await svc.from("business").select("id").order("id", { ascending: false }).limit(1).maybeSingle();
      ({ error: bErr } = await svc.from("business").insert({ ...bizRow, id: (maxRow?.id || 0) + 1 }));
    }
    if (bErr) throw bErr;
  } catch (err) {
    // Undo everything so a failed attempt leaves nothing half-made
    if (tenantId) await svc.from("tenants").delete().eq("id", tenantId);
    await svc.auth.admin.deleteUser(userId);
    console.error("create tenant failed:", err);
    return res.status(500).json({ error: "Could not create client: " + (err.message || "unknown error") });
  }

  return res.status(200).json({
    ok: true,
    tenantId,
    slug,
    login: { url: `https://${slug}.sonkhela.com`, email: owner_email, password },
  });
}
