// Public (borrower's agreement page): after signing, save the signed PDF to Drive.
// Only acts when there is a signature not yet in Drive, so repeat calls do nothing.
import { serviceClient } from "../../../lib/serverAuth";
import { syncLoan } from "../../../lib/driveSync";
export const config = { maxDuration: 60 };

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  const id = String(req.body?.id || "");
  if (!/^[A-Za-z0-9-]{3,40}$/.test(id)) return res.status(400).json({ error: "Invalid id" });
  const svc = serviceClient();
  const { data: loan } = await svc.from("loans").select("id,client_signature,drive_files").eq("id", id).maybeSingle();
  if (!loan?.client_signature || loan.drive_files?.agreement_signed) return res.status(200).json({ ok: true, skipped: true });
  try { await syncLoan(svc, id); } catch (e) { console.error("sync-signed:", e); }
  return res.status(200).json({ ok: true });
}
