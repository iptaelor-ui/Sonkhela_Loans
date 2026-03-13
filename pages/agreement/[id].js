import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/router";
import { supabase, fmt, fmtDate, calcLoan, isOverdue, AGR_STYLES } from "../shared";

const PAGE_STYLES = `
${AGR_STYLES}
body{background:#e8f5ee;}
.dl-bar{width:100%;max-width:740px;display:flex;gap:0.75rem;align-items:center;margin-bottom:1rem;flex-wrap:wrap;}
.btn-dl{display:inline-flex;align-items:center;gap:8px;padding:11px 22px;border-radius:9px;border:none;font-family:'Nunito',sans-serif;font-weight:800;font-size:0.9rem;cursor:pointer;background:#1a7a4a;color:#fff;transition:all 0.18s;}
.btn-dl:hover{background:#2da05f;transform:translateY(-1px);box-shadow:0 4px 14px rgba(26,122,74,0.35);}
.btn-dl:disabled{background:#a0c4b0;cursor:not-allowed;transform:none;box-shadow:none;}
.dl-spinner{width:16px;height:16px;border:2px solid rgba(255,255,255,0.4);border-top-color:#fff;border-radius:50%;animation:spin 0.7s linear infinite;display:inline-block;}
.dl-hint{font-size:0.78rem;color:#6b9e7e;}
.sig-section{margin-top:1.5rem;}
.sig-lender-box{display:flex;flex-direction:column;align-items:flex-start;max-width:260px;}
.sig-img{max-width:220px;max-height:80px;object-fit:contain;margin-bottom:4px;}
.sig-line-under{height:1px;background:#0d1f14;width:100%;margin-bottom:6px;}
.sig-label{font-size:0.8rem;color:#6b7c72;font-weight:700;}
@media print{.dl-bar{display:none!important;}}
`;

