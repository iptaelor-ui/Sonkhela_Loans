// pages/api/friday-quote.js
// Every Friday at 8AM: generates a fresh AI financial quote using Claude
// and sends it to ALL unique clients (deduplicated by phone number)
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

Theme: ${theme}

Requirements:
- Keep it under 160 characters total (one SMS)
- Start with a relevant emoji
- End with "- Sonkhela Capital"
- Make it feel personal and uplifting, not preachy
- Use simple, clear language
- No quotes within quotes

Just output the message text, nothing else.`,
        },
      ],
    }),
  });

  const data = await response.json();
  return data.content[0].text.trim();
}

export default async function handler(req, res) {
  // Verify cron secret
  if (req.headers["x-cron-secret"] !== process.env.CRON_SECRET) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  // Check it's actually Friday in Zambia (UTC+2)
  const nowZambia = new Date(
    new Date().toLocaleString("en-US", { timeZone: "Africa/Lusaka" })
  );
  const isFriday = nowZambia.getDay() === 5;

  if (!isFriday) {
    return res.status(200).json({ message: "Not Friday in Zambia — skipping." });
  }

  try {
    // Fetch phone numbers from active loans
    const { data: activeLoans } = await supabase
      .from("loans")
      .select("client_phone, client_name")
      .eq("status", "active");

    // Fetch phone numbers from settled loans
    const { data: settledLoans } = await supabase
      .from("settled_loans")
      .select("client_phone, client_name");

    // Combine all records
    const allRecords = [...(activeLoans || []), ...(settledLoans || [])];

    // ── DEDUPLICATION ──────────────────────────────────────────────
    // Build a Map keyed by phone number — first occurrence wins
    const uniqueClients = new Map();
    for (const record of allRecords) {
      const phone = record.client_phone?.trim();
      if (phone && !uniqueClients.has(phone)) {
        uniqueClients.set(phone, record.client_name);
      }
    }
    // ──────────────────────────────────────────────────────────────

    // Validate Zambian phone numbers
    const validPhones = [...uniqueClients.keys()].filter((p) =>
      /^\+260[97]\d{8}$/.test(p)
    );

    if (validPhones.length === 0) {
      return res.status(200).json({ message: "No valid phone numbers found." });
    }

    // Generate the quote
    const quote = await generateFinancialQuote();

    // Send SMS to all unique valid numbers
    const result = await sendSMS(validPhones, quote);

    // Log to Supabase
    try {
      await supabase.from("sms_logs").insert({
        type: "friday_quote",
        message: quote,
        recipients_count: validPhones.length,
        sent_at: new Date().toISOString(),
      });
    } catch (e) {
      console.warn("sms_logs insert skipped:", e.message);
    }

    return res.status(200).json({
      success: true,
      quote,
      total_records: allRecords.length,
      unique_recipients: validPhones.length,
      duplicates_removed: allRecords.length - uniqueClients.size,
      result,
    });
  } catch (error) {
    console.error("Friday quote error:", error);
    return res.status(500).json({ error: error.message });
  }
}
