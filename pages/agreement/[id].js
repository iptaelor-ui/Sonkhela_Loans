import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import { supabase, fmt, fmtDate, calcLoan, isOverdue, AGR_STYLES } from "../shared";

export default function AgreementPage() {
  const router = useRouter();
  const { id } = router.query;
  const [loan, setLoan] = useState(null);
  const [business, setBusiness] = useState(null);
  const [status, setStatus] = useState("loading"); // loading | found | notfound

  useEffect(() => {
    if (!id) return;
    loadData();
  }, [id]);

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

  if (status === "loading") return (
    <>
      <style>{AGR_STYLES}</style>
      <div className="loading-screen">
        <div className="loading-spinner" />
        <div className="loading-text">Loading your agreement...</div>
      </div>
    </>
  );

  if (status === "notfound") return (
    <>
      <style>{AGR_STYLES}</style>
      <div className="error-screen">
        <div className="error-icon">🔍</div>
        <div className="error-title">Agreement Not Found</div>
        <div className="error-sub">This link may be invalid or the agreement may have been removed.</div>
      </div>
    </>
  );

  const calc = calcLoan(loan.amount, loan.interest_rate, loan.repayment);
  const over = isOverdue(loan);
  const displayStatus = over ? "overdue" : loan.status;
  const schedMap = { weekly: "Weekly", monthly: "Monthly", "lump-sum": "Lump Sum" };
  const instLabel = loan.repayment !== "lump-sum"
    ? `${fmt(calc.installment)} / ${loan.repayment === "weekly" ? "week" : "month"}`
    : fmt(calc.total) + " (once)";

  return (
    <>
      <style>{AGR_STYLES}</style>
      <div className="agr-page">
        <div className="agr-doc fade-up">
          {/* Header */}
          <div className="agr-header">
            <div className="agr-logo">
              {business?.logo ? <img src={business.logo} alt="logo" /> : (business?.name || "S")[0]}
            </div>
            <div>
              <div className="agr-biz-name">{business?.name}</div>
              <div className="agr-biz-tag">{business?.tagline}</div>
              <div className="agr-biz-contact">{business?.phone} · {business?.email} · {business?.address}</div>
            </div>
            <span className={`agr-status-pill agr-status-${displayStatus}`}>{displayStatus.toUpperCase()}</span>
          </div>

          {/* ID Bar */}
          <div className="agr-id-bar">
            <div><div className="agr-id-label">Agreement Number</div><div className="agr-id-num">{loan.id}</div></div>
            <div style={{ textAlign: "right" }}><div className="agr-id-label">Date Issued</div><div style={{ fontWeight: 800, fontSize: "0.9rem" }}>{fmtDate(loan.processing_date)}</div></div>
          </div>

          {/* Body */}
          <div className="agr-body">
            <div className="agr-section-title">👤 Borrower Details</div>
            <div className="agr-grid">
              <div className="agr-cell"><div className="agr-cell-label">Full Name</div><div className="agr-cell-value">{loan.client_name}</div></div>
              <div className="agr-cell"><div className="agr-cell-label">Phone Number</div><div className="agr-cell-value">{loan.client_phone || "—"}</div></div>
              <div className="agr-cell full"><div className="agr-cell-label">NRC / National ID</div><div className="agr-cell-value">{loan.client_nrc || "—"}</div></div>
            </div>

            <div className="agr-section-title">💰 Loan Financials</div>
            <div className="agr-money-bar">
              <div className="agr-money-item"><div className="lbl">Principal Amount</div><div className="val">{fmt(loan.amount)}</div></div>
              <div className="agr-money-item"><div className="lbl">Interest ({loan.interest_rate}%)</div><div className="val">{fmt(loan.amount * loan.interest_rate / 100)}</div></div>
              <div className="agr-money-item highlight"><div className="lbl">Total Repayable</div><div className="val">{fmt(calc.total)}</div></div>
            </div>
            <div className="agr-grid">
              <div className="agr-cell"><div className="agr-cell-label">Processing Date</div><div className="agr-cell-value">{fmtDate(loan.processing_date)}</div></div>
              <div className="agr-cell"><div className="agr-cell-label">Due Date</div><div className="agr-cell-value" style={{ color: over ? "var(--red)" : "inherit" }}>{fmtDate(loan.due_date)}{over ? " ⚠️" : ""}</div></div>
              <div className="agr-cell"><div className="agr-cell-label">Repayment Schedule</div><div className="agr-cell-value">{schedMap[loan.repayment] || loan.repayment}</div></div>
              <div className="agr-cell"><div className="agr-cell-label">Installment</div><div className="agr-cell-value">{instLabel}</div></div>
            </div>

            <div className="agr-section-title">🔒 Collateral Held</div>
            <div className="agr-grid">
              <div className="agr-cell full"><div className="agr-cell-label">Item / Description</div><div className="agr-cell-value">{loan.collateral}</div></div>
              {loan.collateral_value && <div className="agr-cell"><div className="agr-cell-label">Estimated Value</div><div className="agr-cell-value">{fmt(loan.collateral_value)}</div></div>}
            </div>

            {loan.terms && <><div className="agr-section-title">📋 Terms & Conditions</div><div className="agr-terms">{loan.terms}</div></>}

            <div className="agr-section-title">✍️ Signatures</div>
            <div className="sig-row">
              <div className="sig-box"><div className="sig-line" /><div className="sig-name">{business?.name} (Lender)</div></div>
              <div className="sig-box"><div className="sig-line" /><div className="sig-name">{loan.client_name} (Borrower)</div></div>
            </div>
          </div>

          {/* Footer */}
          <div className="agr-footer">
            <div className="agr-footer-left">{business?.name} · {business?.email}</div>
            <div className="agr-footer-right">Official Loan Agreement</div>
          </div>
        </div>
        <div style={{ marginTop: "1rem", fontSize: "0.72rem", color: "#6b9e7e", textAlign: "center" }}>
          This document is confidential and issued by {business?.name}
        </div>
      </div>
    </>
  );
}