export default function AgreementPage() {
  const router = useRouter();
  const { id } = router.query;
  const [loan, setLoan] = useState(null);
  const [business, setBusiness] = useState(null);
  const [status, setStatus] = useState("loading");
  const [downloading, setDownloading] = useState(false);
  const docRef = useRef(null);

  useEffect(() => { if (!id) return; loadData(); }, [id]);

  const loadData = async () => {
    const [loanRes, bizRes] = await Promise.all([
      supabase.from("loans").select("*").eq("id", id).single(),
      supabase.from("business").select("*").eq("id", 1).single(),
    ]);
    if (loanRes.error || !loanRes.data) { setStatus("notfound"); return; }
    setLoan(loanRes.data);
    setBusiness(bizRes.data);
    setStatus("found");
  };

  const downloadPDF = async () => {
    setDownloading(true);
    try {
      const html2canvas = (await import("html2canvas")).default;
      const { jsPDF } = await import("jspdf");
      const el = docRef.current;
      const canvas = await html2canvas(el, { scale: 2, useCORS: true, backgroundColor: "#ffffff", logging: false });
      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
      const pw = pdf.internal.pageSize.getWidth();
      const ph = pdf.internal.pageSize.getHeight();
      const ih = (canvas.height * pw) / canvas.width;
      if (ih <= ph) {
        pdf.addImage(imgData, "PNG", 0, 0, pw, ih);
      } else {
        let y = 0;
        while (y < ih) {
          if (y > 0) pdf.addPage();
          pdf.addImage(imgData, "PNG", 0, -y, pw, ih);
          y += ph;
        }
      }
      pdf.save(`Sonkhela_${loan.id}_${(loan.client_name||"Client").replace(/\s+/g,"_")}.pdf`);
    } catch(err) {
      alert("PDF generation failed. Please try again.");
      console.error(err);
    }
    setDownloading(false);
  };

  if (status === "loading") return (
    <><style>{PAGE_STYLES}</style>
    <div className="loading-screen"><div className="loading-spinner"/><div className="loading-text">Loading agreement...</div></div></>
  );

  if (status === "notfound") return (
    <><style>{PAGE_STYLES}</style>
    <div className="error-screen">
      <div className="error-icon">🔍</div>
      <div className="error-title">Agreement Not Found</div>
      <div className="error-sub">This link may be invalid or the agreement has been removed.</div>
    </div></>
  );

  const calc = calcLoan(loan.amount, loan.interest_rate, loan.repayment);
  const over = isOverdue(loan);
  const displayStatus = over ? "overdue" : loan.status;
  const schedMap = { weekly:"Weekly", monthly:"Monthly", "lump-sum":"Lump Sum" };
  const instLabel = loan.repayment !== "lump-sum"
    ? `${fmt(calc.installment)} / ${loan.repayment==="weekly"?"week":"month"}`
    : fmt(calc.total) + " (once)";

  return (
    <><style>{PAGE_STYLES}</style>
    <div className="agr-page">

      {/* Download bar */}
      <div className="dl-bar">
        <button className="btn-dl" onClick={downloadPDF} disabled={downloading}>
          {downloading ? <><span className="dl-spinner"/> Generating PDF...</> : <>⬇️ Download PDF</>}
        </button>
        <span className="dl-hint">📲 Download &amp; share on WhatsApp</span>
      </div>

      {/* Agreement document */}
      <div className="agr-doc fade-up" ref={docRef}>

        <div className="agr-header">
          <div className="agr-logo">
            {business?.logo ? <img src={business.logo} alt="logo"/> : (business?.name||"S")[0]}
          </div>
          <div>
            <div className="agr-biz-name">{business?.name}</div>
            <div className="agr-biz-tag">{business?.tagline}</div>
            <div className="agr-biz-contact">{business?.phone} · {business?.email} · {business?.address}</div>
          </div>
          <span className={`agr-status-pill agr-status-${displayStatus}`}>{displayStatus.toUpperCase()}</span>
        </div>

        <div className="agr-id-bar">
          <div><div className="agr-id-label">Agreement Number</div><div className="agr-id-num">{loan.id}</div></div>
          <div style={{textAlign:"right"}}><div className="agr-id-label">Date Issued</div><div style={{fontWeight:800,fontSize:"0.9rem"}}>{fmtDate(loan.processing_date)}</div></div>
        </div>

        <div className="agr-body">

          <div className="agr-section-title">👤 Borrower Details</div>
          <div className="agr-grid">
            <div className="agr-cell"><div className="agr-cell-label">Full Name</div><div className="agr-cell-value">{loan.client_name}</div></div>
            <div className="agr-cell"><div className="agr-cell-label">Phone Number</div><div className="agr-cell-value">{loan.client_phone||"—"}</div></div>
            <div className="agr-cell full"><div className="agr-cell-label">NRC / National ID</div><div className="agr-cell-value">{loan.client_nrc||"—"}</div></div>
          </div>

          <div className="agr-section-title">💰 Loan Financials</div>
          <div className="agr-money-bar">
            <div className="agr-money-item"><div className="lbl">Principal Amount</div><div className="val">{fmt(loan.amount)}</div></div>
            <div className="agr-money-item"><div className="lbl">Interest ({loan.interest_rate}%)</div><div className="val">{fmt(loan.amount*loan.interest_rate/100)}</div></div>
            <div className="agr-money-item highlight"><div className="lbl">Total Repayable</div><div className="val">{fmt(calc.total)}</div></div>
          </div>
          <div className="agr-grid">
            <div className="agr-cell"><div className="agr-cell-label">Processing Date</div><div className="agr-cell-value">{fmtDate(loan.processing_date)}</div></div>
            <div className="agr-cell"><div className="agr-cell-label">Due Date</div><div className="agr-cell-value" style={{color:over?"var(--red)":"inherit"}}>{fmtDate(loan.due_date)}{over?" ⚠️":""}</div></div>
            <div className="agr-cell"><div className="agr-cell-label">Repayment Schedule</div><div className="agr-cell-value">{schedMap[loan.repayment]||loan.repayment}</div></div>
            <div className="agr-cell"><div className="agr-cell-label">Installment</div><div className="agr-cell-value">{instLabel}</div></div>
          </div>

          <div className="agr-section-title">🔒 Collateral Held</div>
          <div className="agr-grid">
            <div className="agr-cell full"><div className="agr-cell-label">Item / Description</div><div className="agr-cell-value">{loan.collateral}</div></div>
            {loan.collateral_value && <div className="agr-cell"><div className="agr-cell-label">Estimated Value</div><div className="agr-cell-value">{fmt(loan.collateral_value)}</div></div>}
          </div>

          {loan.terms && (<><div className="agr-section-title">📋 Terms & Conditions</div><div className="agr-terms">{loan.terms}</div></>)}

          {/* Signature — lender only */}
          <div className="agr-section-title">✍️ Authorised Signature</div>
          <div className="sig-section">
            <div className="sig-lender-box">
              {business?.signature
                ? <img className="sig-img" src={business.signature} alt="signature"/>
                : <div style={{height:60}}/>}
              <div className="sig-line-under"/>
              <div className="sig-label">{business?.name} (Lender)</div>
            </div>
          </div>

        </div>

        <div className="agr-footer">
          <div className="agr-footer-left">{business?.name} · {business?.email}</div>
          <div className="agr-footer-right">Official Loan Agreement</div>
        </div>
      </div>

      <div style={{marginTop:"1rem",fontSize:"0.72rem",color:"#6b9e7e",textAlign:"center"}}>
        This document is confidential and issued by {business?.name}
      </div>
    </div></>
  );
}
