// Public: a loan agreement and the business that issued it (borrower's link).
// Replaces the get_agreement database function so each agreement shows the
// right lender's name, logo, signature and colours, not always Sonkhela's.
import { serviceClient } from "../../lib/serverAuth";

export default async function handler(req, res) {
  const id = String(req.query.id || "");
  if (!/^[A-Za-z0-9-]{3,40}$/.test(id)) return res.status(400).json({ error: "Invalid id" });
  const svc = serviceClient();

  let { data: loan } = await svc.from("loans").select("*").eq("id", id).maybeSingle();
  if (!loan) ({ data: loan } = await svc.from("settled_loans").select("*").eq("id", id).maybeSingle());
  if (!loan) return res.status(404).json({ error: "Not found" });

  const { data: business } = await svc
    .from("business")
    .select("name,tagline,phone,email,address,logo,signature,theme")
    .eq("tenant_id", loan.tenant_id)
    .order("id")
    .limit(1)
    .maybeSingle();

  res.setHeader("Cache-Control", "no-store");
  return res.status(200).json({ loan, business: business || {} });
}
