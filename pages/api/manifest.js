// Web app manifest: lets the dashboard be installed as a phone app.
// Each client portal installs with its own business name.
import { appBrand } from "../../lib/appBrand";
import { THEMES, themeName } from "../../lib/theme";

export default async function handler(req, res) {
  const host = req.headers["x-forwarded-host"] || req.headers.host || "";
  const { name, theme } = await appBrand(host).catch(() => ({ name: "Sonkhela Soft Loans", theme: "green" }));
  const color = THEMES[themeName(theme)].dark;
  // Label under the home-screen icon: keep whole words, max ~12 characters
  const words = name.trim().split(/\s+/);
  const two = words.slice(0, 2).join(" ");
  const short = name.length <= 12 ? name : two.length <= 12 ? two : words[0].slice(0, 12);
  res.setHeader("Content-Type", "application/manifest+json");
  res.setHeader("Cache-Control", "public, max-age=3600, s-maxage=3600");
  res.status(200).send(JSON.stringify({
    name,
    short_name: short,
    description: `${name} loan management`,
    id: "/",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: color,
    theme_color: color,
    icons: [
      { src: "/api/app-icon?size=192", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/api/app-icon?size=512", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/api/app-icon?size=512&maskable=1", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  }));
}
