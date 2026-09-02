"use client";

import { useState } from "react";
import { Button } from "./button";

type CopyState = "idle" | "copying" | "success" | "error";

type CopyFieldProps = {
  value: string;
  label: string;
  copyLabel: string;
  copiedLabel: string;
  copyErrorLabel: string;
  compact?: boolean;
  truncateValue?: boolean;
} & (
  | { revealOnce: true; oneTimeWarning: string }
  | { revealOnce?: false; oneTimeWarning?: never }
);

export function CopyField({
  value,
  label,
  revealOnce,
  copyLabel,
  copiedLabel,
  copyErrorLabel,
  compact = false,
  truncateValue = false,
  oneTimeWarning,
}: CopyFieldProps) {
  const [state, setState] = useState<CopyState>("idle");

  async function copy() {
    setState("copying");
    try {
      await navigator.clipboard.writeText(value);
      setState("success");
    } catch {
      setState("error");
    }
  }

  const statusMessage =
    state === "success" ? copiedLabel : state === "error" ? copyErrorLabel : "";

  return (
    <div
      className={`min-w-0 ${compact ? "grid w-full max-w-full gap-1.5 overflow-hidden" : "grid gap-2"}`}
    >
      <span
        className={`${compact ? "type-caption" : "type-small"} font-semibold text-ink`}
      >
        {label}
      </span>
      <div
        className={
          compact
            ? "flex w-full min-w-0 max-w-full items-center gap-2 rounded-sm bg-slate-50 p-1.5 pl-3"
            : "flex flex-col gap-2 rounded-sm bg-slate-50 p-2 sm:flex-row sm:items-center"
        }
      >
        <code
          className={`min-w-0 type-mono text-ink ${compact ? "block w-0 flex-1 truncate" : `flex-1 px-2 ${truncateValue ? "basis-0 truncate" : "break-all"}`}`}
          title={truncateValue ? value : undefined}
        >
          {value}
        </code>
        <Button
          onClick={copy}
          pending={state === "copying"}
          size="sm"
          type="button"
          variant="outline"
          className="shrink-0"
        >
          {copyLabel}
        </Button>
      </div>
      {compact && !statusMessage ? (
        <span className="sr-only" role="status" aria-live="polite" />
      ) : (
        <p
          className={`m-0 ${compact ? "" : "min-h-[1.4em]"} type-caption ${state === "error" ? "text-reversed" : "text-settled"}`}
          role="status"
          aria-live="polite"
        >
          {statusMessage}
        </p>
      )}
      {revealOnce ? (
        <p className="m-0 type-caption text-reversed">{oneTimeWarning}</p>
      ) : null}
    </div>
  );
}
