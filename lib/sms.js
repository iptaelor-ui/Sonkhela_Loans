// lib/sms.js
// Africa's Talking SMS. Sonkhela uses the AT_* environment variables; client
// businesses pass their own account details (creds) so texts come from their
// sender ID and use their own airtime.

const AfricasTalking = require("africastalking");

const clients = new Map();
function smsClient(username, apiKey) {
  const key = `${username}:${apiKey}`;
  if (!clients.has(key)) clients.set(key, AfricasTalking({ apiKey, username }).SMS);
  return clients.get(key);
}

// Normalise Zambian numbers to +260 and keep only valid mobiles (+260 9x/7x ...)
function normalizePhones(recipients) {
  const to = Array.isArray(recipients) ? recipients : [recipients];
  return [...new Set(
    to
      .map((num) => {
        const clean = String(num || "").replace(/\s+/g, "").replace(/[^0-9+]/g, "");
        if (!clean) return "";
        if (clean.startsWith("0")) return "+260" + clean.slice(1);
        if (clean.startsWith("+260")) return clean;
        if (clean.startsWith("260")) return "+" + clean;
        return "+260" + clean;
      })
      .filter((num) => /^\+260[97]\d{8}$/.test(num))
  )];
}

/**
 * Send SMS to one or multiple recipients
 * @param {string | string[]} recipients - Phone number(s)
 * @param {string} message - SMS message text
 * @param {{username, apiKey, senderId}} [creds] - a client's own account; omit for Sonkhela's
 */
async function sendSMS(recipients, message, creds) {
  const c = creds || { username: process.env.AT_USERNAME, apiKey: process.env.AT_API_KEY, senderId: process.env.AT_SENDER_ID };
  if (!c.username || !c.apiKey) return { success: false, error: "SMS account not connected" };

  const normalized = normalizePhones(recipients);
  if (normalized.length === 0) {
    return { success: false, error: "No valid phone numbers after validation" };
  }

  try {
    const payload = { to: normalized, message };
    // Only include sender ID if one is approved on Africa's Talking
    if (c.senderId) payload.from = c.senderId;
    const result = await smsClient(c.username, c.apiKey).send(payload);
    console.log("SMS sent:", JSON.stringify(result));
    return { success: true, result };
  } catch (error) {
    console.error("SMS error:", error);
    return { success: false, error: error.message };
  }
}

module.exports = { sendSMS, normalizePhones };
