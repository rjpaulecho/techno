// src/components/DemoCheckoutModal.tsx
// SIMULATED payments only. No real financial details.

import {
  useEffect,
  useRef,
  useState,
  type FormEvent,
} from "react";

import "../css/demoCheckout.css";

type Method =
  | "gcash"
  | "maya"
  | "card"
  | "bank_transfer";

type Step = "details" | "otp" | "receipt";

type Preview = {
  success: boolean;
  enabled: boolean;
  reason: string | null;
  gross_amount: string;
  platform_fee: string;
  tutor_share: string;
  commission_percent: string;
  message?: string;
};

type StartResult = {
  success: boolean;
  attempt_id: number;
  masked_number: string;
  message?: string;
};

type Confirmation = {
  success: boolean;
  attempt_reference: string;
  payment_status: "pending_verification" | "paid";
  message?: string;
};

type Props = {
  bookingId: number;
  tutorName: string;
  subjectName: string;
  onClose: () => void;
  onPaid: () => void | Promise<void>;
};

const methods: {
  id: Method;
  label: string;
  hint: string;
}[] = [
  {
    id: "gcash",
    label: "GCash (demo)",
    hint: "Fictional mobile number",
  },
  {
    id: "maya",
    label: "Maya (demo)",
    hint: "Fictional mobile number",
  },
  {
    id: "card",
    label: "Debit / Credit Card (demo)",
    hint: "Fictional card digits",
  },
  {
    id: "bank_transfer",
    label: "Bank Transfer (demo)",
    hint: "Fictional account digits",
  },
];

function currency(value: string) {
  const n = Number(value);

  return Number.isFinite(n)
    ? new Intl.NumberFormat("en-PH", {
        style: "currency",
        currency: "PHP",
      }).format(n)
    : "—";
}

async function jsonResponse<
  T extends {
    success: boolean;
    message?: string;
  }
>(response: Response): Promise<T> {
  const body = (await response
    .json()
    .catch(() => null)) as T | null;

  if (!response.ok || !body?.success) {
    throw new Error(
      body?.message ??
        `Payment request failed (HTTP ${response.status}).`
    );
  }

  return body;
}

