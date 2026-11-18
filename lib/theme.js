// Colour themes per business. The system is designed in Sonkhela green; the
// blue theme swaps every green shade for Eden's blue palette.
export const THEMES = {
  green: { label: "Green (Sonkhela)", primary: "#1a7a4a", dark: "#145f39" },
  blue: { label: "Blue", primary: "#1a56db", dark: "#1e3a6e" },
};

const BLUE_MAP = [
  ["#145f39", "#1e3a6e"], // dark
  ["#1a7a4a", "#1a56db"], // primary
  ["#2da05f", "#3b76f6"], // hover
  ["#e8f5ee", "#ebf0fb"], // light tint
  ["#f0faf4", "#f3f6fd"],
  ["#f4fbf6", "#f9fafb"], // page background
  ["#d4e8db", "#e5e7eb"], // borders
  ["#b8e8cb", "#c7d7f7"],
  ["#0d1f14", "#111827"], // ink
  ["#6b7c72", "#6b7280"], // muted text
  ["#0f1a13", "#0d1520"], // dark mode
  ["#1a2e1f", "#1a2535"],
  ["#2a4030", "#2a3a50"],
  ["#7a9e85", "#7a90a8"],
  ["rgba(26,122,74", "rgba(26,86,219"],
  ["rgba(20,95,57", "rgba(30,58,110"],
  ["rgba(13,31,20", "rgba(17,24,39"],
];

export const themeName = (t) => (THEMES[t] ? t : "green");

// Swap the green palette in a CSS string for the business's theme.
export function applyTheme(css, theme) {
  if (themeName(theme) !== "blue" || !css) return css;
  let out = css;
  for (const [from, to] of BLUE_MAP) out = out.replace(new RegExp(from.replace(/[()]/g, "\\$&"), "gi"), to);
  return out;
}

// Same palette as [r,g,b] for the PDF
export function pdfPalette(theme) {
  return themeName(theme) === "blue"
    ? { primary: [26, 86, 219], dark: [17, 24, 39], muted: [107, 114, 128], border: [229, 231, 235], tint: [249, 250, 251] }
    : { primary: [26, 122, 74], dark: [13, 31, 20], muted: [107, 124, 114], border: [212, 232, 219], tint: [244, 251, 246] };
}
