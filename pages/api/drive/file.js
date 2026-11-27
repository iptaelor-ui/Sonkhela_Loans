// Shows an application photo that now lives in Drive. The link is signed and
// expires, so only someone the dashboard gave it to can open it.
import { serviceClient } from "../../../lib/serverAuth";
import { verify, downloadFile } from "../../../lib/drive";

export default async function handler(req, res) {
  const p = verify(req.query.t);
  if (!p?.id || !p?.tid) return res.status(403).send("Link expired");
  try {
    const { bytes, mime } = await downloadFile(serviceClient(), p.tid, p.id);
    res.setHeader("Content-Type", mime);
    res.setHeader("Cache-Control", "private, max-age=3600");
    return res.status(200).send(bytes);
  } catch (e) {
    return res.status(404).send("File not found in Google Drive");
  }
}
