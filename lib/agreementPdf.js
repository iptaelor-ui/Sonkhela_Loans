// Builds a crisp, single-page A4 loan agreement PDF with jsPDF (real text, not a screenshot).
// Usage: await buildAgreementPdf({ loan, business, calc, displayStatus, schedLabel, instLabel, fmt, fmtDate })

const GREEN = [26, 122, 74];
const DARK = [13, 31, 20];
const MUTED = [107, 124, 114];
const BORDER = [212, 232, 219];
const TINT = [244, 251, 246];
const RED = [192, 57, 43];
const FULL_TERMS_URL = "https://docs.google.com/document/d/12AVjBpSUDCzcTPsM0a0BEPRcfC7RacIS247n7ZK-CUY/edit?tab=t.0";

// Turn any image source (data URL or http URL) into a data URL jsPDF can embed
async function toDataUrl(src) {
  if (!src) return null;
  if (src.startsWith("data:")) return src;
  try {
    const res = await fetch(src, { mode: "cors" });
    const blob = await res.blob();
    return await new Promise((resolve) => {
      const r = new FileReader();
      r.onload = () => resolve(r.result);
      r.onerror = () => resolve(null);
      r.readAsDataURL(blob);
    });
  } catch { return null; }
}

function imgFormat(dataUrl) {
  const m = /^data:image\/(\w+)/.exec(dataUrl || "");
  const t = (m ? m[1] : "png").toUpperCase();
  return t === "JPG" ? "JPEG" : t;
}

// Fit an image inside a box (w x h) keeping its aspect ratio
function fitImage(pdf, dataUrl, x, y, w, h, align = "left") {
  try {
    const p = pdf.getImageProperties(dataUrl);
    const s = Math.min(w / p.width, h / p.height);
    const iw = p.width * s, ih = p.height * s;
    const ix = align === "center" ? x + (w - iw) / 2 : x;
    pdf.addImage(dataUrl, imgFormat(dataUrl), ix, y + (h - ih) / 2, iw, ih);
    return true;
  } catch { return false; }
}

