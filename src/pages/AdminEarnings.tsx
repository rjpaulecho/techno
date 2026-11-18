// src/pages/AdminEarnings.tsx

import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

// ==========================================
// TYPES
// ==========================================

type Quote = {
  booking_id: number;
  session_date: string;
  tutor_name: string;
  student_name: string;
  subject_name: string;
  gross_amount: string;
  commission_bps: number;
  platform_fee_amount: string;
  tutor_share_amount: string;
  payment_status: string | null;
};

type EarningsResponse = {
  success: boolean;
  message?: string;
  commission_bps: number;
  note: string;

  totals: {
    estimated_gross: string;
    estimated_platform_fee: string;
    estimated_tutor_share: string;
    bookings_shown: number;
  };

  bookings: Quote[];
};

// ==========================================
// HELPERS
// ==========================================

const panel = {
  background: "white",
  border: "1px solid #e1e8f0",
  borderRadius: 14,
  padding: 20,
} as const;

const peso = (x: string) =>
  new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
  }).format(Number(x));

// ==========================================
// ADMIN EARNINGS
// ==========================================

export default function AdminEarnings() {
  const [data, setData] =
    useState<EarningsResponse | null>(null);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  // ========================================
  // LOAD PLATFORM ESTIMATES
  // ========================================

  async function load(
    signal?: AbortSignal
  ) {
    setLoading(true);
    setError("");

    try {
      const response = await fetch(
        "/api/wallet/admin",
        {
          credentials: "same-origin",
          cache: "no-store",
          signal,
        }
      );

      const result =
        (await response.json()) as EarningsResponse;

      if (
        !response.ok ||
        !result.success
      ) {
        throw new Error(
          result.message ||
            "Could not load earnings."
        );
      }

      if (!signal?.aborted) {
        setData(result);
      }
    } catch (cause) {
      if (!signal?.aborted) {
        setError(
          cause instanceof Error
            ? cause.message
            : "Could not load earnings."
        );
      }
    } finally {
      if (!signal?.aborted) {
        setLoading(false);
      }
    }
  }

  // ========================================
  // LOAD ON PAGE OPEN
  // ========================================

  useEffect(() => {
    const controller =
      new AbortController();

    void load(controller.signal);

    return () =>
      controller.abort();
  }, []);

  // ========================================
  // RENDER
  // ========================================

  return (
    <main
      style={{
        minHeight: "100vh",
        padding:
          "28px max(16px, calc((100vw - 1150px)/2))",
        background: "#f4f7fb",
        color: "#193047",
        fontFamily: "system-ui, sans-serif",
      }}
    >

      {/* HEADER */}

      <header
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 12,
          marginBottom: 24,
        }}
      >
        <div>
          <small
            style={{
              color: "#286e9c",
              fontWeight: 700,
            }}
          >
            TUTOFRIENDS · ADMIN
          </small>

          <h1 style={{ margin: "6px 0" }}>
            Platform Earnings
          </h1>

          <p
            style={{
              color: "#64748b",
              margin: 0,
            }}
          >
            Commission estimates across tutors
          </p>
        </div>

        <div
          style={{
            display: "flex",
            gap: 8,
          }}
        >
          <Link
            to="/admin/dashboard"
            style={{
              ...panel,
              padding: "10px 14px",
              textDecoration: "none",
              color: "#135e97",
            }}
          >
            ← Dashboard
          </Link>

          <button
            type="button"
            disabled={loading}
            onClick={() =>
              void load()
            }
            style={{
              ...panel,
              padding: "10px 14px",
              color: "#135e97",
              cursor: "pointer",
            }}
          >
            Refresh
          </button>
        </div>
      </header>

      {/* FINANCIAL NOTICE */}

      <p
        role="note"
        style={{
          ...panel,
          background: "#fffaf0",
          borderColor: "#f6e2b1",
          color: "#77591f",
          fontSize: 13,
        }}
      >
        <strong>
          Not collected revenue.
        </strong>{" "}
        These are theoretical splits for
        accepted/completed bookings.
        These estimates do not represent
        actual collected or withdrawable funds.
      </p>

      {error && (
        <p
          role="alert"
          style={{ color: "#b91c1c" }}
        >
          {error}
        </p>
      )}

      {loading && (
        <p role="status">
          Loading platform earnings estimates...
        </p>
      )}

      {data && !loading && (
        <>

          {/* STATISTICS */}

          <section
            style={{
              display: "grid",
              gridTemplateColumns:
                "repeat(auto-fit, minmax(210px, 1fr))",
              gap: 14,
              marginBottom: 18,
            }}
          >
            {[
              [
                "Estimated platform commission",
                peso(
                  data.totals.estimated_platform_fee
                ),
              ],
              [
                "Estimated tutor shares",
                peso(
                  data.totals.estimated_tutor_share
                ),
              ],
              [
                "Estimated gross sessions",
                peso(
                  data.totals.estimated_gross
                ),
              ],
            ].map(([label, amount]) => (
              <div
                key={label}
                style={panel}
              >
                <span
                  style={{
                    color: "#64748b",
                    fontSize: 12,
                  }}
                >
                  {label}
                </span>

                <div
                  style={{
                    fontSize: 24,
                    fontWeight: 800,
                    marginTop: 10,
                  }}
                >
                  {amount}
                </div>
              </div>
            ))}
          </section>

          {/* COMMISSION INFORMATION */}

          <section
            style={{
              ...panel,
              marginBottom: 18,
              fontSize: 13,
            }}
          >
            <h2
              style={{
                fontSize: 18,
                marginTop: 0,
              }}
            >
              Commission settings
            </h2>

            <p>
              Current commission:{" "}
              <strong>
                {(
                  data.commission_bps / 100
                ).toFixed(2)}
                %
              </strong>
              . Existing saved split snapshots
              retain their recorded rate.
              We won't edit commission
              percentages from this page
              until changes can be audited.
            </p>

            <p
              style={{
                color: "#64748b",
              }}
            >
              {data.note}
            </p>
          </section>

          {/* EARNINGS TABLE */}

          <section style={panel}>
            <h2
              style={{
                fontSize: 18,
                margin: "0 0 14px",
              }}
            >
              Estimated splits by booking
            </h2>

            {data.bookings.length === 0 ? (
              <p
                style={{
                  color: "#64748b",
                }}
              >
                No accepted or completed
                tutoring sessions yet.
              </p>
            ) : (
              <div
                style={{
                  overflowX: "auto",
                }}
              >
                <table
                  style={{
                    width: "100%",
                    borderCollapse: "collapse",
                    minWidth: 760,
                    fontSize: 13,
                  }}
                >
                  <thead>
                    <tr
                      style={{
                        textAlign: "left",
                        color: "#64748b",
                      }}
                    >
                      <th style={{ padding: 10 }}>
                        Booking
                      </th>
                      <th>Tutor</th>
                      <th>Subject</th>
                      <th>Gross</th>
                      <th>Commission</th>
                      <th>Tutor share</th>
                      <th>Payment record</th>
                    </tr>
                  </thead>

                  <tbody>
                    {data.bookings.map((b) => (
                      <tr
                        key={b.booking_id}
                        style={{
                          borderTop:
                            "1px solid #e9eef4",
                        }}
                      >
                        <td style={{ padding: 10 }}>
                          #{b.booking_id}

                          <div
                            style={{
                              color: "#64748b",
                            }}
                          >
                            {b.session_date}
                          </div>
                        </td>

                        <td>
                          {b.tutor_name}
                        </td>

                        <td>
                          {b.subject_name}
                        </td>

                        <td>
                          {peso(
                            b.gross_amount
                          )}
                        </td>

                        <td>
                          {peso(
                            b.platform_fee_amount
                          )}

                          <div
                            style={{
                              color: "#64748b",
                            }}
                          >
                            {(
                              b.commission_bps / 100
                            ).toFixed(2)}
                            %
                          </div>
                        </td>

                        <td>
                          {peso(
                            b.tutor_share_amount
                          )}
                        </td>

                        <td>
                          {b.payment_status ||
                            "No payment record"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </>
      )}
    </main>
  );
}