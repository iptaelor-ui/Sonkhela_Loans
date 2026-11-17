import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://zxxdvxzgqynkuveipxqc.supabase.co";
const ANON_KEY = "sb_publishable_h8ykxzJdMDPnse7cPB_O1Q_SxEk8jh8";

// Verifies the Authorization: Bearer <token> header against Supabase Auth.
// Returns the admin user, or null if the token is missing/invalid.
export async function requireAdmin(req) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) return null;
  try {
    const supa = createClient(SUPABASE_URL, ANON_KEY);
    const { data, error } = await supa.auth.getUser(token);
    if (error || !data?.user) return null;
    return data.user;
  } catch {
    return null;
  }
}

// Sonkhela Soft Loans is tenant #1 (fixed id from migration 001).
import { SONKHELA_TENANT_ID } from "./tenantIds";
export { SONKHELA_TENANT_ID };

// Logged-in user + the business (tenant) they belong to.
// Returns null if not logged in or not linked to any tenant.
// isPlatformAdmin = an owner of Sonkhela, i.e. you, who manages all clients.
export async function getTenantContext(req) {
  const user = await requireAdmin(req);
  if (!user) return null;
  const { data } = await serviceClient()
    .from("tenant_users")
    .select("tenant_id, role")
    .eq("id", user.id)
    .maybeSingle();
  if (!data) return null;
  return {
    user,
    tenantId: data.tenant_id,
    role: data.role,
    isPlatformAdmin: data.tenant_id === SONKHELA_TENANT_ID && data.role === "owner",
  };
}

// Server-only Supabase client that bypasses RLS.
// Requires SUPABASE_SERVICE_ROLE_KEY in Vercel environment variables.
export function serviceClient() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) throw new Error("SUPABASE_SERVICE_ROLE_KEY not configured");
  return createClient(SUPABASE_URL, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
