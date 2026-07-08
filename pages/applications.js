import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

export default function ApplicationsPage({ showToast }) {
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadApplications();
  }, []);

  async function loadApplications() {
    setLoading(true);

    const { data, error } = await supabase
      .from("loan_applications")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.log(error);
      showToast("Failed to load applications", "error");
    } else {
      setApplications(data);
    }

    setLoading(false);
  }

  return (
    <div style={{ padding: 25 }}>

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 25,
        }}
      >
        <div>
          <h1 style={{ fontSize: 36, margin: 0 }}>
            Applications
          </h1>

          <p style={{ color: "#666" }}>
            {applications.length} applications
          </p>
        </div>

        <button
          onClick={loadApplications}
          style={{
            padding: "12px 20px",
            borderRadius: 10,
            border: "none",
            background: "#1f7a45",
            color: "#fff",
            cursor: "pointer",
            fontWeight: 600,
          }}
        >
          Refresh
        </button>
      </div>

      {loading ? (
        <h3>Loading...</h3>
      ) : (
        <table
          style={{
            width: "100%",
            borderCollapse: "collapse",
            background: "#fff",
          }}
        >
          <thead>
            <tr>
              <th align="left">Reference</th>
              <th align="left">Applicant</th>
              <th align="left">Phone</th>
              <th align="left">Loan</th>
              <th align="left">Amount</th>
              <th align="left">Status</th>
              <th align="left">Action</th>
            </tr>
          </thead>

          <tbody>
            {applications.map((app) => (
              <tr
                key={app.application_number}
                style={{
                  borderTop: "1px solid #ddd",
                }}
              >
                <td>{app.application_number}</td>
                <td>{app.full_name}</td>
                <td>{app.phone}</td>
                <td>{app.loan_type}</td>
                <td>K {Number(app.loan_amount).toLocaleString()}</td>
                <td>{app.status}</td>

                <td>
                  <button
                    style={{
                      padding: "8px 14px",
                      background: "#2563eb",
                      color: "#fff",
                      border: "none",
                      borderRadius: 8,
                      cursor: "pointer",
                    }}
                  >
                    View
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
