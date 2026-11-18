// src/pages/AdminPayments.tsx
// TutoFriends Admin Payment Verification
// Quick rejection with preset reasons.
// Approval still requires independent verification.

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type FormEvent,
} from "react";

import { userService } from "../data/userService";
import "../css/adminPayments.css";

// ==========================================
// TYPES
// ==========================================

type PendingPayment = {
  payment_id: number;
  booking_id: number;
  amount_due: string | number;
  currency: string;
  payment_method: string | null;
  payment_reference: string | null;
  payment_status: "pending_verification";
  updated_at: string;
  booking_status: string;
  student_id: number;
  student_name: string;
  tutor_name: string;
};

type QueueResponse = {
  success: boolean;
  message?: string;
  payments?: PendingPayment[];
};

type ReviewResponse = {
  success: boolean;
  message?: string;
  payment_status?: "paid" | "unpaid";
};

// ==========================================
// PRESET REJECTION REASONS
// No typing required when rejecting.
// ==========================================

const REJECTION_REASONS = [
  {
    label: "Payment could not be verified",
    value:
      "Payment claim rejected because receipt could not be independently verified.",
  },
  {
    label: "Invalid transaction reference",
    value:
      "Payment claim rejected due to an invalid or incorrect transaction reference.",
  },
  {
    label: "Invalid demo request",
    value:
      "Demo payment request rejected; the student can submit another simulated checkout.",
  },
  {
    label: "Incorrect payment details",
    value:
      "Payment claim rejected because the submitted payment details did not match.",
  },
] as const;

// ==========================================
// HELPERS
// ==========================================

function pesos(
  value: string | number
): string {
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
  }).format(Number(value));
}

function prettyMethod(
  value: string | null
): string {
  switch (value) {
    case "demo_gcash":
      return "GCash (demo)";
    case "demo_maya":
      return "Maya (demo)";
    case "demo_card":
      return "Card (demo)";
    case "demo_bank_transfer":
      return "Bank transfer (demo)";
    case "gcash":
      return "GCash";

    case "maya":
      return "Maya";

    case "bank_transfer":
      return "Bank transfer";

    default:
      return "Not specified";
  }
}

function prettyDate(
  value: string
): string {
  const date = new Date(value);

  return Number.isNaN(date.getTime())
    ? value
    : new Intl.DateTimeFormat("en-PH", {
        dateStyle: "medium",
        timeStyle: "short",
        timeZone: "Asia/Manila",
      }).format(date);
}

function getError(
  error: unknown
): string {
  return error instanceof Error
    ? error.message
    : "Unable to complete the request.";
}

function isTestReference(
  reference: string | null
): boolean {
  return /^\s*(?:TEST|DEMO|FAKE)[-_ ]/i.test(
    reference ?? ""
  );
}

// ==========================================
// ADMIN PAYMENT COMPONENT
// ==========================================

