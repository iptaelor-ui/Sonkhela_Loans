// The collateral photo of a loan, now stored in the business's Google Drive.
// Same visibility as the agreement page it appears on (anyone with the loan link).
import { serviceClient } from "../../lib/serverAuth";
import { downloadFile } from "../../lib/drive";

export default async function handler(req, res) {
  const id = String(req.query.loan || "");
  if (!/^[A-Za-z0-9-]{3,40}$/.test(id)) return res.status(400).send("Invalid");
  const svc = serviceClient();
  let { data: loan } = await svc.from("loans").select("tenant_id,collateral_photo").eq("id", id).maybeSingle();
  if (!loan) ({ data: loan } = await svc.from("settled_loans").select("tenant_id,collateral_photo").eq("id", id).maybeSingle());
  const fileId = loan?.collateral_photo?.startsWith("drive:") ? loan.collateral_photo.slice(6) : null;
  if (!fileId) return res.status(404).send("No photo");
  try {
    const { bytes, mime } = await downloadFile(svc, loan.tenant_id, fileId);
    res.setHeader("Content-Type", mime);
    res.setHeader("Cache-Control", "private, max-age=3600");
    return res.status(200).send(bytes);
  } catch {
    return res.status(404).send("Photo not found in Google Drive");
  }
}
