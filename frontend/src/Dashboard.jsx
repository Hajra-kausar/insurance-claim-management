import { useEffect, useState } from "react";

import api from "./api";

import Upload from "./Upload";

export default function Dashboard() {

  const [claims, setClaims] =
    useState([]);

  /* ================= LOAD CLAIMS ================= */

  const loadClaims = async () => {

    try {

      const res =
        await api.get("/claims");

      setClaims(res.data);

    } catch (err) {

      console.error(err);
    }
  };

  useEffect(() => {

    loadClaims();

  }, []);

  /* ================= UPDATE STATUS ================= */

  const updateStatus = async (
    id,
    status
  ) => {

    try {

      await api.put(

        `/claims/${id}/status`,

        {
          status
        }
      );

      alert(
        `Claim ${status}`
      );

      loadClaims();

    } catch (err) {

      console.error(err);

      alert(
        "Failed to update status"
      );
    }
  };

  return (

    <div className="dashboard-container">

      {/* ================= LEFT PANEL ================= */}

      <div className="upload-card">

        <h2>
          Upload Insurance Claim
        </h2>

        <Upload
          refreshClaims={loadClaims}
        />

      </div>

      {/* ================= RIGHT PANEL ================= */}

      <div className="history-card">

        <h2>
          Claim History
        </h2>

        <h3
          style={{
            color: "#facc15",
            marginBottom: "20px"
          }}
        >
          Newly Uploaded / Pending Claims
        </h3>

        {

          claims.length === 0 ? (

            <p>
              No claims uploaded yet.
            </p>

          ) : (

            claims.map((claim) => (

              <div

                key={claim._id}

                className="claim-item"

                style={{
                  background: "#020817",
                  padding: "18px",
                  borderRadius: "10px",
                  marginBottom: "15px",
                  position: "relative",
                  zIndex: 1
                }}
              >

                <p>
                  <strong>
                    Policy:
                  </strong>{" "}

                  {
                    claim.policy_number
                    || "N/A"
                  }

                </p>

                <p>
                  <strong>
                    Hospital:
                  </strong>{" "}

                  {
                    claim.hospital_name
                    || "N/A"
                  }

                </p>

                <p>
                  <strong>
                    Claim Amount:
                  </strong>{" "}

                  ₹
                  {
                    claim.claim_amount || 0
                  }

                </p>

                <p>
                  <strong>
                    Risk Score:
                  </strong>{" "}

                  {
                    claim.risk_score
                  }

                </p>

                <p>
                  <strong>
                    Risk Level:
                  </strong>{" "}

                  {
                    claim.risk_level
                  }

                </p>

                <p>

                  <strong>
                    Fraud:
                  </strong>{" "}

                  {

                    claim.analysis
                      ?.fraud_flag

                      ? "Yes 🚨"

                      : "No ✅"
                  }

                </p>

                {/* ================= STATUS ================= */}

                <p>

                  <strong>
                    Status:
                  </strong>{" "}

                  <span
                    style={{

                      color:

                        claim.status
                          === "Approved"

                          ? "#22c55e"

                          : claim.status
                          === "Rejected"

                          ? "#ef4444"

                          : "#facc15",

                      fontWeight:
                        "bold"
                    }}
                  >

                    {
                      claim.status
                      || "Pending Review"
                    }

                  </span>

                </p>

                {/* ================= BUTTONS ================= */}

                <div
                  style={{
                    display: "flex",
                    gap: "10px",
                    marginTop: "15px"
                  }}
                >

                  <button

                    type="button"

                    onClick={() =>
                      updateStatus(
                        claim._id,
                        "Approved"
                      )
                    }

                    style={{
                      background: "#22c55e",
                      color: "white",
                      border: "none",
                      padding: "8px 14px",
                      borderRadius: "6px",
                      cursor: "pointer",
                      fontWeight: "bold"
                    }}
                  >

                    Approve

                  </button>

                  <button

                    type="button"

                    onClick={() =>
                      updateStatus(
                        claim._id,
                        "Rejected"
                      )
                    }

                    style={{
                      background: "#ef4444",
                      color: "white",
                      border: "none",
                      padding: "8px 14px",
                      borderRadius: "6px",
                      cursor: "pointer",
                      fontWeight: "bold"
                    }}
                  >

                    Reject

                  </button>

                </div>

              </div>
            ))
          )
        }

      </div>

    </div>
  );
}