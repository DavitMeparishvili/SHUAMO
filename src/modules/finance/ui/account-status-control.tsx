"use client";

import { useRef, useState, useTransition } from "react";
import type { AccountStatusCopy } from "./account-status-copy";

type AccountStatus = "PENDING" | "APPROVED" | "SUSPENDED";

export function AccountStatusControl({
  kind,
  id,
  name,
  initialStatus,
  copy,
  expanded = false,
}: {
  kind: "brand" | "creator";
  id: string;
  name: string;
  initialStatus: AccountStatus;
  copy: AccountStatusCopy;
  expanded?: boolean;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [status, setStatus] = useState(initialStatus);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();
  const active = status === "APPROVED";
  const statusLabel =
    status === "APPROVED"
      ? copy.active
      : status === "PENDING"
        ? copy.pending
        : copy.deactivated;
  const actionLabel = active
    ? copy.deactivate
    : status === "SUSPENDED"
      ? copy.reactivate
      : copy.approve;
  const actionAriaLabel = (
    active
      ? copy.deactivateAria
      : status === "SUSPENDED"
        ? copy.reactivateAria
        : copy.approveAria
  ).replace("{name}", name);

  function update(nextStatus: "APPROVED" | "SUSPENDED") {
    setError("");
    setMessage("");
    startTransition(async () => {
      try {
        const response = await fetch(
          `/api/admin/accounts/${kind}/${id}/status`,
          {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ status: nextStatus }),
          },
        );
        if (!response.ok) throw new Error(String(response.status));
        setStatus(nextStatus);
        dialogRef.current?.close();
        setMessage(
          nextStatus === "APPROVED"
            ? status === "SUSPENDED"
              ? copy.reactivated
              : copy.approved
            : copy.deactivatedSuccess,
        );
      } catch {
        setError(copy.error);
      }
    });
  }

  return (
    <div
      className={`finance-account-control${expanded ? " is-expanded" : ""}`}
      data-status={status.toLowerCase()}
    >
      <span className="finance-account-status">
        <span aria-hidden="true" />
        {statusLabel}
      </span>
      <div className="finance-account-actions">
        <button
          className={`finance-button ${active ? "finance-danger-outline" : "finance-primary"}`}
          type="button"
          disabled={pending}
          aria-busy={pending || undefined}
          aria-label={actionAriaLabel}
          onClick={() => {
            if (active) {
              setMessage("");
              setError("");
              dialogRef.current?.showModal();
            } else update("APPROVED");
          }}
        >
          {pending ? copy.saving : actionLabel}
        </button>
      </div>
      <dialog
        ref={dialogRef}
        className="finance-deactivation-dialog"
        aria-labelledby={`deactivate-title-${id}`}
        onCancel={() => dialogRef.current?.close()}
      >
        <div>
          <h2 id={`deactivate-title-${id}`}>
            {copy.dialogTitle.replace("{name}", name)}
          </h2>
          <p>{copy.dialogBody.replace("{name}", name)}</p>
          <div className="finance-dialog-actions">
            <button
              type="button"
              className="finance-button"
              disabled={pending}
              onClick={() => dialogRef.current?.close()}
            >
              {copy.cancel}
            </button>
            <button
              type="button"
              className="finance-button finance-danger"
              disabled={pending}
              onClick={() => update("SUSPENDED")}
            >
              {pending ? copy.saving : copy.confirmDeactivation}
            </button>
          </div>
        </div>
      </dialog>
      {error || message ? (
        <span
          className={`finance-account-feedback${error ? " is-error" : ""}`}
          aria-live="polite"
        >
          {error || message}
        </span>
      ) : null}
    </div>
  );
}
