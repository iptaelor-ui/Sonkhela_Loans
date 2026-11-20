// Colour themes per business. The system is designed in Sonkhela green; every
// other theme swaps each green shade for its own palette.
export const THEMES = {
  green:  { label: "Green (Sonkhela)", primary: "#1a7a4a", dark: "#145f39" },
  blue:   { label: "Blue",             primary: "#1a56db", dark: "#1e3a6e" },
  purple: { label: "Purple",           primary: "#6d28d9", dark: "#4c1d95" },
  pink:   { label: "Pink (soft)",      primary: "#c0607f", dark: "#9e4d68" },
  white:  { label: "White",            primary: "#374151", dark: "#111827" },
};

// Green source shades, in the order every palette below follows
const SOURCE = [
  "#145f39", "#1a7a4a", "#2da05f", "#e8f5ee", "#f0faf4", "#f4fbf6", "#d4e8db", "#b8e8cb",
  "#0d1f14", "#6b7c72", "#0f1a13", "#1a2e1f", "#2a4030", "#7a9e85",
  "rgba(26,122,74", "rgba(20,95,57", "rgba(13,31,20",
];
//          dark       primary    hover      light      tint       page bg    border     light2
//          ink        muted      dark-mode bg / card / line / text           rgba primary / dark / ink
const PALETTES = {
  blue: ["#1e3a6e", "#1a56db", "#3b76f6", "#ebf0fb", "#f3f6fd", "#f9fafb", "#e5e7eb", "#c7d7f7",
         "#111827", "#6b7280", "#0d1520", "#1a2535", "#2a3a50", "#7a90a8",
         "rgba(26,86,219", "rgba(30,58,110", "rgba(17,24,39"],
  purple: ["#4c1d95", "#6d28d9", "#8b5cf6", "#f3edfd", "#f7f3fe", "#faf8ff", "#e4dbf7", "#d6c6f6",
           "#1e1033", "#6f6585", "#120d1c", "#221a33", "#352a4a", "#8f84a8",
           "rgba(109,40,217", "rgba(76,29,149", "rgba(30,16,51"],
  pink: ["#9e4d68", "#c0607f", "#d98aa4", "#fcecf1", "#fdf3f6", "#fff7fa", "#f3d6df", "#f2bfd0",
         "#2d1520", "#8b6a76", "#1a0e12", "#2e1a21", "#452a35", "#b08898",
         "rgba(192,96,127", "rgba(158,77,104", "rgba(45,21,32"],
  white: ["#111827", "#374151", "#4b5563", "#f3f4f6", "#f9fafb", "#f9fafb", "#e5e7eb", "#d1d5db",
          "#111827", "#6b7280", "#0f1115", "#1c1f26", "#2d323c", "#8b93a1",
          "rgba(55,65,81", "rgba(17,24,39", "rgba(17,24,39"],
};

// White theme: the menu and login become white with dark text (light mode only)
const WHITE_EXTRA = `
body:not(.dark) .sidebar,body:not(.dark) .mobile-nav{background:#ffffff;border-right:1px solid #e5e7eb;}
body:not(.dark) .mobile-nav{border-top:1px solid #e5e7eb;border-right:none;}
body:not(.dark) .sidebar-brand,body:not(.dark) .sidebar-footer{border-color:#e5e7eb;}
body:not(.dark) .brand-logo{background:#f3f4f6;color:#111827;}
body:not(.dark) .brand-name{color:#111827;}
body:not(.dark) .brand-tag{color:#6b7280;}
body:not(.dark) .nav-item{color:#4b5563;}
body:not(.dark) .nav-item:hover{color:#111827;background:#f3f4f6;}
body:not(.dark) .nav-item.active{color:#ffffff;background:#111827;}
body:not(.dark) .logout-btn,body:not(.dark) .dark-toggle,body:not(.dark) .clients-link{color:#4b5563!important;border-color:#e5e7eb!important;}
body:not(.dark) .logout-btn:hover,body:not(.dark) .dark-toggle:hover{background:#f3f4f6;color:#111827;}
body:not(.dark) .mobile-nav-item{color:#6b7280;}
body:not(.dark) .mobile-nav-item.active{color:#111827;background:#f3f4f6;}
body:not(.dark) .login-shell{background:#f3f4f6;}
`;

export const themeName = (t) => (THEMES[t] ? t : "green");

// Swap the green palette in a CSS string for the business's theme.
export function applyTheme(css, theme) {
  const name = themeName(theme);
  if (name === "green" || !css) return css;
  const to = PALETTES[name];
  let out = css;
  SOURCE.forEach((from, i) => { out = out.replace(new RegExp(from.replace(/[()]/g, "\\$&"), "gi"), to[i]); });
  return name === "white" ? out + WHITE_EXTRA : out;
}

const rgb = (hex) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));

// Same palette as [r,g,b] for the PDF
export function pdfPalette(theme) {
  const name = themeName(theme);
  if (name === "green") return { primary: [26, 122, 74], dark: [13, 31, 20], muted: [107, 124, 114], border: [212, 232, 219], tint: [244, 251, 246] };
  const p = PALETTES[name];
  return { primary: rgb(p[1]), dark: rgb(p[8]), muted: rgb(p[9]), border: rgb(p[6]), tint: rgb(p[5]) };
}