export default function DemoCheckoutModal({
  bookingId,
  tutorName,
  subjectName,
  onClose,
  onPaid,
}: Props) {
  const [preview, setPreview] =
    useState<Preview | null>(null);

  const [step, setStep] =
    useState<Step>("details");

  const [method, setMethod] =
    useState<Method>("gcash");

  const [sampleDigits, setSampleDigits] =
    useState("");

  const [otp, setOtp] = useState("");

  const [attemptId, setAttemptId] =
    useState<number | null>(null);

  const [masked, setMasked] =
    useState("");

  const [receipt, setReceipt] =
    useState<Confirmation | null>(null);

  const [loading, setLoading] =
    useState(true);

  const [busy, setBusy] =
    useState(false);

  const [error, setError] =
    useState("");

  const [notice, setNotice] =
    useState("");

  const headingRef =
    useRef<HTMLHeadingElement>(null);

  // ==========================================
  // LOAD BOOKING AND PAYMENT PREVIEW
  // ==========================================

  useEffect(() => {
    headingRef.current?.focus();

    const controller =
      new AbortController();

    async function load() {
      try {
        const response = await fetch(
          `/api/demo-payments/${bookingId}/preview`,
          {
            credentials: "same-origin",
            cache: "no-store",
            signal: controller.signal,
          }
        );

        const data =
          await jsonResponse<Preview>(
            response
          );

        if (!controller.signal.aborted) {
          setPreview(data);
        }
      } catch (cause) {
        if (!controller.signal.aborted) {
          setError(
            cause instanceof Error
              ? cause.message
              : "Checkout is unavailable."
          );
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    void load();

    return () => controller.abort();
  }, [bookingId]);

  // ==========================================
  // ESCAPE KEY CLOSES MODAL
  // ==========================================

  useEffect(() => {
    function escape(event: KeyboardEvent) {
      if (event.key === "Escape" && !busy) {
        onClose();
      }
    }

    document.addEventListener(
      "keydown",
      escape
    );

    return () =>
      document.removeEventListener(
        "keydown",
        escape
      );
  }, [busy, onClose]);

  // ==========================================
  // START FICTIONAL PAYMENT
  // ==========================================

  async function start(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (!preview?.enabled || busy) return;

    if (!/^\d{1,24}$/.test(sampleDigits)) {
      setError(
        "Enter 1–24 fictional digits only. Never use real account details."
      );
      return;
    }

    setBusy(true);
    setError("");

    try {
      const response = await fetch(
        `/api/demo-payments/${bookingId}/start`,
        {
          method: "POST",
          credentials: "same-origin",
          headers: {
            "Content-Type":
              "application/json",
            "X-TF-Action":
              "demo-payment",
          },
          body: JSON.stringify({
            payment_method: method,
            sample_number: sampleDigits,
          }),
        }
      );

      const data =
        await jsonResponse<StartResult>(
          response
        );

      setAttemptId(data.attempt_id);
      setMasked(data.masked_number);

      // Do not retain entered source digits.
      setSampleDigits("");

      setStep("otp");
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Could not start demo payment."
      );
    } finally {
      setBusy(false);
    }
  }

  // ==========================================
  // CONFIRM FICTIONAL OTP
  // ==========================================

  async function confirm(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (attemptId === null || busy) return;

    if (!/^\d{1,12}$/.test(otp)) {
      setError(
        "Type any 1–12 digit fictional OTP."
      );
      return;
    }

    setBusy(true);
    setError("");

    try {
      const response = await fetch(
        `/api/demo-payments/attempts/${attemptId}/confirm`,
        {
          method: "POST",
          credentials: "same-origin",
          headers: {
            "Content-Type":
              "application/json",
            "X-TF-Action":
              "demo-payment",
          },
          body: JSON.stringify({
            otp,
          }),
        }
      );

      const data =
        await jsonResponse<Confirmation>(
          response
        );

      setOtp("");
      setReceipt(data);
      setStep("receipt");

      // Refresh the booking list without
      // losing a successful receipt.
      try {
        await onPaid();
      } catch {
        setNotice(
          "Demo request submitted. Refresh My Bookings to see its pending status."
        );
      }
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Could not confirm demo payment."
      );
    } finally {
      setBusy(false);
    }
  }

  const selected =
    methods.find(
      (item) => item.id === method
    )!;

  // ==========================================
  // RENDER
  // ==========================================

  return (
    <div
      className="demo-checkout-overlay"
      onMouseDown={(event) => {
        if (
          event.target ===
            event.currentTarget &&
          !busy
        ) {
          onClose();
        }
      }}
    >
      <section
        className="demo-checkout-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="demo-checkout-heading"
      >
        {/* HEADER */}

        <header className="demo-checkout-heading">
          <div>
            <span className="demo-checkout-eyebrow">
              TUTOFRIENDS · SIMULATION ONLY
            </span>

            <h2
              id="demo-checkout-heading"
              tabIndex={-1}
              ref={headingRef}
            >
              {step === "receipt"
                ? "Awaiting Admin Approval"
                : step === "otp"
                  ? "Demo OTP Verification"
                  : "Demo Checkout"}
            </h2>
          </div>

          <button
            type="button"
            className="demo-checkout-close"
            onClick={onClose}
            disabled={busy}
            aria-label="Close demo checkout"
          >
            ×
          </button>
        </header>

        {/* SAFETY NOTICE */}

        <p className="demo-checkout-warning">
          Practice transaction only. Do not
          enter real mobile numbers, bank
          accounts, card details, passwords,
          PINs, or actual OTPs. No money
          is transferred.
        </p>

        {/* BOOKING INFORMATION */}

        <div className="demo-checkout-booking">
          <div>
            <strong>{subjectName}</strong>

            <span>
              Booking #{bookingId} · {tutorName}
            </span>
          </div>

          <strong>
            {preview
              ? currency(
                  preview.gross_amount
                )
              : "—"}
          </strong>
        </div>

        {loading && (
          <p role="status">
            Checking booking eligibility…
          </p>
        )}

        {error && (
          <p
            className="demo-checkout-error"
            role="alert"
          >
            {error}
          </p>
        )}

        {notice && (
          <p
            className="demo-checkout-notice"
            role="status"
          >
            {notice}
          </p>
        )}

        {/* BOOKED BUT NOT ELIGIBLE */}

        {!loading &&
          !preview?.enabled &&
          step !== "receipt" && (
            <p className="demo-checkout-blocked">
              {preview?.reason ||
                "This booking is not eligible for demo payment."}
            </p>
          )}

        {/* ===================================
            STEP 1 — PAYMENT METHOD
        =================================== */}

        {preview?.enabled &&
          step === "details" && (
            <form
              className="demo-checkout-form"
              onSubmit={(event) =>
                void start(event)
              }
            >
              <fieldset
                className="demo-checkout-methods"
                disabled={busy}
              >
                <legend>
                  Payment method (fictional)
                </legend>

                {methods.map((item) => (
                  <label
                    key={item.id}
                    className={
                      method === item.id
                        ? "demo-method selected"
                        : "demo-method"
                    }
                  >
                    <input
                      type="radio"
                      name="demo-method"
                      value={item.id}
                      checked={
                        method === item.id
                      }
                      onChange={() => {
                        setMethod(item.id);
                        setSampleDigits("");
                        setError("");
                      }}
                    />

                    <span>{item.label}</span>
                  </label>
                ))}
              </fieldset>

              <label className="demo-checkout-field">
                <span>
                  {selected.hint} (demo only)
                </span>

                <input
                  type="text"
                  inputMode="numeric"
                  autoComplete="off"
                  value={sampleDigits}
                  maxLength={24}
                  placeholder={
                    method === "card"
                      ? "4111111111111111 (sample only)"
                      : "09123456789 (sample only)"
                  }
                  onChange={(event) =>
                    setSampleDigits(
                      event.target.value.replace(
                        /\D/g,
                        ""
                      )
                    )
                  }
                  required
                />
              </label>

              {/* AMOUNT BREAKDOWN */}

              <div className="demo-checkout-split">
                <div>
                  <span>Session total</span>

                  <strong>
                    {currency(
                      preview.gross_amount
                    )}
                  </strong>
                </div>

                <div>
                  <span>
                    Platform demo fee (
                    {preview.commission_percent}
                    %)
                  </span>

                  <strong>
                    {currency(
                      preview.platform_fee
                    )}
                  </strong>
                </div>

                <div>
                  <span>
                    Tutor demo earnings
                  </span>

                  <strong>
                    {currency(
                      preview.tutor_share
                    )}
                  </strong>
                </div>
              </div>

              <button
                className="demo-checkout-primary"
                type="submit"
                disabled={
                  busy ||
                  !/^\d{1,24}$/.test(
                    sampleDigits
                  )
                }
              >
                {busy
                  ? "Preparing…"
                  : "Continue to demo OTP"}
              </button>
            </form>
          )}

        {/* ===================================
            STEP 2 — FICTIONAL OTP
        =================================== */}

        {step === "otp" && (
          <form
            className="demo-checkout-form"
            onSubmit={(event) =>
              void confirm(event)
            }
          >
            <p className="demo-checkout-instruction">
              This is a fictional
              verification screen.{" "}
              <strong>
                No OTP has been sent.
              </strong>{" "}
              Any numeric code from 1 to
              12 digits is valid.
            </p>

            <p className="demo-checkout-instruction">
              {selected.label} · {masked}
            </p>

            <label className="demo-checkout-field">
              <span>
                Sample OTP (any digits)
              </span>

              <input
                type="text"
                inputMode="numeric"
                autoComplete="off"
                value={otp}
                maxLength={12}
                placeholder="Example: 123456"
                onChange={(event) =>
                  setOtp(
                    event.target.value.replace(
                      /\D/g,
                      ""
                    )
                  )
                }
                required
              />
            </label>

            <button
              className="demo-checkout-primary"
              type="submit"
              disabled={
                busy ||
                !/^\d{1,12}$/.test(otp)
              }
            >
              {busy
                ? "Sending demo request…"
                : "Submit for admin approval"}
            </button>

            <button
              className="demo-checkout-secondary"
              type="button"
              onClick={onClose}
              disabled={busy}
            >
              Cancel demo checkout
            </button>
          </form>
        )}

        {/* ===================================
            STEP 3 — DEMO RECEIPT
        =================================== */}

        {step === "receipt" && receipt && (
          <div className="demo-checkout-receipt">
            <strong className="demo-checkout-success">
              {receipt.payment_status === "paid"
                ? "Demo payment already approved ✓"
                : "Submitted for admin review ✓"}
            </strong>

            <dl>
              <div>
                <dt>Demo request reference</dt>
                <dd>{receipt.attempt_reference}</dd>
              </div>

              <div>
                <dt>Booking</dt>
                <dd>#{bookingId}</dd>
              </div>

              <div>
                <dt>Method</dt>
                <dd>
                  {selected.label} · {masked}
                </dd>
              </div>

              <div>
                <dt>Fictional total</dt>
                <dd>{preview ? currency(preview.gross_amount) : "—"}</dd>
              </div>
            </dl>

            <p className="demo-checkout-instruction">
              {receipt.payment_status === "paid"
                ? "This simulated payment was already approved. No real money was charged."
                : "The admin must approve this demo request before it is marked Paid or fictional earnings are created. No money was charged."}
            </p>

            <button
              type="button"
              className="demo-checkout-primary"
              onClick={onClose}
            >
              Done
            </button>
          </div>
        )}
      </section>
    </div>
  );
}