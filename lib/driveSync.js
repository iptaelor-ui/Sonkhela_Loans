// Moves a business's files into its Google Drive and keeps each loan's folder up to date.
// Everything is safe to run again: finished work is skipped.
import { ensureRoot, findOrCreateFolder, uploadFile, copyFile, downloadFile, fromDataUrl, getAccount } from "./drive";
import { buildAgreementPdf } from "./agreementPdf";
import { calcLoan, installmentInfo, isOverdue, fmt, fmtDate } from "../pages/shared";

const BUCKET = "loan-documents";
const isDrive = (v) => typeof v === "string" && v.startsWith("drive:");
const driveId = (v) => (isDrive(v) ? v.slice(6) : null);
const extOf = (path, mime) => (path && /\.(\w{2,5})$/.exec(path)?.[1]) || (mime || "").split("/")[1]?.replace("jpeg", "jpg") || "jpg";

async function fromStorage(svc, path) {
  const { data, error } = await svc.storage.from(BUCKET).download(path);
  if (error) throw new Error(`Could not read ${path}: ${error.message}`);
  return { bytes: Buffer.from(await data.arrayBuffer()), mime: data.type || "image/jpeg" };
}

// ── Applications ───────────────────────────────────────────────────────────────
// Photos uploaded with an application go to Applications/<date> – <name>/,
// then the Supabase copies are deleted. Paths become "drive:<file id>".
export async function moveApplication(svc, appId) {
  const { data: app } = await svc
    .from("applications")
    .select("id,tenant_id,full_name,app_ref,created_at,collateral_images,nrc_front,nrc_back,drive_folder_id")
    .eq("id", appId)
    .maybeSingle();
  if (!app) return { skipped: "not found" };
  const imgs = Array.isArray(app.collateral_images) ? app.collateral_images : [];
  const pending = [...imgs, app.nrc_front, app.nrc_back].filter((p) => p && !isDrive(p));
  if (!pending.length) {
    if (!app.drive_folder_id) await svc.from("applications").update({ files_moved_at: new Date().toISOString() }).eq("id", app.id);
    return { skipped: "nothing to move" };
  }
  const root = await ensureRoot(svc, app.tenant_id);
  if (!root) return { skipped: "Drive not connected" };
  const { token, appsId } = root;

  const day = (app.created_at || new Date().toISOString()).slice(0, 10);
  const folder = app.drive_folder_id || (await findOrCreateFolder(token, `${day} – ${app.full_name}${app.app_ref ? ` (${app.app_ref})` : ""}`, appsId));

  const moved = [];
  const put = async (path, name) => {
    if (!path || isDrive(path)) return path;
    const { bytes, mime } = await fromStorage(svc, path);
    const id = await uploadFile(token, { bytes, mime, name: `${name}.${extOf(path, mime)}`, parent: folder });
    moved.push(path);
    return `drive:${id}`;
  };
  const newImgs = [];
  for (let i = 0; i < imgs.length; i++) newImgs.push(await put(imgs[i], `Collateral ${i + 1}`));
  const nrc_front = await put(app.nrc_front, "NRC front");
  const nrc_back = await put(app.nrc_back, "NRC back");

  const { error } = await svc.from("applications").update({
    collateral_images: newImgs, nrc_front, nrc_back, drive_folder_id: folder, files_moved_at: new Date().toISOString(),
  }).eq("id", app.id);
  if (error) throw new Error(error.message);
  if (moved.length) await svc.storage.from(BUCKET).remove(moved);
  return { moved: moved.length, folder };
}

