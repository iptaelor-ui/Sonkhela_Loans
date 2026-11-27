// Loan types a business can offer on its apply page (Settings > Loan types offered)
export const LOAN_TYPES = [
  ["collateral", "Collateral Backed Loan"],
  ["payslip", "Payslip Backed Loan"],
  ["student", "Student Loan"],
  ["marketeer", "Marketeer Loan"],
  ["business", "Business Loan"],
  ["white-book", "White Book Loan"],
];
export const LOAN_TYPE_IDS = LOAN_TYPES.map(([v]) => v);

// The business's chosen types (none saved = all)
export const offeredTypes = (saved) => {
  const list = Array.isArray(saved) ? saved.filter((t) => LOAN_TYPE_IDS.includes(t)) : [];
  return list.length ? list : LOAN_TYPE_IDS;
};
