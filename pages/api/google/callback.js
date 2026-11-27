// Google sends the business owner back here after they allow access to Drive.
import { serviceClient } from "../../../lib/serverAuth";
import { exchangeCode, verify, ensureRoot, revoke } from "../../../lib/drive";

export default async function handler(req, res) {
  const st = verify(req.query.state);
  const back = (msg) => {
    const base = st?.r || "https://admin.sonkhela.com/";
    const u = new URL(base); u.searchParams.set("drive", msg);
    res.redirect(302, u.toString());
  };
  if (!st) return res.status(400).send("This sign-in link has expired. Go back to Settings and click Connect Google Drive again.");
  if (req.query.error) return back("cancelled");
  try {
    const tok = await exchangeCode(String(req.query.code || ""));
    if (!tok.refresh_token) return back("no-refresh");
    const svc = serviceClient();
    const { data: old } = await svc.from("drive_accounts").select("refresh_token,email").eq("tenant_id", st.t).maybeSingle();
    const sameAccount = old && old.email === tok.email;
    const { error } = await svc.from("drive_accounts").upsert({
      tenant_id: st.t, email: tok.email, refresh_token: tok.refresh_token,
      ...(sameAccount ? {} : { root_id: null, loans_id: null, applications_id: null }),
      connected_at: new Date().toISOString(),
    });
    if (error) throw new Error(error.message);
    if (old && old.refresh_token !== tok.refresh_token) await revoke(old.refresh_token);
    await ensureRoot(svc, st.t); // create the folders now
    return back("connected");
  } catch (e) {
    console.error("drive callback:", e);
    return back("error");
  }
}
