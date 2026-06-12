// pages/api/friday-quote.js
// Every Friday at 8AM: generates a fresh AI financial quote using Claude
// and sends it to ALL clients (active + settled)
// Triggered by cron-job.org every Friday

import { createClient } from "@supabase/supabase-js";
import { sendSMS } from "../../lib/sms";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Generate a fresh financial quote using Claude
async function generateFinancialQuote() {
  const themes = [
    "saving consistently even when amounts are small",
    "avoiding debt traps and borrowing responsibly",
    "building a side hustle alongside your studies or job",
    "the power of compound interest over time",
    "spending less than you earn",
    "investing in your skills as the best ROI",
    "financial discipline and delayed gratification",
    "building an emergency fund",
    "budgeting before the month begins",
    "setting clear financial goals and writing them down",
  ];

  const theme = themes[Math.floor(Math.random() * themes.length)];

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": process.env.ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-6",
      max_tokens: 200,
      messages: [
        {
          role: "user",
          content: `Generate a short, powerful Friday financial motivation message for young Zambian adults who have taken small loans and are working to improve their finances.

The theme this week is: "${theme}"

Requirements:
- Must feel personal, warm and African (not generic Western advice)
- 2-3 sentences maximum (SMS character limit)
- End with a short motivational call to action
- Start with "Friday Wisdom:"
- Sign off as "- Sonkhela Capital"
- Total message must be under 300 characters
- Make it GENUINELY helpful - practical advice someone can act on this weekend
- Plain text only, no emojis (SMS compatibility)

Return ONLY the message, nothing else.`,
        },
      ],
    }),
  });

  const data = await response.json();
  if (data.error) {
    console.error("Claude API error:", JSON.stringify(data.error));
  }
  return data.content?.[0]?.text?.trim() || null;
}

export default async function handler(req, res) {
  // Protect endpoint with a secret token
  if (req.headers["x-cron-secret"] !== process.env.CRON_SECRET) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  // Only run on Fridays (safety check) - can be bypassed with ?force=true for testing
  const day = new Date().getDay();
  if (day !== 5 && req.query.force !== "true") {
    return res.status(200).json({ message: "Not Friday, skipping." });
  }

  // Generate the quote
  const quote = await generateFinancialQuote();
  if (!quote) {
    return res.status(500).json({ error: "Failed to generate quote" });
  }

  // Get ALL unique client phone numbers (active + settled loans)
  const [activeRes, settledRes] = await Promise.all([
    supabase.from("loans").select("client_phone").not("client_phone", "is", null),
    supabase.from("settled_loans").select("client_phone").not("client_phone", "is", null),
  ]);

  const allClients = [...(activeRes.data || []), ...(settledRes.data || [])];

  const seen = new Set();
  const uniquePhones = [];
  for (const c of allClients) {
    if (c.client_phone && !seen.has(c.client_phone)) {
      seen.add(c.client_phone);
      uniquePhones.push(c.client_phone);
    }
  }

  if (uniquePhones.length === 0) {
    return res.status(200).json({ message: "No clients found." });
  }

  // Send in batches of 50
  const BATCH_SIZE = 50;
  let totalSent = 0;

  for (let i = 0; i < uniquePhones.length; i += BATCH_SIZE) {
    const batch = uniquePhones.slice(i, i + BATCH_SIZE);
    const result = await sendSMS(batch, quote);
    if (result.success) totalSent += batch.length;
  }

  // Log the quote (non-blocking)
  try {
    await supabase.from("sms_logs").insert({
      type: "friday_quote",
      message: quote,
      recipients_count: totalSent,
      sent_at: new Date().toISOString(),
    });
  } catch (e) {
    console.warn("sms_logs insert skipped:", e.message);
  }

  return res.status(200).json({
    success: true,
    quote,
    sent_to: totalSent,
  });
}
