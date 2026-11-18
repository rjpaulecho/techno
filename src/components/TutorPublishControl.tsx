
import { useState } from "react";

type TutorPublishControlProps = {
  isListed: boolean;
  hasSubjects: boolean;
  hasAvailability: boolean;
  onChange: (isListed: boolean) => void;
};

type ListingResponse = {
  success: boolean;
  is_listed?: boolean;
  message?: string;
};

export default function TutorPublishControl({
  isListed,
  hasSubjects,
  hasAvailability,
  onChange,
}: TutorPublishControlProps) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const canPublish = hasSubjects && hasAvailability;

  async function toggleListing() {
    if (saving) return;

    const nextStatus = !isListed;

    if (nextStatus && !canPublish) {
      setError(
        "Before publishing, save at least one subject with an hourly rate and one weekly availability slot."
      );
      setMessage("");
      return;
    }

    setSaving(true);
    setError("");
    setMessage("");

    try {
      const response = await fetch(
        "/api/tutors/me/listing",
        {
          method: "PUT",
          credentials: "same-origin",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            is_listed: nextStatus,
          }),
        }
      );

      const data = (await response
        .json()
        .catch(() => null)) as ListingResponse | null;

      if (!response.ok || !data?.success) {
        throw new Error(
          data?.message ||
            `Unable to update profile (HTTP ${response.status}).`
        );
      }

      const updatedStatus =
        typeof data.is_listed === "boolean"
          ? data.is_listed
          : nextStatus;

      onChange(updatedStatus);

      setMessage(
        data.message ||
          (updatedStatus
            ? "Your profile is published."
            : "Your profile is unpublished.")
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Something went wrong. Please try again."
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      style={{
        marginTop: 20,
        padding: 16,
        border: "1px solid var(--border)",
        borderRadius: 12,
      }}
    >
      <div
        style={{
          fontWeight: 700,
          marginBottom: 8,
        }}
      >
        Tutor catalog visibility
      </div>

      <p
        style={{
          margin: "0 0 12px",
          color: "var(--text-secondary)",
          fontSize: 14,
          lineHeight: 1.6,
        }}
      >
        {isListed
          ? "Your profile is published. Students can find you in the tutor catalog when your profile meets the catalog requirements."
          : "Your profile is not published. Complete your setup before making it visible to students."}
      </p>

      {!isListed && (
        <div
          style={{
            marginBottom: 14,
            fontSize: 13,
            lineHeight: 1.8,
          }}
        >
          <div>
            {hasSubjects ? "✓" : "○"} Save at least one
            subject and hourly rate
          </div>
          <div>
            {hasAvailability ? "✓" : "○"} Save at least one
            weekly availability slot
          </div>
        </div>
      )}

      <button
        type="button"
        className="tutor-text-button"
        onClick={toggleListing}
        disabled={
          saving || (!isListed && !canPublish)
        }
      >
        {saving
          ? "Saving..."
          : isListed
            ? "Unpublish profile"
            : "Publish profile"}
      </button>

      {error && (
        <p
          role="alert"
          style={{
            color: "#dc2626",
            fontSize: 13,
            marginBottom: 0,
          }}
        >
          {error}
        </p>
      )}

      {message && (
        <p
          role="status"
          style={{
            color: "var(--text-primary)",
            fontSize: 13,
            marginBottom: 0,
          }}
        >
          {message}
        </p>
      )}
    </div>
  );
}
