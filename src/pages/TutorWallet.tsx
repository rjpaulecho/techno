
import {
  type FormEvent,
  useCallback,
  useEffect,
  useState,
} from "react";

import "../css/tutorWallet.css";

type WithdrawalRecord = {
  withdrawal_id: number;
  withdrawal_reference: string;
  account_email: string;
  payout_method: "gcash" | "maya" | "bank_transfer";
  masked_destination: string;
  amount: string;
  balance_before: string;
  balance_after: string;
  status: string;
  created_at: string;
};

type DemoWalletResponse = {
  success: boolean;
  message?: string;
  environment: string;
  account: {
    tutor_id: number;
    email: string;
  };
  summary: {
    total_earnings: string;
    total_withdrawn: string;
    available_balance: string;
    currency: string;
  };
  withdrawals: WithdrawalRecord[];
};

type EarningsTransaction = {
  receipt_id: number;
  receipt_number: string;
  booking_id: number;
  student_name: string;
  subject_name: string | null;
  payment_method: string;
  masked_number: string;
  gross_amount: string;
  tutor_earnings: string;
  platform_fee: string;
  receipt_status: string;
  created_at: string;
};

type TutorEarningsResponse = {
  success: boolean;
  message?: string;
  environment: string;
  summary: {
    transaction_count: number;
    total_demo_earnings: string;
    currency: string;
  };
  transactions: EarningsTransaction[];
};

type WithdrawalCreateResponse = {
  success: boolean;
  message?: string;
  withdrawal?: WithdrawalRecord;
  summary?: DemoWalletResponse["summary"];
};

// ==========================================
// HELPERS
// ==========================================

function php(value: string | number): string {
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
  }).format(Number(value || 0));
}

function payoutMethodLabel(method: string): string {
  switch (method) {
    case "gcash":
      return "GCash (Demo)";
    case "maya":
      return "Maya (Demo)";
    case "bank_transfer":
      return "Bank Transfer (Demo)";
    default:
      return method.replaceAll("_", " ");
  }
}

