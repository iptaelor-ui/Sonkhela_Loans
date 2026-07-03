// pages/api/test-sms.js
// Manual test endpoint — sends one SMS to your own number
// to verify the branded Sender ID displays correctly

const { sendSMS } = require("../../lib/sms");

export default async function handler(req, res) {
  // Same protection as your other endpoints
  if (req.headers["x-cron-secret"] !== process.env.CRON_SECRET) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const result = await sendSMS(
    "+260970615997", // your number
    "Sonkhela test: verifying branded Sender ID. If you see SONKHELA as the sender, it works!"
  );

  return res.status(200).json(result);
}
