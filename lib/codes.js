// Short code for a business, used to number its applications and loans.
//   "Sonkhela Soft Loans" -> "SSL", "RT Credit" -> "RTC", "Mwanakatwe" -> "MWA"
// Mirrors the rule in migration 002.
export function makeCode(name) {
  const words = String(name || "").replace(/[^A-Za-z ]/g, "").split(/\s+/).filter(Boolean);
  if (words.length === 0) return "BIZ";
  if (words.length === 1) return words[0].slice(0, 3).toUpperCase();
  return words.map((w) => (/^[A-Z]{2,3}$/.test(w) ? w : w[0])).join("").slice(0, 4).toUpperCase();
}