export async function buildAgreementPdf({ loan, business, calc, displayStatus, schedLabel, instLabel, fmt, fmtDate }) {
  const { jsPDF } = await import("jspdf");
  const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4", compress: true });
  const PW = pdf.internal.pageSize.getWidth();   // 210
  const PH = pdf.internal.pageSize.getHeight();  // 297
  const M = 14;                                   // side margin
  const CW = PW - M * 2;                          // content width
  const biz = business || {};

  const [logo, lenderSig, clientSig] = await Promise.all([
    toDataUrl(biz.logo), toDataUrl(biz.signature), toDataUrl(loan.client_signature),
  ]);

  const setText = (rgb) => pdf.setTextColor(rgb[0], rgb[1], rgb[2]);
  const setFill = (rgb) => pdf.setFillColor(rgb[0], rgb[1], rgb[2]);
  const setDraw = (rgb) => pdf.setDrawColor(rgb[0], rgb[1], rgb[2]);

  // ---------- Header band ----------
  const HB = 32;
  setFill(GREEN); pdf.rect(0, 0, PW, HB, "F");
  let tx = M;
  if (logo) {
    setFill([255, 255, 255]); pdf.circle(M + 10, HB / 2, 10, "F");
    fitImage(pdf, logo, M + 2, HB / 2 - 8, 16, 16, "center");
    tx = M + 25;
  }
  setText([255, 255, 255]);
  pdf.setFont("times", "bold"); pdf.setFontSize(19);
  pdf.text(biz.name || "Sonkhela Soft Loans", tx, 13);
  pdf.setFont("helvetica", "normal"); pdf.setFontSize(9);
  if (biz.tagline) pdf.text(biz.tagline, tx, 19);
  const contact = [biz.phone, biz.email, biz.address].filter(Boolean).join("  |  ");
  pdf.setFontSize(8.5); pdf.text(contact, tx, 25);

  // Status pill
  const status = (displayStatus || "").toUpperCase();
  pdf.setFont("helvetica", "bold"); pdf.setFontSize(8);
  const pw = pdf.getTextWidth(status) + 8;
  setFill(displayStatus === "overdue" ? RED : [255, 255, 255]);
  pdf.roundedRect(PW - M - pw, 8, pw, 7, 3.5, 3.5, "F");
  setText(displayStatus === "overdue" ? [255, 255, 255] : GREEN);
  pdf.text(status, PW - M - pw / 2, 12.6, { align: "center" });

  // ---------- Agreement number / date ----------
  let y = HB + 9;
  setText(MUTED); pdf.setFont("helvetica", "bold"); pdf.setFontSize(7.5);
  pdf.text("AGREEMENT NUMBER", M, y);
  pdf.text("DATE ISSUED", PW - M, y, { align: "right" });
  y += 6;
  setText(GREEN); pdf.setFont("times", "bold"); pdf.setFontSize(14);
  pdf.text(String(loan.id), M, y);
  setText(DARK); pdf.setFont("helvetica", "bold"); pdf.setFontSize(10.5);
  pdf.text(fmtDate(loan.processing_date), PW - M, y, { align: "right" });
  y += 5;
  setDraw(BORDER); pdf.setLineWidth(0.3); pdf.line(M, y, PW - M, y);

  // ---------- Helpers ----------
  const section = (title) => {
    y += 7;
    setText(GREEN); pdf.setFont("helvetica", "bold"); pdf.setFontSize(9);
    pdf.text(title.toUpperCase(), M, y);
    y += 2.5;
  };

  // A row of labelled cells. cells: [{label, value, highlight, color}]
  const cellRow = (cells, h = 13) => {
    const gap = 3;
    const w = (CW - gap * (cells.length - 1)) / cells.length;
    cells.forEach((c, i) => {
      const x = M + i * (w + gap);
      setFill(c.highlight ? GREEN : TINT); setDraw(c.highlight ? GREEN : BORDER);
      pdf.setLineWidth(0.25); pdf.roundedRect(x, y, w, h, 1.8, 1.8, "FD");
      setText(c.highlight ? [255, 255, 255] : MUTED);
      pdf.setFont("helvetica", "bold"); pdf.setFontSize(6.8);
      pdf.text(c.label.toUpperCase(), x + 3, y + 4.6);
      setText(c.highlight ? [255, 255, 255] : (c.color || DARK));
      pdf.setFont("helvetica", "bold"); pdf.setFontSize(c.big ? 11.5 : 10);
      const val = pdf.splitTextToSize(String(c.value ?? "—"), w - 6)[0];
      pdf.text(val, x + 3, y + 10.2);
    });
    y += h + 3;
  };

  // ---------- Borrower ----------
  section("Borrower Details");
  cellRow([
    { label: "Full Name", value: loan.client_name },
    { label: "Phone Number", value: loan.client_phone || "—" },
    { label: "NRC / National ID", value: loan.client_nrc || "—" },
  ]);

  // ---------- Financials ----------
  section("Loan Financials");
  cellRow([
    { label: "Principal Amount", value: fmt(loan.amount), big: true },
    { label: `Interest (${loan.interest_rate}%)`, value: fmt((loan.amount * loan.interest_rate) / 100), big: true },
    { label: "Total Repayable", value: fmt(calc.total), big: true, highlight: true },
  ]);
  cellRow([
    { label: "Processing Date", value: fmtDate(loan.processing_date) },
    { label: "Due Date", value: fmtDate(loan.due_date), color: displayStatus === "overdue" ? RED : DARK },
    { label: "Repayment Schedule", value: schedLabel },
    { label: "Installment", value: instLabel },
  ]);

  // ---------- Collateral ----------
  section("Collateral Held");
  const collCells = [{ label: "Item / Description", value: loan.collateral || "—" }];
  if (Number(loan.collateral_value) > 0) collCells.push({ label: "Estimated Value", value: fmt(loan.collateral_value) });
  cellRow(collCells);

  // ---------- Fixed bottom blocks (signatures + footer) ----------
  const FOOT_H = 11;
  const SIG_BLOCK_H = 34;
  const sigTop = PH - FOOT_H - SIG_BLOCK_H - 4;

  // ---------- Terms & Conditions (auto-shrinks to always fit on one page) ----------
  if (loan.terms) {
    section("Terms & Conditions");
    const pad = 3.5;
    const linkSpace = 7;
    const maxBoxH = sigTop - y - linkSpace - 3;
    let fs = 9.5, lines, lh, boxH;
    pdf.setFont("helvetica", "normal");
    do {
      pdf.setFontSize(fs);
      lines = pdf.splitTextToSize(loan.terms, CW - pad * 2);
      lh = fs * 0.3528 * 1.45;              // pt -> mm, with line spacing
      boxH = lines.length * lh + pad * 2;
      if (boxH <= maxBoxH) break;
      fs -= 0.25;
    } while (fs > 5.5);
    setFill(TINT); setDraw(BORDER); pdf.setLineWidth(0.25);
    pdf.roundedRect(M, y, CW, boxH, 1.8, 1.8, "FD");
    setText([40, 55, 46]);
    pdf.text(lines, M + pad, y + pad + lh * 0.75, { lineHeightFactor: 1.45 });
    y += boxH + 5;
    setText(GREEN); pdf.setFont("helvetica", "bold"); pdf.setFontSize(8.5);
    pdf.textWithLink("Full Terms & Conditions: tap here to read", M, y, { url: FULL_TERMS_URL });
    const lw = pdf.getTextWidth("Full Terms & Conditions: tap here to read");
    setDraw(GREEN); pdf.setLineWidth(0.2); pdf.line(M, y + 0.8, M + lw, y + 0.8);
  }

  // ---------- Signatures ----------
  y = sigTop;
  setText(GREEN); pdf.setFont("helvetica", "bold"); pdf.setFontSize(9);
  pdf.text("SIGNATURES", M, y);
  setDraw(BORDER); pdf.setLineWidth(0.3); pdf.line(M, y + 2, PW - M, y + 2);
  const sigW = 70, sigH = 18, sigY = y + 5;
  const sigs = [
    { img: lenderSig, label: `${biz.name || "Lender"} (Lender)`, x: M },
    { img: clientSig, label: `${loan.client_name} (Borrower)`, x: M + sigW + 20 },
  ];
  sigs.forEach((s) => {
    if (s.img) fitImage(pdf, s.img, s.x, sigY, sigW, sigH);
    setDraw(DARK); pdf.setLineWidth(0.35); pdf.line(s.x, sigY + sigH + 1.5, s.x + sigW, sigY + sigH + 1.5);
    setText(MUTED); pdf.setFont("helvetica", "bold"); pdf.setFontSize(8.5);
    pdf.text(s.label, s.x, sigY + sigH + 6);
  });

  // ---------- Footer band ----------
  setFill(GREEN); pdf.rect(0, PH - FOOT_H, PW, FOOT_H, "F");
  setText([255, 255, 255]); pdf.setFont("helvetica", "normal"); pdf.setFontSize(8);
  pdf.text(`${biz.name || ""}  |  ${biz.email || ""}`, M, PH - FOOT_H / 2 + 1.2);
  pdf.setFont("helvetica", "bold");
  pdf.text("Official Loan Agreement", PW - M, PH - FOOT_H / 2 + 1.2, { align: "right" });

  pdf.save(`Sonkhela_${loan.id}_${(loan.client_name || "Client").replace(/\s+/g, "_")}.pdf`);
}
