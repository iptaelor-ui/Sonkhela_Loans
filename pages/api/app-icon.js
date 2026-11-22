// App icon (PNG) drawn on the fly: the business's emblem in white, centred on its
// theme colour (or its first letter if there's no usable logo). Used for the
// home-screen icon on Android and iPhone, the favicon and the install banner.
import { ImageResponse } from "next/og";
import { appBrand } from "../../lib/appBrand";
import { THEMES, themeName } from "../../lib/theme";
import { logoMark } from "../../lib/iconMark";

// Node runtime: reading the logo's pixels needs Node's image libraries
const marks = new Map(); // cache the white emblem per logo while the server is warm

export default async function handler(req, res) {
  const size = Math.min(Math.max(parseInt(req.query.size || "512", 10) || 512, 48), 1024);
  const maskable = req.query.maskable === "1";
  const host = req.headers["x-forwarded-host"] || req.headers.host || "";

  let brand = { name: "Sonkhela Soft Loans", logo: null, theme: "green" };
  try { brand = await appBrand(host); } catch {}
  const t = THEMES[themeName(brand.theme)];

  let mark = null;
  if (brand.logo) {
    const key = brand.logo.length + ":" + brand.logo.slice(-64);
    if (!marks.has(key)) marks.set(key, logoMark(brand.logo));
    mark = marks.get(key);
  }

  // The emblem fits in a centred box. Maskable icons get cut to circles/squircles
  // by Android, so they keep a wider safe margin.
  const boxSize = size * (maskable ? 0.56 : 0.64);
  let mw = 0, mh = 0;
  if (mark) {
    const k = Math.min(boxSize / mark.width, boxSize / mark.height);
    mw = Math.round(mark.width * k);
    mh = Math.round(mark.height * k);
  }

  const image = new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: `linear-gradient(135deg,${t.dark},${t.primary})` }}>
        {mark ? (
          <img src={mark.src} width={mw} height={mh} />
        ) : (
          <div style={{ display: "flex", color: "#fff", fontSize: Math.round(boxSize * 0.8), fontWeight: 700, lineHeight: 1 }}>
            {(brand.name || "S").trim().charAt(0).toUpperCase()}
          </div>
        )}
      </div>
    ),
    { width: size, height: size }
  );

  const png = Buffer.from(await image.arrayBuffer());
  res.setHeader("Content-Type", "image/png");
  res.setHeader("Cache-Control", "public, max-age=86400, s-maxage=86400");
  res.status(200).send(png);
}
