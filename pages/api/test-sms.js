// pages/api/test-sms.js
const { sendSMS } = require("../../lib/sms");

export default async function handler(req, res) {
  if (req.headers["x-cron-secret"] !== process.env.CRON_SECRET) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const result = await sendSMS(
    "+260970615997",
    "Sonkhela test: verifying branded Sender ID. If you see SONKHELA as the sender, it works!"
  );

  return res.status(200).json(result);
}