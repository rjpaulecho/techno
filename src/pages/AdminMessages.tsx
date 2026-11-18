
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import "../css/adminMessages.css";

type MessageCategory =
  | "feedback"
  | "general"
  | "technical"
  | "other";

type ContactMessage = {
  message_id: number;
  user_id: number;
  sender_name: string;
  sender_email: string;
  sender_role: string;
  category: MessageCategory;
  subject: string;
  message: string;
  is_read: number | boolean;
  created_at: string;
};

type InboxResponse = {
  success: boolean;
  message?: string;
  messages?: ContactMessage[];
  unread_count?: number;
};

type ReadResponse = {
  success: boolean;
  message?: string;
};

type FilterType = "all" | "unread" | "read";

function formatDate(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("en-PH", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Manila",
  }).format(date);
}

function isRead(message: ContactMessage) {
  return Number(message.is_read) === 1;
}

function categoryLabel(category: MessageCategory) {
  switch (category) {
    case "feedback":
      return "Feedback";
    case "technical":
      return "Technical Issue";
    case "other":
      return "Other";
    default:
      return "General Inquiry";
  }
}

function getError(error: unknown) {
  return error instanceof Error
    ? error.message
    : "Something went wrong.";
}

export default function AdminMessages() {
  const [messages, setMessages] = useState<ContactMessage[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);

  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<FilterType>("all");

  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  // ========================================
  // LOAD INBOX
  // ========================================

  const loadMessages = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/contact-messages", {
        credentials: "same-origin",
        cache: "no-store",
      });

      const data = (await response.json()) as InboxResponse;

      if (
        !response.ok ||
        !data.success ||
        !Array.isArray(data.messages)
      ) {
        throw new Error(
          data.message ||
            `Unable to load messages (HTTP ${response.status}).`
        );
      }

      setMessages(data.messages);

      setSelectedId((current) =>
        data.messages!.some((item) => item.message_id === current)
          ? current
          : data.messages![0]?.message_id ?? null
      );
    } catch (cause) {
      setError(getError(cause));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadMessages();
  }, [loadMessages]);

  // ========================================
  // FILTER AND SEARCH
  // ========================================

  const filteredMessages = useMemo(() => {
    const query = search.trim().toLowerCase();

    return messages.filter((item) => {
      const matchesFilter =
        filter === "all" ||
        (filter === "unread" && !isRead(item)) ||
        (filter === "read" && isRead(item));

      const matchesSearch =
        !query ||
        [
          item.sender_name,
          item.sender_email,
          item.subject,
          item.message,
          categoryLabel(item.category),
        ]
          .join(" ")
          .toLowerCase()
          .includes(query);

      return matchesFilter && matchesSearch;
    });
  }, [messages, search, filter]);

  const selectedMessage =
    messages.find((item) => item.message_id === selectedId) ?? null;

  const unreadCount = messages.filter((item) => !isRead(item)).length;
  const readCount = messages.length - unreadCount;

  // ========================================
  // MARK READ / UNREAD
  // ========================================

  async function toggleReadStatus(item: ContactMessage) {
    if (updating) return;

    setUpdating(true);
    setError("");
    setNotice("");

    const nextReadStatus = !isRead(item);

    try {
      const response = await fetch(
        `/api/contact-messages/${item.message_id}/read`,
        {
          method: "PATCH",
          credentials: "same-origin",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            is_read: nextReadStatus,
          }),
        }
      );

      const data = (await response.json()) as ReadResponse;

      if (!response.ok || !data.success) {
        throw new Error(
          data.message || "Unable to update message status."
        );
      }

      setMessages((current) =>
        current.map((message) =>
          message.message_id === item.message_id
            ? {
                ...message,
                is_read: nextReadStatus ? 1 : 0,
              }
            : message
        )
      );

      setNotice(
        nextReadStatus
          ? "Message marked as read."
          : "Message marked as unread."
      );
    } catch (cause) {
      setError(getError(cause));
    } finally {
      setUpdating(false);
    }
  }

  // ========================================
  // RENDER
  // ========================================

  return (
    <div className="am-page">
      {/* HEADER */}

      <header className="am-header">
        <div>
          <span className="am-eyebrow">ADMINISTRATION</span>
          <h1>Messages</h1>
          <p>
            Manage feedback, questions, and messages submitted
            by TutoFriends users.
          </p>
        </div>

        <button
          type="button"
          className="am-refresh"
          onClick={() => void loadMessages()}
          disabled={loading}
        >
          <span aria-hidden="true">↻</span>
          {loading ? "Loading..." : "Refresh"}
        </button>
      </header>

      {/* NOTIFICATIONS */}

      {error && (
        <div className="am-alert am-alert-error" role="alert">
          {error}
        </div>
      )}

      {notice && (
        <div className="am-alert am-alert-success" role="status">
          {notice}
        </div>
      )}

      {/* STATISTICS */}

      <section className="am-stats">
        <div className="am-stat">
          <span className="am-stat-icon">✉</span>
          <div>
            <span>Total Messages</span>
            <strong>{messages.length}</strong>
          </div>
        </div>

        <div className="am-stat">
          <span className="am-stat-icon am-stat-blue">●</span>
          <div>
            <span>Unread Messages</span>
            <strong>{unreadCount}</strong>
          </div>
        </div>

        <div className="am-stat">
          <span className="am-stat-icon">✓</span>
          <div>
            <span>Read Messages</span>
            <strong>{readCount}</strong>
          </div>
        </div>
      </section>

      {/* INBOX */}

      <section className="am-inbox">
        {/* LEFT: MESSAGE LIST */}

        <div className="am-list-panel">
          <div className="am-list-heading">
            <div>
              <h2>Inbox</h2>
              <span>{filteredMessages.length} messages</span>
            </div>
          </div>

          <div className="am-search">
            <span aria-hidden="true">⌕</span>
            <input
              type="search"
              placeholder="Search messages..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>

          <div className="am-filters">
            {(
              [
                ["all", "All"],
                ["unread", "Unread"],
                ["read", "Read"],
              ] as const
            ).map(([value, label]) => (
              <button
                key={value}
                type="button"
                className={filter === value ? "active" : ""}
                onClick={() => setFilter(value)}
              >
                {label}
                {value === "unread" && unreadCount > 0 && (
                  <span>{unreadCount}</span>
                )}
              </button>
            ))}
          </div>

          <div className="am-message-list">
            {loading ? (
              <div className="am-empty">
                Loading messages...
              </div>
            ) : filteredMessages.length === 0 ? (
              <div className="am-empty">
                <span>✉</span>
                <strong>No messages found</strong>
                <p>
                  Messages submitted through the Contact page
                  will appear here.
                </p>
              </div>
            ) : (
              filteredMessages.map((item) => (
                <button
                  key={item.message_id}
                  type="button"
                  className={`am-message-item ${
                    selectedId === item.message_id ? "selected" : ""
                  } ${!isRead(item) ? "unread" : ""}`}
                  onClick={() => {
                    setSelectedId(item.message_id);
                    setNotice("");
                  }}
                >
                  <div className="am-message-item-top">
                    <strong>{item.sender_name}</strong>
                    {!isRead(item) && (
                      <span className="am-unread-dot" />
                    )}
                  </div>

                  <span className="am-message-subject">
                    {item.subject}
                  </span>

                  <span className="am-message-preview">
                    {item.message}
                  </span>

                  <div className="am-message-item-bottom">
                    <span>{categoryLabel(item.category)}</span>
                    <time>{formatDate(item.created_at)}</time>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        {/* RIGHT: MESSAGE DETAILS */}

        <div className="am-detail-panel">
          {!selectedMessage ? (
            <div className="am-detail-empty">
              <span>✉</span>
              <h2>Select a message</h2>
              <p>
                Choose a message from your inbox to read its full contents.
              </p>
            </div>
          ) : (
            <article className="am-detail">
              <div className="am-detail-top">
                <span className="am-detail-label">
                  MESSAGE DETAILS
                </span>

                <span
                  className={`am-status ${
                    isRead(selectedMessage) ? "read" : "unread"
                  }`}
                >
                  {isRead(selectedMessage) ? "Read" : "Unread"}
                </span>
              </div>

              <h2>{selectedMessage.subject}</h2>

              <span className="am-category">
                {categoryLabel(selectedMessage.category)}
              </span>

              <div className="am-sender">
                <div className="am-sender-avatar">
                  {selectedMessage.sender_name
                    .charAt(0)
                    .toUpperCase()}
                </div>

                <div>
                  <strong>{selectedMessage.sender_name}</strong>
                  <a href={`mailto:${selectedMessage.sender_email}`}>
                    {selectedMessage.sender_email}
                  </a>
                  <span>
                    {selectedMessage.sender_role} · User ID:{" "}
                    {selectedMessage.user_id}
                  </span>
                </div>
              </div>

              <div className="am-date">
                Received {formatDate(selectedMessage.created_at)}
              </div>

              <div className="am-message-content">
                <span>MESSAGE</span>
                <p>{selectedMessage.message}</p>
              </div>

              <div className="am-detail-actions">
                <button
                  type="button"
                  className={`am-read-button ${
                isRead(selectedMessage) ? "am-mark-unread" : "am-mark-read"
                }`}
                  disabled={updating}
                  onClick={() =>
                    void toggleReadStatus(selectedMessage)
                  }
                >
                  {updating
                    ? "Updating..."
                    : isRead(selectedMessage)
                      ? "Mark as Unread"
                      : "Mark as Read"}
                </button>

                <a
                  className="am-reply-button"
                  href={`mailto:${encodeURIComponent(
                    selectedMessage.sender_email
                  )}?subject=${encodeURIComponent(
                    `Re: ${selectedMessage.subject}`
                  )}`}
                >
                  Reply by Email ↗
                </a>
              </div>
            </article>
          )}
        </div>
      </section>
    </div>
  );
}
