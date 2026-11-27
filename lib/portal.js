// Works out which client portal a request/page is on, from the subdomain.
//   copperbelt.sonkhela.com -> "copperbelt"
//   admin.sonkhela.com / www / sonkhela.com -> null (Sonkhela itself)
// On Vercel previews and localhost (not *.sonkhela.com) you can test a portal
// with ?portal=copperbelt in the URL.
export const ROOT_DOMAIN = "sonkhela.com";
const NON_PORTAL = new Set(["admin", "www"]);

export function slugFromHost(host) {
  const h = String(host || "").toLowerCase().split(":")[0];
  if (!h.endsWith("." + ROOT_DOMAIN)) return null;
  const sub = h.slice(0, -(ROOT_DOMAIN.length + 1));
  if (!sub || sub.includes(".") || NON_PORTAL.has(sub)) return null;
  return sub;
}

const isSonkhelaHost = (host) => {
  const h = String(host || "").toLowerCase().split(":")[0];
  return h === ROOT_DOMAIN || h.endsWith("." + ROOT_DOMAIN);
};

// Browser only
export function currentPortalSlug() {
  if (typeof window === "undefined") return null;
  const host = window.location.host;
  const fromHost = slugFromHost(host);
  if (fromHost) return fromHost;
  if (isSonkhelaHost(host)) return null;
  // preview / localhost testing
  const q = new URLSearchParams(window.location.search).get("portal");
  try {
    if (q) sessionStorage.setItem("portal", q);
    return q || sessionStorage.getItem("portal");
  } catch {
    return q;
  }
}

// Server only: { tenant, biz, accepting } for the portal this request is on, or null.
export async function resolvePortal(svc, req) {
  const host = req.headers["x-forwarded-host"] || req.headers.host || "";
  let slug = slugFromHost(host);
  if (!slug && !isSonkhelaHost(host)) slug = req.query?.portal || req.body?.portal || null;
  if (!slug) return null;

  const { data: tenant } = await svc
    .from("tenants")
    .select("id,slug,code,business_name,status,contact_email,contact_phone")
    .eq("slug", String(slug).toLowerCase())
    .maybeSingle();
  if (!tenant) return null;

  const { data: biz } = await svc
    .from("business")
    .select("name,tagline,phone,email,address,logo,theme,loan_types")
    .eq("tenant_id", tenant.id)
    .order("id")
    .limit(1)
    .maybeSingle();

  return {
    tenant,
    biz: biz || {},
    accepting: ["trial", "active", "grace"].includes(tenant.status),
  };
}
