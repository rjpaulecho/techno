
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { Link } from "react-router-dom";
import "../css/transactions.css";

type View = "history" | "archived";

type Ticket = {
  payment_id: number;
  booking_id: number;
  payment_status: string;
  booking_status: string;
  payment_method: string | null;
  payment_reference: string | null;
  receipt_number: string | null;
  currency: string;
  amount_due: string | number;
  amount_paid: string | number;
  amount_refunded: string | number;
  subject_name: string;
  student_name: string;
  tutor_name: string;
  session_date: string;
  start_time: string;
  end_time: string;
  updated_at: string;
  last_activity_at: string;
  archived_at: string | null;
};

type PaymentEvent = {
  payment_history_id: number;
  old_status: string | null;
  new_status: string;
  remarks: string | null;
  changed_at: string;
};

type ApiResult = {
  success?: boolean;
  message?: string;
};

type TicketResponse = ApiResult & {
  tickets?: Ticket[];
};

type EventResponse = ApiResult & {
  events?: PaymentEvent[];
};

async function readJson<T extends ApiResult>(
  response: Response
): Promise<T> {
  const data = (await response
    .json()
    .catch(() => null)) as T | null;

  if (!response.ok || !data?.success) {
    throw new Error(
      data?.message ||
        `Request failed (${response.status}).`
    );
  }

  return data;
}

function statusText(
  status: string | null | undefined
) {
  return status
    ? status.replaceAll("_", " ")
    : "Not available";
}

function formatMoney(
  value: string | number,
  currency: string
) {
  const amount = Number(value);

  if (!Number.isFinite(amount)) {
    return "—";
  }

  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: currency || "PHP",
  }).format(amount);
}

const isPending = (status: string) =>
  status === "pending_verification" ||
  status === "refund_pending";

