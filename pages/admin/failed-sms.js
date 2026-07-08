import { useState, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";

export default function FailedSMS() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [retrying, setRetrying] = useState(null);

  function getSupabase() {
    return createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    );
  }

  async function loadLogs() {
    setLoading(true);
    const supabase = getSupabase();
    const { data } = await supabase
      .from("sms_logs")
      .select("*")
      .ilike("status", "%fail%")
      .order("created_at", { ascending: false })
      .limit(100);
    setLogs(data || []);
    setLoading(false);
  }

  useEffect(() => {
    loadLogs();
  }, []);

  async function retry(log_id) {
    setRetrying(log_id);
    const res = await fetch("/api/retry-sms", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ log_id }),
    });
    const data = await res.json();
    alert(data.success ? "SMS resent successfully!" : "Retry failed. Check number.");
    setRetrying(null);
    loadLogs();
  }

  return (
    <div style={{ padding: 24, fontFamily: "system-ui" }}>
      <h1 style={{ marginBottom: 16 }}>Failed SMS Messages</h1>
      <button
        onClick={loadLogs}
        style={{ marginBottom: 16, padding: "8px 16px", background: "#16a34a", color: "white", border: "none", borderRadius: 6, cursor: "pointer" }}
      >
        Refresh
      </button>

      {loading ? (
        <p>Loading...</p>
      ) : logs.length === 0 ? (
        <p>No failed messages</p>
      ) : (
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: "#f3f4f6" }}>
              <th style={{ padding: 8, textAlign: "left" }}>Date</th>
              <th style={{ padding: 8, textAlign: "left" }}>Phone</th>
              <th style={{ padding: 8, textAlign: "left" }}>Message</th>
              <th style={{ padding: 8, textAlign: "left" }}>Status</th>
              <th style={{ padding: 8 }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {logs.map((log) => (
              <tr key={log.id} style={{ borderBottom: "1px solid #e5e7eb" }}>
                <td style={{ padding: 8, fontSize: 13 }}>
                  {new Date(log.created_at).toLocaleString()}
                </td>
                <td style={{ padding: 8 }}>{log.phone_number}</td>
                <td style={{ padding: 8, fontSize: 13, maxWidth: 300 }}>
                  {log.message?.slice(0, 80)}...
                </td>
                <td style={{ padding: 8 }}>
                  <span style={{ background: "#fee2e2", color: "#991b1b", padding: "2px 8px", borderRadius: 4, fontSize: 12 }}>
                    {log.status}
                  </span>
                </td>
                <td style={{ padding: 8, textAlign: "center" }}>
                  <button
                    onClick={() => retry(log.id)}
                    disabled={retrying === log.id}
                    style={{ padding: "6px 12px", background: retrying === log.id ? "#9ca3af" : "#2563eb", color: "white", border: "none", borderRadius: 4, cursor: "pointer" }}
                  >
                    {retrying === log.id ? "Sending..." : "Retry"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}