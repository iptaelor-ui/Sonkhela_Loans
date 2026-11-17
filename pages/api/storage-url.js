import { createClient } from "@supabase/supabase-js";
import { getTenantContext, SONKHELA_TENANT_ID } from "../../lib/serverAuth";

// Uses the SERVICE ROLE key (server-side only, never exposed to the browser)
// so the loan-documents bucket can stay fully private.
export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const ctx = await getTenantContext(req);
  if (!ctx) return res.status(401).json({ error: "Unauthorized" });

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) return res.status(500).json({ error: "Add SUPABASE_SERVICE_ROLE_KEY to Vercel environment variables." });

  const { path } = req.body || {};
  if (!path || typeof path !== "string") return res.status(400).json({ error: "path required" });
  // Sonkhela's website uploads to collateral/ and nrc/.
  // Client portals upload to t/<their business id>/collateral|nrc/, and a business
  // can only open files in its own folder.
  const sonkhelaPath = /^(collateral|nrc)\/[\w.\-]+$/.test(path);
  const tenantPath = new RegExp(`^t/${ctx.tenantId}/(collateral|nrc)/[\\w.\\-]+$`).test(path);
  if (!(tenantPath || (sonkhelaPath && ctx.tenantId === SONKHELA_TENANT_ID))) {
    return res.status(403).json({ error: "Forbidden" });
  }

  const supabase = createClient("https://zxxdvxzgqynkuveipxqc.supabase.co", serviceKey);
  const { data, error } = await supabase.storage.from("loan-documents").createSignedUrl(path, 3600);
  if (error || !data?.signedUrl) return res.status(500).json({ error: error?.message || "Could not sign URL" });

  return res.status(200).json({ url: data.signedUrl });
}
