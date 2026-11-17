import { getTenantContext, SONKHELA_TENANT_ID } from "../../lib/serverAuth";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const ctx = await getTenantContext(req);
  if (!ctx) return res.status(401).json({ error: "Unauthorized" });
  // Sonkhela's Google Sheet only receives Sonkhela's loans
  if (ctx.tenantId !== SONKHELA_TENANT_ID) return res.status(200).json({ success: true, skipped: true });

  const sheetUrl = process.env.GOOGLE_SHEET_URL;
  if (!sheetUrl) return res.status(500).json({ error: "GOOGLE_SHEET_URL not set in Vercel environment variables." });

  const loan = req.body;
  if (!loan || !loan.id) return res.status(400).json({ error: "Loan data required" });

  try {
    const response = await fetch(sheetUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...loan, platform: "Sonkhela" }),
    });

    return res.status(200).json({ success: true });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
