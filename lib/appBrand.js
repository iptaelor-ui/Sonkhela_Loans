// Name + logo for the installed app, per portal. Uses Supabase REST directly so it
// also works in the lightweight "edge" icon route.
import { slugFromHost } from "./portal";
import { SONKHELA_TENANT_ID } from "./tenantIds";

const URL_ = "https://zxxdvxzgqynkuveipxqc.supabase.co/rest/v1";

async function rest(path) {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) return null;
  const r = await fetch(`${URL_}/${path}`, { headers: { apikey: key, Authorization: `Bearer ${key}` } });
  if (!r.ok) return null;
  const rows = await r.json();
  return rows[0] || null;
}

export async function appBrand(host) {
  const slug = slugFromHost(host);
  let tenantId = SONKHELA_TENANT_ID, name = "Sonkhela Soft Loans";
  if (slug) {
    const t = await rest(`tenants?slug=eq.${encodeURIComponent(slug)}&select=id,business_name`);
    if (t) { tenantId = t.id; name = t.business_name; }
  }
  const biz = await rest(`business?tenant_id=eq.${tenantId}&select=name,logo&order=id.asc&limit=1`);
  return { slug, name: biz?.name || name, logo: biz?.logo || null };
}
