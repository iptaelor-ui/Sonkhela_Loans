// Google Drive storage for each business's own Google account.
// Scope drive.file: the system only sees files and folders it created itself.
//
// Layout in that account's Drive:
//   <Business> – Loans system/
//     Loans/<loan id> – <borrower>/        agreement PDF, collateral photo, NRC, signature
//     Applications/<date> – <applicant>/   photos uploaded with the application
import crypto from "crypto";

const TOKEN_URL = "https://oauth2.googleapis.com/token";
const API = "https://www.googleapis.com/drive/v3";
const UPLOAD = "https://www.googleapis.com/upload/drive/v3/files";
export const DRIVE_SCOPES = "https://www.googleapis.com/auth/drive.file openid email";
export const driveConfigured = () => !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
export const redirectUri = () => process.env.GOOGLE_REDIRECT_URI || "https://admin.sonkhela.com/api/google/callback";
const FOLDER = "application/vnd.google-apps.folder";

// ── Signing (OAuth state, private file links) ───────────────────────────────────
const secret = () => process.env.DRIVE_LINK_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY || "dev-secret";
export function sign(payload) {
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const mac = crypto.createHmac("sha256", secret()).update(body).digest("base64url");
  return `${body}.${mac}`;
}
export function verify(token) {
  const [body, mac] = String(token || "").split(".");
  if (!body || !mac) return null;
  const want = crypto.createHmac("sha256", secret()).update(body).digest("base64url");
  if (mac.length !== want.length || !crypto.timingSafeEqual(Buffer.from(mac), Buffer.from(want))) return null;
  const p = JSON.parse(Buffer.from(body, "base64url").toString());
  if (p.exp && Date.now() > p.exp) return null;
  return p;
}

