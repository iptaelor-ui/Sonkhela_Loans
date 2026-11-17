// App icon (PNG) drawn on the fly: the business logo, or its first letter,
// on Sonkhela green. Used for the home-screen icon on Android and iPhone.
import { ImageResponse } from "next/og";
import { appBrand } from "../../lib/appBrand";

export const config = { runtime: "edge" };

export default async function handler(req) {
  const { searchParams } = new URL(req.url);
  const size = Math.min(Math.max(parseInt(searchParams.get("size") || "512", 10) || 512, 48), 1024);
  const maskable = searchParams.get("maskable") === "1";
  const host = req.headers.get("x-forwarded-host") || req.headers.get("host") || "";

  let brand = { name: "Sonkhela Soft Loans", logo: null };
  try { brand = await appBrand(host); } catch {}
  const logo = /^data:image\/(png|jpe?g);base64,/.test(brand.logo || "") ? brand.logo : null;
  const inner = Math.round(size * (maskable ? 0.62 : 0.78)); // maskable icons need a safe margin

  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: "linear-gradient(135deg,#145f39,#1a7a4a)" }}>
        {logo ? (
          <img src={logo} width={inner} height={inner} style={{ borderRadius: "50%", objectFit: "cover", border: `${Math.round(size * 0.015)}px solid rgba(255,255,255,0.35)` }} />
        ) : (
          <div style={{ width: inner, height: inner, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(255,255,255,0.14)", color: "#fff", fontSize: Math.round(inner * 0.55), fontWeight: 700 }}>
            {(brand.name || "S").trim().charAt(0).toUpperCase()}
          </div>
        )}
      </div>
    ),
    { width: size, height: size, headers: { "Cache-Control": "public, max-age=86400, s-maxage=86400" } }
  );
}
