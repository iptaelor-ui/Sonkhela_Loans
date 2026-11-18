// What a business may use right now, based on its package and subscription status.
//   Sonkhela: everything, always, using the AT_* environment SMS account.
//   Clients:  their package's features while on trial, active or grace;
//             view-only (no features, no changes) when suspended or cancelled.
import { SONKHELA_TENANT_ID } from "./tenantIds";

export const FEATURE_COLS = {
  sms_reminders: "can_sms_reminders",
  custom_messaging: "can_custom_messaging",
  weekly_quotes: "can_weekly_quotes",
};
const OPEN = ["trial", "active", "grace"];

export async function loadPlan(svc, tenantId) {
  const isSonkhela = tenantId === SONKHELA_TENANT_ID;
  const { data: t } = await svc
    .from("tenants")
    .select("id,slug,code,business_name,status,subscription_end,package_id,at_username,at_api_key,at_sender_id,packages(*)")
    .eq("id", tenantId)
    .maybeSingle();
  if (!t) return null;

  const pkg = t.packages || {};
  const open = isSonkhela || OPEN.includes(t.status);
  const features = Object.fromEntries(
    Object.entries(FEATURE_COLS).map(([f, col]) => [f, isSonkhela || (open && !!pkg[col])])
  );
  const smsReady = isSonkhela || !!(t.at_username && t.at_api_key);
  return {
    tenant: t,
    isSonkhela,
    canWrite: open,
    features,
    smsReady,
    // undefined = Sonkhela's env account; clients never fall back to it
    smsCreds: isSonkhela ? undefined : { username: t.at_username || null, apiKey: t.at_api_key || null, senderId: t.at_sender_id || null },
  };
}

// Name used to sign texts ("- RT Credit")
export async function businessName(svc, tenantId, fallback) {
  const { data } = await svc.from("business").select("name").eq("tenant_id", tenantId).order("id").limit(1).maybeSingle();
  return data?.name || fallback || "Your lender";
}
