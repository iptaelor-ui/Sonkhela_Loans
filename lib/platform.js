// Shared helpers for the super-admin (platform) API routes.

export const RESERVED_SLUGS = new Set([
  "admin", "www", "api", "app", "mail", "blog", "platform", "portal",
  "support", "help", "status", "dashboard", "login", "sonkhela",
]);

export const SLUG_RE = /^[a-z0-9](?:[a-z0-9-]{0,28}[a-z0-9])?$/;

// Today's date in Zambia as YYYY-MM-DD
export const todayLusaka = () =>
  new Date().toLocaleDateString("en-CA", { timeZone: "Africa/Lusaka" });

export const addDays = (ymd, n) => {
  const d = new Date(ymd + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};

export const daysBetween = (fromYmd, toYmd) =>
  Math.round((new Date(toYmd + "T00:00:00Z") - new Date(fromYmd + "T00:00:00Z")) / 86400000);

// Readable temporary password, e.g. "Kp7m-Qx4t-Nz9w"
export function tempPassword() {
  const chars = "ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
  const bytes = new Uint32Array(12);
  require("crypto").webcrypto.getRandomValues(bytes);
  let s = "";
  for (let i = 0; i < 12; i++) {
    if (i && i % 4 === 0) s += "-";
    s += chars[bytes[i] % chars.length];
  }
  return s;
}

export const GRACE_DAYS = 5;