export default function AdminPayments() {
  // ----------------------------------------
  // MAIN STATES
  // ----------------------------------------

  const [payments, setPayments] =
    useState<PendingPayment[]>([]);

  const [selectedId, setSelectedId] =
    useState<number | null>(null);

  const [search, setSearch] =
    useState("");

  const [loading, setLoading] =
    useState(true);

  const [submitting, setSubmitting] =
    useState(false);

  const [error, setError] =
    useState("");

  const [notice, setNotice] =
    useState("");

  // ----------------------------------------
  // APPROVAL STATES
  // ----------------------------------------

  const [remarks, setRemarks] =
    useState("");

  const [
    typedReference,
    setTypedReference,
  ] = useState("");

  const [
    independentlyVerified,
    setIndependentlyVerified,
  ] = useState(false);

  // ----------------------------------------
  // REJECTION STATE
  // ----------------------------------------

  const [
    rejectionReason,
    setRejectionReason,
  ] = useState<string>(
    REJECTION_REASONS[0].value
  );

  // ========================================
  // LOAD PENDING PAYMENTS
  // ========================================

  const loadPayments = useCallback(
    async () => {
      setLoading(true);
      setError("");

      try {
        const response = await fetch(
          "/api/payments/admin/pending",
          {
            credentials: "same-origin",
            cache: "no-store",
          }
        );

        const data =
          (await response.json()) as
            QueueResponse;

        if (
          !response.ok ||
          !data.success ||
          !Array.isArray(data.payments)
        ) {
          throw new Error(
            data.message ||
              `Unable to load payments (HTTP ${response.status}).`
          );
        }

        setPayments(data.payments);

        setSelectedId((current) =>
          data.payments!.some(
            (payment) =>
              payment.payment_id === current
          )
            ? current
            : data.payments![0]?.payment_id ??
              null
        );
      } catch (cause) {
        setError(getError(cause));
      } finally {
        setLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    void loadPayments();
  }, [loadPayments]);

  // ========================================
  // SEARCH PAYMENTS
  // ========================================

  const filtered = useMemo(() => {
    const query =
      search.trim().toLowerCase();

    if (!query) {
      return payments;
    }

    return payments.filter(
      (payment) =>
        [
          payment.student_name,
          payment.tutor_name,
          payment.booking_id,
          payment.payment_id,
          payment.payment_reference ?? "",
        ].some((field) =>
          String(field)
            .toLowerCase()
            .includes(query)
        )
    );
  }, [payments, search]);

  // ========================================
  // SELECTED PAYMENT
  // ========================================

  const selected =
    payments.find(
      (payment) =>
        payment.payment_id === selectedId
    ) ?? null;

  const normalizedReference =
    selected?.payment_reference?.trim() ??
    "";

  // ========================================
  // VALIDATE APPROVAL
  // ========================================

  const canApprove =
    !!selected &&
    !submitting &&
    (selected.payment_method?.startsWith("demo_") ||
      !isTestReference(normalizedReference)) &&
    !!normalizedReference &&
    typedReference.trim() ===
      normalizedReference &&
    independentlyVerified &&
    remarks.trim().length >= 10 &&
    remarks.trim().length <= 350;

  // ========================================
  // VALIDATE REJECTION
  // No typed remarks required.
  // ========================================

  const canReject =
    !!selected &&
    !submitting &&
    rejectionReason.length >= 10;

  // ========================================
  // SELECT PAYMENT
  // ========================================

  function choosePayment(
    paymentId: number
  ) {
    setSelectedId(paymentId);

    setRemarks("");
    setTypedReference("");
    setIndependentlyVerified(false);

    setRejectionReason(
      REJECTION_REASONS[0].value
    );

    setError("");
    setNotice("");
  }

  // ========================================
  // APPROVE OR REJECT
  // ========================================

  async function review(
    action: "approve" | "reject"
  ) {
    if (!selected || submitting) {
      return;
    }

    // --------------------------------------
    // APPROVAL SAFEGUARDS
    // --------------------------------------

    if (
      action === "approve" &&
      !canApprove
    ) {
      setError(
        "To approve, verify the payment, " +
          "enter the matching reference, " +
          "and provide review notes."
      );

      return;
    }

    // --------------------------------------
    // REJECTION VALIDATION
    // --------------------------------------

    if (
      action === "reject" &&
      !canReject
    ) {
      setError(
        "Select a payment and a rejection reason."
      );

      return;
    }

    // --------------------------------------
    // CONFIRMATION
    // --------------------------------------

    const confirmation =
      action === "approve"
        ? selected.payment_method?.startsWith("demo_")
          ? `Approve SIMULATED payment #${selected.payment_id} for ${pesos(selected.amount_due)}? This creates only fictional receipts and demo earnings, not real funds.`
          : `Approve payment #${selected.payment_id} for ${pesos(selected.amount_due)}? Confirm that actual receipt was independently verified.`
        : `Reject payment claim #${selected.payment_id} for Booking #${selected.booking_id}?

Reason: ${REJECTION_REASONS.find(
            (item) =>
              item.value === rejectionReason
          )?.label ?? "Payment not verified"}

The claim will return to Unpaid and its reference will be cleared.

Only continue after checking that no confirmed funds require reconciliation.`;

    if (
      !window.confirm(confirmation)
    ) {
      return;
    }

    // --------------------------------------
    // AUTOMATIC REJECTION NOTES
    // --------------------------------------

    const finalRemarks =
      action === "reject"
        ? rejectionReason
        : remarks.trim();

    setSubmitting(true);
    setError("");
    setNotice("");

    try {
      const response = await fetch(
        `/api/payments/${selected.payment_id}/review`,
        {
          method: "PATCH",

          credentials: "same-origin",

          headers: {
            "Content-Type":
              "application/json",

            "X-TF-Action":
              "manual-payment",
          },

          body: JSON.stringify({
            action,

            remarks:
              finalRemarks,

            independently_verified:
              action === "approve" &&
              independentlyVerified,
          }),
        }
      );

      const data =
        (await response.json()) as
          ReviewResponse;

      if (
        !response.ok ||
        !data.success
      ) {
        throw new Error(
          data.message ||
            `Payment review failed (HTTP ${response.status}).`
        );
      }

      // ------------------------------------
      // RESET FORM
      // ------------------------------------

      setRemarks("");
      setTypedReference("");
      setIndependentlyVerified(false);

      setRejectionReason(
        REJECTION_REASONS[0].value
      );

      setNotice(
        data.message ||
          (action === "reject"
            ? "Payment claim rejected."
            : "Payment approved.")
      );

      await loadPayments();
    } catch (cause) {
      setError(
        getError(cause)
      );
    } finally {
      setSubmitting(false);
    }
  }

  // ========================================
  // APPROVAL FORM SUBMIT
  // ========================================

  function handleReviewSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    void review("approve");
  }

  // ========================================
  // ADMIN LOGOUT
  // ========================================

  async function logout() {
    try {
      await userService.logout();
    } catch (cause) {
      console.error(
        "Logout failed:",
        cause
      );
    } finally {
      window.location.replace(
        "/login"
      );
    }
  }

  // ========================================
  // RENDER
  // ========================================

  return (
    <div className="ap-page">

      {/* ===================================
          PAGE HEADER
      =================================== */}

      <header className="ap-header">
        <div>
          <div className="ap-eyebrow">
            TUTOFRIENDS · ADMIN
          </div>

          <h1>
            Payment Verification
          </h1>

          <p>
            Review student payment claims
            and verify transaction details.
          </p>
        </div>

        <div className="ap-header-actions">

          <button
            type="button"
            disabled={
              loading || submitting
            }
            onClick={() =>
              void loadPayments()
            }
          >
            {loading
              ? "Refreshing..."
              : "Refresh queue"}
          </button>

          <button
            type="button"
            className="ap-outline"
            onClick={() =>
              void logout()
            }
          >
            Log out
          </button>

        </div>
      </header>

      {/* ===================================
          PAYMENT SUMMARY
      =================================== */}

      <div className="ap-summary">

        <div className="ap-summary-card">
          <span>
            Pending claims
          </span>

          <strong>
            {payments.length}
          </strong>

          <small>
            Awaiting verification
          </small>
        </div>

        <div className="ap-summary-card">
          <span>
            Total amount claimed
          </span>

          <strong>
            {pesos(
              payments.reduce(
                (sum, payment) =>
                  sum +
                  Number(
                    payment.amount_due
                  ),
                0
              )
            )}
          </strong>

          <small>
            Not verified revenue
          </small>
        </div>

      </div>

      {/* ===================================
          VERIFICATION REMINDER
      =================================== */}

      <p className="ap-warning">
        Demo checkout claims are fictional: approving one creates a simulated
        receipt and credits demo earnings only. Manual payment claims still
        require independent confirmation of actual received funds.
      </p>

      {/* ===================================
          ALERTS
      =================================== */}

      {error && (
        <p
          role="alert"
          className="ap-error"
        >
          {error}
        </p>
      )}

      {notice && (
        <p
          role="status"
          className="ap-success"
        >
          {notice}
        </p>
      )}

      {/* ===================================
          MAIN PAYMENT LAYOUT
      =================================== */}

      <div className="ap-layout">

        {/* ===============================
            LEFT: PAYMENT QUEUE
        =============================== */}

        <section
          className="ap-panel"
          aria-label="Pending payment claims"
        >
          <div className="ap-panel-heading">
            <h2>
              Verification queue
            </h2>

            <span>
              {filtered.length} shown
            </span>
          </div>

          {/* SEARCH */}

          <input
            className="ap-input"
            type="search"

            placeholder="Search student, tutor, booking or reference"

            aria-label="Search payment claims"

            value={search}

            onChange={(event) =>
              setSearch(
                event.target.value
              )
            }
          />

          {/* QUEUE */}

          {loading ? (
            <p
              className="ap-empty"
              role="status"
            >
              Loading payment claims...
            </p>
          ) : filtered.length === 0 ? (
            <p className="ap-empty">
              No matching pending payment
              claims.
            </p>
          ) : (
            <div className="ap-queue">
              {filtered.map(
                (payment) => (
                  <button
                    type="button"

                    key={
                      payment.payment_id
                    }

                    className={`ap-queue-item ${
                      selectedId ===
                      payment.payment_id
                        ? "selected"
                        : ""
                    }`}

                    aria-pressed={
                      selectedId ===
                      payment.payment_id
                    }

                    onClick={() =>
                      choosePayment(
                        payment.payment_id
                      )
                    }
                  >

                    <div className="ap-queue-top">
                      <strong>
                        {payment.student_name}
                      </strong>

                      <span>
                        {pesos(
                          payment.amount_due
                        )}
                      </span>
                    </div>

                    <div className="ap-queue-meta">
                      Booking #
                      {payment.booking_id}
                      {" · "}
                      {prettyMethod(
                        payment.payment_method
                      )}
                    </div>

                    <div className="ap-queue-ref">
                      Reference:{" "}
                      {payment.payment_reference ||
                        "Missing"}
                    </div>

                  </button>
                )
              )}
            </div>
          )}
        </section>

        {/* ===============================
            RIGHT: PAYMENT REVIEW
        =============================== */}

        <section
          className="ap-panel"
          aria-label="Review selected payment"
        >
          <div className="ap-panel-heading">
            <h2>
              Review payment
            </h2>

            {selected && (
              <span>
                Payment #
                {selected.payment_id}
              </span>
            )}
          </div>

          {!selected ? (
            <p className="ap-empty">
              Select a payment claim from
              the queue.
            </p>
          ) : (
            <form
              className="ap-review-form"
              onSubmit={
                handleReviewSubmit
              }
            >

              {/* ===========================
                  PAYMENT INFORMATION
              =========================== */}

              <div className="ap-details">

                <div>
                  <span>
                    Student
                  </span>

                  <strong>
                    {selected.student_name}
                  </strong>
                </div>

                <div>
                  <span>
                    Tutor
                  </span>

                  <strong>
                    {selected.tutor_name}
                  </strong>
                </div>

                <div>
                  <span>
                    Booking
                  </span>

                  <strong>
                    #{selected.booking_id}
                    {" · "}
                    {selected.booking_status}
                  </strong>
                </div>

                <div>
                  <span>
                    Amount claimed
                  </span>

                  <strong>
                    {pesos(
                      selected.amount_due
                    )}
                  </strong>
                </div>

                <div>
                  <span>
                    Payment method
                  </span>

                  <strong>
                    {prettyMethod(
                      selected.payment_method
                    )}
                  </strong>
                </div>

                <div>
                  <span>
                    Transaction reference
                  </span>

                  <strong className="ap-reference">
                    {normalizedReference ||
                      "Missing"}
                  </strong>
                </div>

                <div>
                  <span>
                    Last updated
                  </span>

                  <strong>
                    {prettyDate(
                      selected.updated_at
                    )}
                  </strong>
                </div>

              </div>

              {/* ===========================
                  TEST REFERENCE WARNING
              =========================== */}

              {isTestReference(
                normalizedReference
              ) && (
                <p className="ap-error">
                  This looks like an unverified test reference, not a
                  completed demo checkout. Only approve genuine manual
                  claims after independently confirming actual receipt.
                </p>
              )}

              {/* ===========================
                  QUICK REJECTION
              =========================== */}

              <div
                style={{
                  padding: 16,
                  borderRadius: 12,
                  border:
                    "1px solid #fecaca",
                  background: "#fff7f7",
                  display: "grid",
                  gap: 12,
                }}
              >
                <div>
                  <strong
                    style={{
                      color: "#991b1b",
                    }}
                  >
                    Quick Reject
                  </strong>

                  <p
                    style={{
                      margin:
                        "5px 0 0",
                      fontSize: 12,
                      color: "#64748b",
                      lineHeight: 1.6,
                    }}
                  >
                    Choose a reason and
                    reject the claim.
                    No typing required.
                  </p>
                </div>

                <label
                  className="ap-label"
                  htmlFor="ap-reject-reason"
                >
                  Reason for rejection
                </label>

                <select
                  id="ap-reject-reason"
                  className="ap-input"

                  value={
                    rejectionReason
                  }

                  onChange={(event) =>
                    setRejectionReason(
                      event.target.value
                    )
                  }

                  disabled={
                    submitting
                  }
                >
                  {REJECTION_REASONS.map(
                    (reason) => (
                      <option
                        key={
                          reason.value
                        }
                        value={
                          reason.value
                        }
                      >
                        {reason.label}
                      </option>
                    )
                  )}
                </select>

                <button
                  type="button"
                  className="ap-reject"

                  disabled={
                    !canReject
                  }

                  onClick={() =>
                    void review(
                      "reject"
                    )
                  }
                >
                  {submitting
                    ? "Processing..."
                    : "Reject claim"}
                </button>

                <small
                  style={{
                    color: "#64748b",
                    lineHeight: 1.5,
                  }}
                >
                  The reason will be
                  automatically recorded
                  in payment history.
                  Reject only after
                  checking that no received
                  funds require reconciliation.
                </small>
              </div>

              {/* ===========================
                  APPROVAL SECTION
              =========================== */}

              <div className="ap-verification-box">

                <h3
                  style={{
                    margin:
                      "0 0 8px",
                    fontSize: 15,
                  }}
                >
                  Approve Payment
                </h3>

                {/* APPROVAL NOTES */}

                <label
                  className="ap-label"
                  htmlFor="ap-notes"
                >
                  Verification notes
                  (10–350 characters)
                </label>

                <textarea
                  id="ap-notes"
                  className="ap-input"

                  rows={3}

                  minLength={10}
                  maxLength={350}

                  placeholder={selected.payment_method?.startsWith("demo_")
                    ? "Explain why you approve this fictional payment."
                    : "Describe how the payment was independently verified."}

                  value={remarks}

                  onChange={(event) =>
                    setRemarks(
                      event.target.value
                    )
                  }

                  disabled={
                    submitting
                  }
                />

                {/* REFERENCE CONFIRMATION */}

                <label
                  className="ap-label"
                  htmlFor="ap-reference-confirmation"
                >
                  Exact transaction reference
                </label>

                <input
                  id="ap-reference-confirmation"
                  className="ap-input"

                  value={
                    typedReference
                  }

                  autoComplete="off"

                  placeholder="Type the exact reference to approve"

                  onChange={(event) =>
                    setTypedReference(
                      event.target.value
                    )
                  }

                  disabled={
                    submitting ||
                    (!selected.payment_method?.startsWith("demo_") &&
                      isTestReference(normalizedReference))
                  }
                />

                {/* VERIFIED CHECKBOX */}

                <label className="ap-checkbox">
                  <input
                    type="checkbox"

                    checked={
                      independentlyVerified
                    }

                    onChange={(event) =>
                      setIndependentlyVerified(
                        event.target.checked
                      )
                    }

                    disabled={
                      submitting ||
                      (!selected.payment_method?.startsWith("demo_") &&
                        isTestReference(normalizedReference))
                    }
                  />

                  <span>
                    {selected.payment_method?.startsWith("demo_")
                      ? "I reviewed this fictional checkout and understand approval records only simulated earnings; no real money was received."
                      : "I checked official payment records and independently confirmed that this amount was received."}
                  </span>
                </label>

                {/* APPROVE BUTTON */}

                <button
                  type="submit"
                  className="ap-approve"

                  disabled={
                    !canApprove
                  }

                  style={{
                    width: "100%",
                    marginTop: 8,
                  }}
                >
                  {submitting
                    ? "Processing..."
                    : selected.payment_method?.startsWith("demo_")
                      ? "Approve simulated payment"
                      : "Approve & mark Paid"}
                </button>

              </div>
            </form>
          )}
        </section>
      </div>
    </div>
  );
}