export default function Transactions() {
  const [view, setView] =
    useState<View>("history");

  const [tickets, setTickets] =
    useState<Ticket[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [search, setSearch] = useState("");

  const [busyId, setBusyId] =
    useState<number | null>(null);

  const [openId, setOpenId] =
    useState<number | null>(null);

  const [eventsById, setEventsById] = useState<
    Record<number, PaymentEvent[]>
  >({});

  const [eventsLoadingId, setEventsLoadingId] =
    useState<number | null>(null);

  const [eventsError, setEventsError] =
    useState("");

  const loadTickets = useCallback(
    async (signal?: AbortSignal) => {
      setLoading(true);
      setError("");

      try {
        const response = await fetch(
          `/api/transaction-tickets?view=${view}`,
          {
            credentials: "same-origin",
            cache: "no-store",
            signal,
          }
        );

        const data =
          await readJson<TicketResponse>(response);

        if (!signal?.aborted) {
          setTickets(data.tickets ?? []);
        }
      } catch (reason) {
        if (!signal?.aborted) {
          setError(
            reason instanceof Error
              ? reason.message
              : "Could not load transactions."
          );

          setTickets([]);
        }
      } finally {
        if (!signal?.aborted) {
          setLoading(false);
        }
      }
    },
    [view]
  );

  useEffect(() => {
    const controller = new AbortController();

    void loadTickets(controller.signal);

    return () => controller.abort();
  }, [loadTickets]);

  const visibleTickets = useMemo(() => {
    const term = search.trim().toLowerCase();

    if (!term) return tickets;

    return tickets.filter((ticket) =>
      [
        ticket.payment_id,
        ticket.booking_id,
        ticket.subject_name,
        ticket.tutor_name,
        ticket.payment_status,
        ticket.booking_status,
        ticket.receipt_number,
        ticket.payment_reference,
      ].some((value) =>
        String(value ?? "")
          .toLowerCase()
          .includes(term)
      )
    );
  }, [tickets, search]);

  function changeView(next: View) {
    if (next === view) return;

    setOpenId(null);
    setNotice("");
    setEventsError("");
    setView(next);
  }

  async function toggleTimeline(
    paymentId: number
  ) {
    if (openId === paymentId) {
      setOpenId(null);
      return;
    }

    setOpenId(paymentId);
    setEventsError("");

    if (
      Object.prototype.hasOwnProperty.call(
        eventsById,
        paymentId
      )
    ) {
      return;
    }

    setEventsLoadingId(paymentId);

    try {
      const response = await fetch(
        `/api/transaction-tickets/${paymentId}/events`,
        {
          credentials: "same-origin",
          cache: "no-store",
        }
      );

      const data =
        await readJson<EventResponse>(response);

      setEventsById((current) => ({
        ...current,
        [paymentId]: data.events ?? [],
      }));
    } catch (reason) {
      setEventsError(
        reason instanceof Error
          ? reason.message
          : "Could not load payment history."
      );
    } finally {
      setEventsLoadingId(null);
    }
  }

  async function changeArchive(ticket: Ticket) {
    if (isPending(ticket.payment_status)) {
      return;
    }

    const action =
      view === "history"
        ? "archive"
        : "restore";

    setBusyId(ticket.payment_id);
    setError("");
    setNotice("");

    try {
      await readJson<ApiResult>(
        await fetch(
          `/api/transaction-tickets/${ticket.payment_id}/archive`,
          {
            method: "PATCH",
            credentials: "same-origin",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ action }),
          }
        )
      );

      setTickets((current) =>
        current.filter(
          (row) =>
            row.payment_id !== ticket.payment_id
        )
      );

      if (openId === ticket.payment_id) {
        setOpenId(null);
      }

      setNotice(
        action === "archive"
          ? "Ticket moved to Archive."
          : "Ticket restored to History."
      );
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "Could not update the ticket."
      );
    } finally {
      setBusyId(null);
    }
  }

  async function savePdf(ticket: Ticket) {
    setBusyId(ticket.payment_id);
    setError("");
    setNotice("");

    try {
      const response = await fetch(
        `/api/transaction-tickets/${ticket.payment_id}/pdf`,
        {
          credentials: "same-origin",
          cache: "no-store",
        }
      );

      if (!response.ok) {
        const data = (await response
          .json()
          .catch(() => null)) as ApiResult | null;

        throw new Error(
          data?.message ||
            "Could not download the ticket."
        );
      }

      const contentType =
        response.headers.get("content-type") ?? "";

      if (!contentType.includes("application/pdf")) {
        throw new Error(
          "The server did not return a PDF."
        );
      }

      const url = URL.createObjectURL(
        await response.blob()
      );

      const anchor =
        document.createElement("a");

      anchor.href = url;
      anchor.download =
        `tutofriends-student-ticket-${ticket.payment_id}.pdf`;

      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();

      window.setTimeout(
        () => URL.revokeObjectURL(url),
        60_000
      );

      setNotice(
        "Your transaction PDF was downloaded."
      );
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "PDF download failed."
      );
    } finally {
      setBusyId(null);
    }
  }

  return (
    <main className="tf-tx">
      <header className="tf-tx-head">
        <div>
          <span className="tf-tx-eyebrow">
            TUTOfriends / Student
          </span>

          <h1>My Transactions</h1>

          <p>
            Review your booking payments,
            payment updates, and saved tickets.
          </p>
        </div>

        <div className="tf-tx-actions">
          <Link
            to="/bookings"
            className="tf-tx-quiet"
          >
            My Bookings
          </Link>

          <button
            type="button"
            className="tf-tx-quiet"
            disabled={loading}
            onClick={() => void loadTickets()}
          >
            Refresh
          </button>
        </div>
      </header>

      <div
        className="tf-tx-tabs"
        role="group"
        aria-label="Transaction folders"
      >
        <button
          type="button"
          className={
            view === "history" ? "selected" : ""
          }
          onClick={() => changeView("history")}
        >
          Transaction History
        </button>

        <button
          type="button"
          className={
            view === "archived" ? "selected" : ""
          }
          onClick={() => changeView("archived")}
        >
          Archive
        </button>
      </div>

      <p className="tf-tx-note">
        {view === "history"
          ? "Resolved tickets move to Archive after 30 days without activity. Pending reviews stay in History."
          : "Archived tickets expire after 30 days of inactivity. Original payment records are kept."}
      </p>

      <label className="tf-tx-search">
        <span>Search tickets</span>

        <input
          type="search"
          value={search}
          onChange={(event) =>
            setSearch(event.target.value)
          }
          placeholder="Search subject, tutor, booking, or reference"
        />
      </label>

      {error && (
        <p
          className="tf-tx-error"
          role="alert"
        >
          {error}
        </p>
      )}

      {notice && (
        <p
          className="tf-tx-success"
          role="status"
        >
          {notice}
        </p>
      )}

      {loading ? (
        <p
          className="tf-tx-empty"
          role="status"
        >
          Loading your transactions…
        </p>
      ) : visibleTickets.length === 0 ? (
        <p className="tf-tx-empty">
          {search
            ? "No matching transactions."
            : view === "archived"
              ? "Your archive is empty."
              : "No transaction history yet."}
        </p>
      ) : (
        <div className="tf-tx-list">
          {visibleTickets.map((ticket) => {
            const demo =
              ticket.payment_method?.startsWith(
                "demo_"
              ) ||
              ticket.receipt_number?.startsWith(
                "TF-DEMO-"
              );

            const pending = isPending(
              ticket.payment_status
            );

            const showingEvents =
              openId === ticket.payment_id;

            const events =
              eventsById[ticket.payment_id];

            return (
              <article
                className="tf-tx-ticket"
                key={ticket.payment_id}
              >
                <div className="tf-tx-ticket-top">
                  <div>
                    <strong>
                      {ticket.subject_name}
                    </strong>

                    <span>
                      Booking #{ticket.booking_id}
                      {" · "}
                      Ticket #{ticket.payment_id}
                    </span>
                  </div>

                  <span
                    className={
                      `tf-tx-status ${ticket.payment_status}`
                    }
                  >
                    {statusText(
                      ticket.payment_status
                    )}
                  </span>
                </div>

                <div className="tf-tx-grid">
                  <div>
                    <small>Student</small>
                    <span>{ticket.student_name || "You"}</span>
                  </div>

                  <div>
                    <small>Tutor</small>
                    <span>
                      {ticket.tutor_name}
                    </span>
                  </div>

                  <div>
                    <small>Session</small>
                    <span>
                      {ticket.session_date}
                      {" · "}
                      {ticket.start_time}
                      {"–"}
                      {ticket.end_time}
                    </span>
                  </div>

                  <div>
                    <small>Amount due</small>
                    <span>
                      {formatMoney(
                        ticket.amount_due,
                        ticket.currency
                      )}
                    </span>
                  </div>

                  <div>
                    <small>Amount paid</small>
                    <span>
                      {formatMoney(
                        ticket.amount_paid,
                        ticket.currency
                      )}
                    </span>
                  </div>

                  <div>
                    <small>Amount refunded</small>
                    <span>
                      {formatMoney(
                        ticket.amount_refunded,
                        ticket.currency
                      )}
                    </span>
                  </div>

                  <div>
                    <small>Booking status</small>
                    <span>
                      {statusText(
                        ticket.booking_status
                      )}
                    </span>
                  </div>

                  <div>
                    <small>Payment method</small>
                    <span>
                      {statusText(
                        ticket.payment_method
                      )}
                    </span>
                  </div>

                  <div>
                    <small>Last update (database time)</small>
                    <span>
                      {ticket.updated_at}
                    </span>
                  </div>
                </div>

                <p className="tf-tx-ref">
                  Reference:{" "}
                  {ticket.receipt_number ||
                    ticket.payment_reference ||
                    "Not assigned"}
                </p>

                {demo && (
                  <p className="tf-tx-demo">
                    DEMO ONLY — no real payment
                    was charged.
                  </p>
                )}

                {pending && (
                  <p className="tf-tx-note">
                    This payment is still being
                    reviewed. Archiving is unavailable
                    until the review is resolved.
                  </p>
                )}

                {view === "archived" &&
                  ticket.archived_at && (
                    <p className="tf-tx-ref">
                      Archived:{" "}
                      {ticket.archived_at}
                    </p>
                  )}

                <div className="tf-tx-actions">
                  <button
                    type="button"
                    className="tf-tx-quiet"
                    disabled={busyId !== null}
                    onClick={() =>
                      void toggleTimeline(
                        ticket.payment_id
                      )
                    }
                    aria-expanded={showingEvents}
                  >
                    {showingEvents
                      ? "Hide Status History"
                      : "View Status History"}
                  </button>

                  <button
                    type="button"
                    className="tf-tx-primary"
                    disabled={busyId !== null}
                    onClick={() =>
                      void savePdf(ticket)
                    }
                  >
                    {busyId === ticket.payment_id
                      ? "Processing…"
                      : "Save Ticket as PDF"}
                  </button>

                  <button
                    type="button"
                    className="tf-tx-quiet"
                    disabled={
                      busyId !== null || pending
                    }
                    title={
                      pending
                        ? "Pending payments cannot be archived"
                        : undefined
                    }
                    onClick={() =>
                      void changeArchive(ticket)
                    }
                  >
                    {view === "history"
                      ? "Move to Archive"
                      : "Restore to History"}
                  </button>
                </div>

                {showingEvents && (
                  <section
                    aria-label={
                      `Payment history for ticket ${ticket.payment_id}`
                    }
                  >
                    <h3>
                      Payment Status History
                    </h3>

                    {eventsLoadingId ===
                    ticket.payment_id ? (
                      <p role="status">
                        Loading status changes…
                      </p>
                    ) : eventsError && !events ? (
                      <p
                        className="tf-tx-error"
                        role="alert"
                      >
                        {eventsError}
                      </p>
                    ) : !events?.length ? (
                      <p className="tf-tx-note">
                        No status changes
                        recorded yet.
                      </p>
                    ) : (
                      <ol>
                        {events.map((event) => (
                          <li
                            key={
                              event.payment_history_id
                            }
                          >
                            <strong>
                              {statusText(
                                event.old_status
                              )}
                              {" → "}
                              {statusText(
                                event.new_status
                              )}
                            </strong>

                            <div>
                              {event.changed_at}
                            </div>

                            {event.remarks && (
                              <p>
                                {event.remarks}
                              </p>
                            )}
                          </li>
                        ))}
                      </ol>
                    )}
                  </section>
                )}
              </article>
            );
          })}
        </div>
      )}

      {!loading && tickets.length >= 200 && (
        <p className="tf-tx-note">
          Showing up to 200 recent tickets.
          Older tickets require server-side
          pagination.
        </p>
      )}
    </main>
  );
}
