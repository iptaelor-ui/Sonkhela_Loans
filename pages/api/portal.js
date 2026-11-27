// Public: branding for the client portal on this subdomain (login + apply pages).
import { serviceClient } from "../../lib/serverAuth";
import { resolvePortal } from "../../lib/portal";
import { offeredTypes } from "../../lib/loanTypes";

export default async function handler(req, res) {
  const portal = await resolvePortal(serviceClient(), req);
  if (!portal) return res.status(404).json({ error: "Portal not found" });
  const { tenant, biz, accepting } = portal;
  res.setHeader("Cache-Control", "s-maxage=60, stale-while-revalidate=300");
  return res.status(200).json({
    slug: tenant.slug,
    name: biz.name || tenant.business_name,
    tagline: biz.tagline || "",
    phone: biz.phone || tenant.contact_phone || "",
    email: biz.email || tenant.contact_email || "",
    address: biz.address || "",
    logo: biz.logo || null,
    theme: biz.theme || "green",
    loanTypes: offeredTypes(biz.loan_types),
    accepting,
  });
}
