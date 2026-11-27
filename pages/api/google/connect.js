// Starts "Connect Google Drive": returns Google's sign-in address for this business.
import { getTenantContext } from "../../../lib/serverAuth";
import { authUrl, driveConfigured, sign } from "../../../lib/drive";

const okReturn = (u) => {
  try { const h = new URL(u).hostname; return h === "localhost" || h.endsWith(".sonkhela.com") || h === "sonkhela.com" || h.endsWith(".vercel.app"); } catch { return false; }
};

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  const ctx = await getTenantContext(req);
  if (!ctx) return res.status(401).json({ error: "Unauthorized" });
  if (ctx.role !== "owner") return res.status(403).json({ error: "Only the business owner can connect Google Drive." });
  if (!driveConfigured()) return res.status(400).json({ error: "Google Drive isn't set up on the server yet (GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET)." });
  const back = okReturn(req.body?.returnTo) ? req.body.returnTo : "https://admin.sonkhela.com/";
  const state = sign({ t: ctx.tenantId, u: ctx.user.id, r: back, exp: Date.now() + 15 * 60 * 1000 });
  return res.status(200).json({ url: authUrl(state) });
}