// ── Loans ──────────────────────────────────────────────────────────────────────
// One folder per loan: Loans/<loan id> – <borrower>/ with the agreement PDF
// (re-made once signed), collateral photo, borrower signature and the
// documents from the application it came from.
export async function syncLoan(svc, loanId, { force = false } = {}) {
  let table = "loans";
  let { data: loan } = await svc.from("loans").select("*").eq("id", loanId).maybeSingle();
  if (!loan) return { skipped: "not found" };
  const root = await ensureRoot(svc, loan.tenant_id);
  if (!root) return { skipped: "Drive not connected" };
  const { token, loansId } = root;

  const files = { ...(loan.drive_files || {}) };
  const folder = loan.drive_folder_id || (await findOrCreateFolder(token, `${loan.id} – ${loan.client_name || "Borrower"}`, loansId));
  const update = { drive_folder_id: folder };

  // Collateral photo: upload, then keep only a pointer in the database
  if (loan.collateral_photo && !isDrive(loan.collateral_photo)) {
    const f = fromDataUrl(loan.collateral_photo);
    if (f) {
      files.collateral = await uploadFile(token, { bytes: f.bytes, mime: f.mime, name: `Collateral photo.${f.ext}`, parent: folder, replaceId: files.collateral });
      update.collateral_photo = `drive:${files.collateral}`;
    }
  }

  // Borrower signature (kept in the database too: the agreement page shows it)
  const sigKey = loan.client_signature ? String(loan.client_signature.length) : null;
  if (sigKey && files.signature_key !== sigKey) {
    const f = fromDataUrl(loan.client_signature);
    if (f) {
      files.signature = await uploadFile(token, { bytes: f.bytes, mime: f.mime, name: `Borrower signature.${f.ext}`, parent: folder, replaceId: files.signature });
      files.signature_key = sigKey;
    }
  }

  // Documents from the application this loan came from
  if (!files.app_docs) {
    const { data: app } = await svc.from("applications").select("id").eq("loan_id", loan.id).maybeSingle();
    if (app) {
      await moveApplication(svc, app.id);
      const { data: a } = await svc.from("applications").select("collateral_images,nrc_front,nrc_back").eq("id", app.id).maybeSingle();
      const list = [
        ...(a?.collateral_images || []).map((p, i) => [p, `Collateral ${i + 1} (application)`]),
        [a?.nrc_front, "NRC front"], [a?.nrc_back, "NRC back"],
      ];
      for (const [p, name] of list) if (isDrive(p)) await copyFile(token, driveId(p), name, folder);
    }
    files.app_docs = true;
  }

  // Agreement PDF: first time, after edits (force), and once the borrower has signed
  const signed = !!loan.client_signature;
  if (force || !files.agreement || files.agreement_signed !== signed) {
    const { data: business } = await svc.from("business").select("*").eq("tenant_id", loan.tenant_id).order("id").limit(1).maybeSingle();
    const schedMap = { weekly: "Weekly", monthly: "Monthly", "lump-sum": "Lump Sum" };
    const pdf = await buildAgreementPdf({
      loan, business, output: "buffer",
      calc: calcLoan(loan.amount, loan.interest_rate, loan.repayment),
      displayStatus: isOverdue(loan) ? "overdue" : loan.status,
      schedLabel: schedMap[loan.repayment] || loan.repayment,
      instLabel: installmentInfo(loan).label, fmt, fmtDate,
    });
    files.agreement = await uploadFile(token, { bytes: pdf, mime: "application/pdf", name: `Agreement – ${loan.id}.pdf`, parent: folder, replaceId: files.agreement });
    files.agreement_signed = signed;
  }

  update.drive_files = files;
  const { error } = await svc.from(table).update(update).eq("id", loan.id);
  if (error) throw new Error(error.message);
  return { folder, files };
}

// ── Catch-up: everything not in Drive yet, for one business or all of them ─────
export async function syncPending(svc, { tenantId = null, budgetMs = 45000 } = {}) {
  const start = Date.now();
  let tenants = [];
  if (tenantId) tenants = (await getAccount(svc, tenantId)) ? [tenantId] : [];
  else tenants = ((await svc.from("drive_accounts").select("tenant_id")).data || []).map((r) => r.tenant_id);

  const out = { applications: 0, loans: 0, left: 0, errors: [] };
  for (const t of tenants) {
    const [{ data: apps }, { data: loans }] = await Promise.all([
      svc.from("applications").select("id").eq("tenant_id", t).is("files_moved_at", null).order("created_at").limit(300),
      svc.from("loans").select("id").eq("tenant_id", t).is("drive_folder_id", null).order("id").limit(300),
    ]);
    const todo = [...(apps || []).map((a) => ["app", a.id]), ...(loans || []).map((l) => ["loan", l.id])];
    for (const [kind, id] of todo) {
      if (Date.now() - start > budgetMs) { out.left++; continue; }
      try {
        if (kind === "app") { await moveApplication(svc, id); out.applications++; }
        else { await syncLoan(svc, id); out.loans++; }
      } catch (e) {
        out.errors.push(`${kind} ${id}: ${e.message}`);
        if (/Reconnect Google Drive/.test(e.message)) break;
      }
    }
  }
  return out;
}

export { isDrive, driveId };
