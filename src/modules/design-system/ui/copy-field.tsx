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
    <div className="grid gap-2">
      <span className="type-small font-semibold text-ink">{label}</span>
      <div className="flex flex-col gap-2 rounded-sm bg-slate-50 p-2 sm:flex-row sm:items-center">
        <code className="min-w-0 flex-1 break-all px-2 type-mono text-ink">
          {value}
        </code>
        <Button
          onClick={copy}
          pending={state === "copying"}
          size="sm"
          type="button"
          variant="outline"
        >
          {copyLabel}
        </Button>
      </div>
      <p
        className={`m-0 min-h-[1.4em] type-caption ${state === "error" ? "text-reversed" : "text-settled"}`}
        role="status"
        aria-live="polite"
      >
        {statusMessage}
      </p>
      {revealOnce ? (
        <p className="m-0 type-caption text-reversed">{oneTimeWarning}</p>
      ) : null}
    </div>
  );
}