// ── Google auth ────────────────────────────────────────────────────────────────
export function authUrl(state) {
  const q = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID, redirect_uri: redirectUri(), response_type: "code",
    scope: DRIVE_SCOPES, access_type: "offline", prompt: "consent", include_granted_scopes: "true", state,
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${q}`;
}

export async function exchangeCode(code) {
  const r = await fetch(TOKEN_URL, {
    method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ code, client_id: process.env.GOOGLE_CLIENT_ID, client_secret: process.env.GOOGLE_CLIENT_SECRET, redirect_uri: redirectUri(), grant_type: "authorization_code" }),
  });
  const j = await r.json();
  if (!r.ok) throw new Error(j.error_description || j.error || "Google sign-in failed");
  let email = null;
  try { email = JSON.parse(Buffer.from(j.id_token.split(".")[1], "base64url").toString()).email; } catch {}
  return { refresh_token: j.refresh_token, access_token: j.access_token, email };
}

const tokenCache = new Map();
async function accessToken(acc) {
  const hit = tokenCache.get(acc.tenant_id);
  if (hit && hit.exp > Date.now() + 60000 && hit.rt === acc.refresh_token) return hit.token;
  const r = await fetch(TOKEN_URL, {
    method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ client_id: process.env.GOOGLE_CLIENT_ID, client_secret: process.env.GOOGLE_CLIENT_SECRET, refresh_token: acc.refresh_token, grant_type: "refresh_token" }),
  });
  const j = await r.json();
  if (!r.ok) throw new Error(j.error === "invalid_grant" ? "Google Drive access was removed. Reconnect Google Drive in Settings." : (j.error_description || "Google token error"));
  tokenCache.set(acc.tenant_id, { token: j.access_token, exp: Date.now() + j.expires_in * 1000, rt: acc.refresh_token });
  return j.access_token;
}

async function api(token, path, init = {}) {
  const r = await fetch(path.startsWith("http") ? path : API + path, { ...init, headers: { Authorization: `Bearer ${token}`, ...(init.headers || {}) } });
  if (!r.ok) {
    const t = await r.text().catch(() => "");
    const e = new Error(`Drive ${r.status}: ${t.slice(0, 200)}`); e.status = r.status; throw e;
  }
  return r;
}

// ── Accounts & folders ─────────────────────────────────────────────────────────
export async function getAccount(svc, tenantId) {
  const { data } = await svc.from("drive_accounts").select("*").eq("tenant_id", tenantId).maybeSingle();
  return data || null;
}

const qEsc = (s) => String(s).replace(/\\/g, "\\\\").replace(/'/g, "\\'");
const cleanName = (s) => String(s || "").replace(/[\\/:*?"<>|]+/g, " ").replace(/\s+/g, " ").trim().slice(0, 120) || "Untitled";

export async function findOrCreateFolder(token, name, parent) {
  name = cleanName(name);
  const q = `name='${qEsc(name)}' and mimeType='${FOLDER}' and '${parent}' in parents and trashed=false`;
  const list = await (await api(token, `/files?q=${encodeURIComponent(q)}&fields=files(id)&pageSize=1`)).json();
  if (list.files?.length) return list.files[0].id;
  const created = await (await api(token, "/files?fields=id", {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, mimeType: FOLDER, parents: [parent] }),
  })).json();
  return created.id;
}

async function alive(token, id) {
  if (!id) return false;
  try { const f = await (await api(token, `/files/${id}?fields=id,trashed`)).json(); return !f.trashed; } catch { return false; }
}

// Makes sure the business's folders exist (recreates them if someone deleted them)
export async function ensureRoot(svc, tenantId) {
  const acc = await getAccount(svc, tenantId);
  if (!acc) return null;
  const token = await accessToken(acc);
  let { root_id, loans_id, applications_id } = acc;
  if (!(await alive(token, root_id))) {
    const { data: biz } = await svc.from("business").select("name").eq("tenant_id", tenantId).order("id").limit(1).maybeSingle();
    const { data: t } = await svc.from("tenants").select("business_name").eq("id", tenantId).maybeSingle();
    root_id = await findOrCreateFolder(token, `${biz?.name || t?.business_name || "Business"} – Loans system`, "root");
    loans_id = applications_id = null;
  }
  if (!(await alive(token, loans_id))) loans_id = await findOrCreateFolder(token, "Loans", root_id);
  if (!(await alive(token, applications_id))) applications_id = await findOrCreateFolder(token, "Applications", root_id);
  if (root_id !== acc.root_id || loans_id !== acc.loans_id || applications_id !== acc.applications_id) {
    await svc.from("drive_accounts").update({ root_id, loans_id, applications_id }).eq("tenant_id", tenantId);
  }
  return { token, acc, rootId: root_id, loansId: loans_id, appsId: applications_id };
}

// ── Files ──────────────────────────────────────────────────────────────────────
// Upload new, or replace the content of an existing file (keeps its link)
export async function uploadFile(token, { bytes, name, mime, parent, replaceId }) {
  if (replaceId) {
    try {
      const r = await api(token, `${UPLOAD}/${replaceId}?uploadType=media&fields=id`, { method: "PATCH", headers: { "Content-Type": mime }, body: bytes });
      return (await r.json()).id;
    } catch (e) { if (e.status !== 404) throw e; } // deleted in Drive: upload fresh
  }
  const boundary = "sonkhela" + crypto.randomBytes(8).toString("hex");
  const meta = JSON.stringify({ name: cleanName(name), parents: [parent] });
  const body = Buffer.concat([
    Buffer.from(`--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${meta}\r\n--${boundary}\r\nContent-Type: ${mime}\r\n\r\n`),
    Buffer.from(bytes),
    Buffer.from(`\r\n--${boundary}--`),
  ]);
  const r = await api(token, `${UPLOAD}?uploadType=multipart&fields=id`, { method: "POST", headers: { "Content-Type": `multipart/related; boundary=${boundary}` }, body });
  return (await r.json()).id;
}

export async function copyFile(token, id, name, parent) {
  const r = await api(token, `/files/${id}/copy?fields=id`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: cleanName(name), parents: [parent] }) });
  return (await r.json()).id;
}

export async function downloadFile(svc, tenantId, id) {
  const acc = await getAccount(svc, tenantId);
  if (!acc) throw new Error("Google Drive isn't connected.");
  const token = await accessToken(acc);
  const r = await api(token, `/files/${id}?alt=media`);
  return { bytes: Buffer.from(await r.arrayBuffer()), mime: r.headers.get("content-type") || "application/octet-stream" };
}

export async function revoke(refreshToken) {
  try { await fetch(`https://oauth2.googleapis.com/revoke?token=${encodeURIComponent(refreshToken)}`, { method: "POST" }); } catch {}
}

export const folderUrl = (id) => (id ? `https://drive.google.com/drive/folders/${id}` : null);

// data:image/jpeg;base64,... -> { bytes, mime, ext }
export function fromDataUrl(dataUrl) {
  const m = /^data:([\w/+.-]+);base64,(.+)$/s.exec(dataUrl || "");
  if (!m) return null;
  const mime = m[1];
  const ext = (mime.split("/")[1] || "bin").replace("jpeg", "jpg").replace("svg+xml", "svg");
  return { bytes: Buffer.from(m[2], "base64"), mime, ext };
}
