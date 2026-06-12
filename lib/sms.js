// lib/sms.js
// Africa's Talking SMS Utility for Sonkhela Capital

const AfricasTalking = require("africastalking");

const at = AfricasTalking({
  apiKey: process.env.AT_API_KEY,
  username: process.env.AT_USERNAME,
});

const sms = at.SMS;

/**
 * Send SMS to one or multiple recipients
 * @param {string | string[]} recipients - Phone number(s)
 * @param {string} message - SMS message text
 */
async function sendSMS(recipients, message) {
  const to = Array.isArray(recipients) ? recipients : [recipients];

  // Normalize Zambian numbers to +260 format
  const normalized = to.map((num) => {
    const clean = String(num).replace(/\s+/g, "").replace(/[^0-9+]/g, "");
    if (clean.startsWith("0")) return "+260" + clean.slice(1);
    if (clean.startsWith("260")) return "+" + clean;
    if (clean.startsWith("+260")) return clean;
    return "+260" + clean;
  });

  try {
    const payload = {
      to: normalized,
      message,
    };
    // Only include sender ID if you have one approved on Africa's Talking
    if (process.env.AT_SENDER_ID) {
      payload.from = process.env.AT_SENDER_ID;
    }

    const result = await sms.send(payload);
    console.log("SMS sent:", JSON.stringify(result));
    return { success: true, result };
  } catch (error) {
    console.error("SMS error:", error);
    return { success: false, error: error.message };
  }
}

module.exports = { sendSMS };
