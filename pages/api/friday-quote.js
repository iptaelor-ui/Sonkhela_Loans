// pages/api/friday-quote.js
// Every Friday at 8AM: generates a fresh AI financial quote using Claude
// and sends it to ALL unique clients (deduplicated by phone number).
// Also publishes a full blog post to the website based on the same quote.
// Triggered by cron-job.org every Friday

import { createClient } from "@supabase/supabase-js";
import { sendSMS } from "../../lib/sms";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const THEMES = [
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

async function callClaude(prompt, maxTokens) {
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": process.env.ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-6",
      max_tokens: maxTokens,
      messages: [{ role: "user", content: prompt }],
    }),
  });

  const data = await response.json();
  return data.content[0].text.trim();
}

// Generate a fresh financial quote using Claude
async function generateFinancialQuote(theme) {
  return callClaude(
    `Generate a short, powerful Friday financial motivation message for young Zambian adults who have taken small loans and are working to improve their finances. 

Theme: ${theme}

Requirements:
- Keep it under 160 characters total (one SMS)
- Start with a relevant emoji
- End with "- Sonkhela Capital"
- Make it feel personal and uplifting, not preachy
- Use simple, clear language
- No quotes within quotes

Just output the message text, nothing else.`,
    200
  );
}

function slugify(title) {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 70);
}

// Expand this week's quote into a full blog post and save it for the website
async function publishBlogPost(quote, theme) {
  const raw = await callClaude(
    `You write the weekly financial literacy blog for Sonkhela Soft Loans, a small licensed lender in Lusaka, Zambia serving students, marketeers and working people.

This week's SMS tip was: "${quote}"
This week's theme is: ${theme}

Write a short blog post expanding on this tip.

Requirements:
- 350 to 450 words
- Warm, practical, no jargon, no lecturing
- Use Kwacha (K) in any money examples, with realistic Zambian amounts
- Structure: an opening paragraph, then 2 or 3 short sections, each starting with a line that begins with "## " followed by the section heading
- Separate every paragraph with a blank line
- Plain text only: no markdown besides the "## " headings, no asterisks, no links

Return ONLY valid JSON in exactly this shape, with no backticks and no other text:
{"title": "the post title", "excerpt": "one sentence under 160 characters", "content": "the full post with \\n\\n between paragraphs"}`,
    1500
  );

  const cleaned = raw.replace(/```json|```/g, "").trim();
  const post = JSON.parse(cleaned);

  const dateSuffix = new Date().toISOString().slice(0, 10);

  const { error } = await supabase.from("blog_posts").insert({
    slug: `${slugify(post.title)}-${dateSuffix}`,
    title: post.title,
    excerpt: post.excerpt,
    content: post.content,
    category: "Financial Literacy",
    is_published: true,
  });

  if (error) throw error;
  return post.title;
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
    // Fetch phone numbers from EVERY loan, regardless of status
    const { data: allLoans } = await supabase
      .from("loans")
      .select("client_phone, client_name");

    const { data: settledLoans } = await supabase
      .from("settled_loans")
      .select("client_phone, client_name");

    const allRecords = [...(allLoans || []), ...(settledLoans || [])];

    // Deduplicate by phone number — first occurrence wins
    const uniqueClients = new Map();
    for (const record of allRecords) {
      const phone = record.client_phone?.trim();
      if (phone && !uniqueClients.has(phone)) {
        uniqueClients.set(phone, record.client_name);
      }
    }

    const validPhones = [...uniqueClients.keys()].filter((p) =>
      /^\+260[97]\d{8}$/.test(p)
    );

    if (validPhones.length === 0) {
      return res.status(200).json({ message: "No valid phone numbers found." });
    }

    // Generate the quote (theme shared with the blog post)
    const theme = THEMES[Math.floor(Math.random() * THEMES.length)];
    const quote = await generateFinancialQuote(theme);

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

    // Publish the blog post — never allowed to break the SMS flow
    let blogTitle = null;
    let blogError = null;
    try {
      blogTitle = await publishBlogPost(quote, theme);
    } catch (e) {
      blogError = e.message;
      console.error("Blog post publish failed:", e);
    }

    return res.status(200).json({
      success: true,
      quote,
      blog_post: blogTitle,
      blog_error: blogError,
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
