"use client";

import { useSyncExternalStore, useState } from "react";
import { Icon } from "@/src/modules/design-system";

const changedEvent = "xurjin-saved-products";
function subscribe(callback: () => void) {
  window.addEventListener("storage", callback);
  window.addEventListener(changedEvent, callback);
  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener(changedEvent, callback);
  };
}

export function SaveProductButton({
  id,
  scope,
  saveLabel,
  unsaveLabel,
}: {
  id: string;
  scope: string;
  saveLabel: string;
  unsaveLabel: string;
}) {
  const key = `xurjin:saved-product:${scope}:${id}`;
  const [temporary, setTemporary] = useState(false);
  const saved =
    useSyncExternalStore(
      subscribe,
      () => {
        try {
          return localStorage.getItem(key) === "1";
        } catch {
          return false;
        }
      },
      () => false,
    ) || temporary;
  return (
    <button
      className="discovery-save"
      type="button"
      aria-label={saved ? unsaveLabel : saveLabel}
      title={saved ? unsaveLabel : saveLabel}
      aria-pressed={saved}
      onClick={() => {
        try {
          if (saved) localStorage.removeItem(key);
          else localStorage.setItem(key, "1");
          window.dispatchEvent(new Event(changedEvent));
          setTemporary(false);
        } catch {
          setTemporary(!saved);
        }
      }}
    >
      <svg
        width="21"
        height="21"
        viewBox="0 0 24 24"
        fill={saved ? "currentColor" : "none"}
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8Z" />
      </svg>
    </button>
  );
}

export function CopyOfferLink({
  url,
  label,
  copiedLabel,
  errorLabel,
}: {
  url: string;
  label: string;
  copiedLabel: string;
  errorLabel: string;
}) {
  const [status, setStatus] = useState<"idle" | "copied" | "error">("idle");
  return (
    <div className="discovery-copy-wrap">
      <button
        className="discovery-copy"
        type="button"
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(url);
            setStatus("copied");
          } catch {
            setStatus("error");
          }
        }}
      >
        <span>{status === "copied" ? copiedLabel : label}</span>
        <Icon name={status === "copied" ? "check" : "link"} />
      </button>
      <span
        className={status === "error" ? "discovery-copy-error" : "sr-only"}
        role="status"
      >
        {status === "copied"
          ? copiedLabel
          : status === "error"
            ? errorLabel
            : ""}
      </span>
      {status === "error" ? (
        <input
          aria-label={label}
          value={url}
          readOnly
          onFocus={(event) => event.currentTarget.select()}
        />
      ) : null}
    </div>
  );
}