function displayDate(value: string): string {
  if (!value) return "—";

  const normalized = value.includes("T")
    ? value
    : value.replace(" ", "T");

  const date = new Date(normalized);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString("en-PH", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

// ==========================================
// TUTOR DEMO WALLET
// ==========================================

export default function TutorWallet() {
  const [wallet, setWallet] =
    useState<DemoWalletResponse | null>(null);

  const [earnings, setEarnings] =
    useState<TutorEarningsResponse | null>(null);

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const [amount, setAmount] = useState("");
  const [payoutMethod, setPayoutMethod] =
    useState<"gcash" | "maya" | "bank_transfer">("gcash");

  const [destinationLast4, setDestinationLast4] =
    useState("");

  const [latestSlip, setLatestSlip] =
    useState<WithdrawalRecord | null>(null);

  // ========================================
  // LOAD MYSQL WALLET AND EARNINGS
  // ========================================

  const loadWallet = useCallback(
    async (signal?: AbortSignal) => {
      setLoading(true);
      setError("");

      try {
        const [walletResponse, earningsResponse] =
          await Promise.all([
            fetch("/api/demo-withdrawals", {
              credentials: "same-origin",
              cache: "no-store",
              signal,
            }),
            fetch("/api/demo-earnings/tutor", {
              credentials: "same-origin",
              cache: "no-store",
              signal,
            }),
          ]);

        const [walletBody, earningsBody] =
          await Promise.all([
            walletResponse.json().catch(() => null),
            earningsResponse.json().catch(() => null),
          ]);

        const walletData =
          walletBody as DemoWalletResponse | null;

        const earningsData =
          earningsBody as TutorEarningsResponse | null;

        if (
          !walletResponse.ok ||
          !walletData?.success
        ) {
          throw new Error(
            walletData?.message ||
              `Wallet request failed (HTTP ${walletResponse.status}).`
          );
        }

        if (
          !earningsResponse.ok ||
          !earningsData?.success
        ) {
          throw new Error(
            earningsData?.message ||
              `Earnings request failed (HTTP ${earningsResponse.status}).`
          );
        }

        if (!signal?.aborted) {
          setWallet(walletData);
          setEarnings(earningsData);
        }
      } catch (cause) {
        if (!signal?.aborted) {
          setError(
            cause instanceof Error
              ? cause.message
              : "Unable to load your demo wallet."
          );
        }
      } finally {
        if (!signal?.aborted) {
          setLoading(false);
        }
      }
    },
    []
  );

  useEffect(() => {
    const controller = new AbortController();

    void loadWallet(controller.signal);

    return () => controller.abort();
  }, [loadWallet]);

  // ========================================
  // CREATE A SIMULATED WITHDRAWAL
  // ========================================

  async function handleWithdrawal(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setError("");
    setMessage("");
    setLatestSlip(null);

    if (!amount.trim() || !Number.isFinite(Number(amount))) {
      setError("Enter a valid withdrawal amount.");
      return;
    }

    if (Number(amount) <= 0) {
      setError("The withdrawal amount must be greater than zero.");
      return;
    }

    if (!/^\d{4}$/.test(destinationLast4)) {
      setError("Enter exactly four fictional destination digits.");
      return;
    }

    if (
      !wallet ||
      Number(amount) >
        Number(wallet.summary.available_balance)
    ) {
      setError("Your withdrawal amount exceeds your available balance.");
      return;
    }

    setSubmitting(true);

    try {
      const response = await fetch(
        "/api/demo-withdrawals",
        {
          method: "POST",
          credentials: "same-origin",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            amount,
            payout_method: payoutMethod,
            destination_last4: destinationLast4,
          }),
        }
      );

      const body =
        (await response.json().catch(() => null)) as
          | WithdrawalCreateResponse
          | null;

      if (!response.ok || !body?.success || !body.withdrawal) {
        throw new Error(
          body?.message ||
            `Withdrawal request failed (HTTP ${response.status}).`
        );
      }

      setLatestSlip(body.withdrawal);
      setMessage(
        body.message ||
          "Test withdrawal recorded. No real money was transferred."
      );

      setAmount("");
      setDestinationLast4("");

      // Reload balances and history from MySQL.
      await loadWallet();
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Could not create the test withdrawal."
      );
    } finally {
      setSubmitting(false);
    }
  }

  // ========================================
  // RENDER
  // ========================================

  return (
    <section className="tutor-section tutor-wallet-section">
      <div className="tutor-wallet-heading">
        <div className="tutor-page-title">
          <span className="tutor-panel-label">
            MYSQL DEMO WALLET
          </span>

          <h2>My Wallet</h2>

          <p>
            View your recorded tutoring earnings and
            withdraw imaginary funds for testing.
          </p>
        </div>

        <button
          type="button"
          className="tutor-wallet-refresh"
          disabled={loading || submitting}
          onClick={() => void loadWallet()}
        >
          {loading ? "Refreshing…" : "↻ Refresh"}
        </button>
      </div>



      {error && (
        <div className="tutor-wallet-error" role="alert">
          <strong>Something went wrong.</strong> {error}
        </div>
      )}

      {message && (
        <div className="tutor-wallet-success" role="status">
          {message}
        </div>
      )}

      {loading && !wallet && (
        <div className="tutor-panel" role="status">
          Loading your wallet from MySQL…
        </div>
      )}

      {wallet && earnings && (
        <>
          {/* ACCOUNT IDENTITY */}

          <div className="tutor-panel tutor-wallet-account">
            <span className="tutor-panel-label">
              WALLET ACCOUNT
            </span>

            <strong>{wallet.account.email}</strong>

            <small>
              Tutor account ID: #{wallet.account.tutor_id}
            </small>
          </div>

          {/* BALANCE CARDS */}

          <div className="tutor-wallet-stats">
            <article className="tutor-wallet-stat">
              <div className="tutor-wallet-stat-icon">₱</div>
              <span>Total recorded earnings</span>
              <strong>
                {php(wallet.summary.total_earnings)}
              </strong>
            </article>

            <article className="tutor-wallet-stat">
              <div className="tutor-wallet-stat-icon">↗</div>
              <span>Total demo withdrawals</span>
              <strong>
                {php(wallet.summary.total_withdrawn)}
              </strong>
            </article>

            <article className="tutor-wallet-stat tutor-wallet-available">
              <div className="tutor-wallet-stat-icon">◈</div>
              <span>Available demo balance</span>
              <strong>
                {php(wallet.summary.available_balance)}
              </strong>
            </article>
          </div>

          {/* WITHDRAWAL FORM */}

          <div className="tutor-panel tutor-wallet-withdraw-panel">
            <div className="tutor-panel-heading">
              <div>
                <span className="tutor-panel-label">
                  TEST WITHDRAWAL
                </span>

                <h2>Withdraw Demo Funds</h2>
              </div>
            </div>



            <form
              className="tutor-wallet-form"
              onSubmit={handleWithdrawal}
            >
              <label>
                Withdrawal amount (PHP)
                <input
                  type="number"
                  min="0.01"
                  max={wallet.summary.available_balance}
                  step="0.01"
                  inputMode="decimal"
                  value={amount}
                  onChange={(event) =>
                    setAmount(event.target.value)
                  }
                  placeholder="e.g. 100.00"
                  required
                  disabled={submitting}
                />
              </label>

              <label>
                Simulated payout method
                <select
                  value={payoutMethod}
                  onChange={(event) =>
                    setPayoutMethod(
                      event.target.value as
                        | "gcash"
                        | "maya"
                        | "bank_transfer"
                    )
                  }
                  disabled={submitting}
                >
                  <option value="gcash">GCash — Demo</option>
                  <option value="maya">Maya — Demo</option>
                  <option value="bank_transfer">
                    Bank transfer — Demo
                  </option>
                </select>
              </label>

              <label>
                Fictional destination digits
                <input
                  type="text"
                  inputMode="numeric"
                  autoComplete="off"
                  maxLength={4}
                  pattern="[0-9]{4}"
                  value={destinationLast4}
                  onChange={(event) =>
                    setDestinationLast4(
                      event.target.value.replace(/\D/g, "").slice(0, 4)
                    )
                  }
                  placeholder="1234"
                  required
                  disabled={submitting}
                />
              </label>

              <button
                type="submit"
                className="tutor-wallet-submit"
                disabled={
                  submitting ||
                  loading ||
                  Number(wallet.summary.available_balance) <= 0
                }
              >
                {submitting
                  ? "Recording withdrawal…"
                  : "Create Test Withdrawal Slip"}
              </button>
            </form>

            {submitting && (
              <div className="tutor-wallet-submitting" role="status">
                Recording withdrawal…
              </div>
            )}
          </div>

          {/* LATEST WITHDRAWAL SLIP */}

          {latestSlip && (
            <div className="tutor-panel tutor-wallet-slip">
              <div className="tutor-wallet-slip-heading">
                <div>
                  <span className="tutor-panel-label">
                    GENERATED TEST DOCUMENT
                  </span>

                  <h2>Withdrawal Slip</h2>
                </div>

                <span className="tutor-wallet-demo-badge">
                  SIMULATED
                </span>
              </div>



              <dl className="tutor-wallet-slip-details">
                <div>
                  <dt>Reference number</dt>
                  <dd>{latestSlip.withdrawal_reference}</dd>
                </div>

                <div>
                  <dt>Account email</dt>
                  <dd>{latestSlip.account_email}</dd>
                </div>

                <div>
                  <dt>Payout method</dt>
                  <dd>
                    {payoutMethodLabel(latestSlip.payout_method)}
                  </dd>
                </div>

                <div>
                  <dt>Destination</dt>
                  <dd>{latestSlip.masked_destination}</dd>
                </div>

                <div>
                  <dt>Withdrawal amount</dt>
                  <dd>{php(latestSlip.amount)}</dd>
                </div>

                <div>
                  <dt>Balance before</dt>
                  <dd>{php(latestSlip.balance_before)}</dd>
                </div>

                <div>
                  <dt>Balance after</dt>
                  <dd>{php(latestSlip.balance_after)}</dd>
                </div>

                <div>
                  <dt>Recorded date</dt>
                  <dd>{displayDate(latestSlip.created_at)}</dd>
                </div>

                <div>
                  <dt>Status</dt>
                  <dd>Simulated — no transfer made</dd>
                </div>
              </dl>
            </div>
          )}

          {/* WITHDRAWAL HISTORY */}

          <div className="tutor-panel tutor-wallet-history">
            <div className="tutor-panel-heading">
              <div>
                <span className="tutor-panel-label">
                  MYSQL WITHDRAWAL RECORDS
                </span>

                <h2>Withdrawal History</h2>
              </div>

              <span className="tutor-wallet-record-count">
                {wallet.withdrawals.length} records
              </span>
            </div>

            {wallet.withdrawals.length === 0 ? (
              <p className="tutor-wallet-empty">
                No demo withdrawals yet. A withdrawal slip
                will appear here after your first test withdrawal.
              </p>
            ) : (
              <div className="tutor-wallet-table-scroll">
                <table className="tutor-wallet-table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Reference</th>
                      <th>Method</th>
                      <th>Destination</th>
                      <th>Amount</th>
                      <th>Balance after</th>
                      <th>Status</th>
                    </tr>
                  </thead>

                  <tbody>
                    {wallet.withdrawals.map((item) => (
                      <tr key={item.withdrawal_id}>
                        <td>{displayDate(item.created_at)}</td>
                        <td>
                          <strong>{item.withdrawal_reference}</strong>
                        </td>
                        <td>{payoutMethodLabel(item.payout_method)}</td>
                        <td>{item.masked_destination}</td>
                        <td>{php(item.amount)}</td>
                        <td>{php(item.balance_after)}</td>
                        <td>Simulated</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* SUCCESSFUL DEMO EARNINGS */}

          <div className="tutor-panel tutor-wallet-history">
            <div className="tutor-panel-heading">
              <div>
                <span className="tutor-panel-label">
                  PAID DEMO RECEIPTS
                </span>

                <h2>Earnings History</h2>
              </div>

              <span className="tutor-wallet-record-count">
                {earnings.summary.transaction_count} transactions
              </span>
            </div>

            <p>
              Only successful simulated payments are included.
              Each earning is linked to the tutor account that
              received the booking payment.
            </p>

            {earnings.transactions.length === 0 ? (
              <p className="tutor-wallet-empty">
                No successful demo payments have credited
                earnings to this account yet.
              </p>
            ) : (
              <div className="tutor-wallet-table-scroll">
                <table className="tutor-wallet-table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Receipt / Booking</th>
                      <th>Student / Subject</th>
                      <th>Gross payment</th>
                      <th>Platform fee</th>
                      <th>Your earnings</th>
                    </tr>
                  </thead>

                  <tbody>
                    {earnings.transactions.map((item) => (
                      <tr key={item.receipt_id}>
                        <td>{displayDate(item.created_at)}</td>

                        <td>
                          <strong>{item.receipt_number}</strong>
                          <small>Booking #{item.booking_id}</small>
                        </td>

                        <td>
                          <strong>{item.student_name}</strong>
                          <small>{item.subject_name || "Tutoring session"}</small>
                        </td>

                        <td>{php(item.gross_amount)}</td>
                        <td>{php(item.platform_fee)}</td>

                        <td className="tutor-wallet-share">
                          {php(item.tutor_earnings)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </section>
  );
}
