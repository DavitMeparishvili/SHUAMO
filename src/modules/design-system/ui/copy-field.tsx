"use client";

import { useState } from "react";
import { Button } from "./button";

export function CopyField({
  value,
  label,
  revealOnce = false,
  copyLabel = "Copy",
  copiedLabel = "Copied",
  oneTimeWarning = "This is the only time this value will be shown.",
}: {
  value: string;
  label: string;
  revealOnce?: boolean;
  copyLabel?: string;
  copiedLabel?: string;
  oneTimeWarning?: string;
}) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    await navigator.clipboard.writeText(value);
    setCopied(true);
  }

  return (
    <div className="grid gap-2">
      <span className="type-small font-semibold text-ink">{label}</span>
      <div className="flex flex-col gap-2 rounded-sm bg-slate-50 p-2 sm:flex-row sm:items-center">
        <code className="min-w-0 flex-1 break-all px-2 type-mono text-ink">
          {value}
        </code>
        <Button onClick={copy} size="sm" type="button" variant="outline">
          {copied ? copiedLabel : copyLabel}
        </Button>
      </div>
      {revealOnce ? (
        <p className="m-0 type-caption text-reversed">{oneTimeWarning}</p>
      ) : null}
    </div>
  );
}
