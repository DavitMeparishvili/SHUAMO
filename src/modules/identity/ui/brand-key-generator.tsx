"use client";

import { useState } from "react";
import { Banner, Button, CopyField } from "@/src/modules/design-system";

export function BrandKeyGenerator({
  copy,
  prefix,
}: {
  prefix?: string | undefined;
  copy: {
    generate: string;
    generating: string;
    label: string;
    copy: string;
    copied: string;
    copyError: string;
    warningTitle: string;
    warningBody: string;
    requestError: string;
    prefixLabel: string;
    prefixHint: string;
    rotateWarning: string;
    confirm: string;
    cancel: string;
  };
}) {
  const [key, setKey] = useState<string>();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState(false);
  const [currentPrefix, setCurrentPrefix] = useState(prefix);
  const [confirming, setConfirming] = useState(false);

  async function generate() {
    setPending(true);
    setError(false);
    try {
      const response = await fetch("/api/brand/key", { method: "POST" });
      if (!response.ok) throw new Error("request failed");
      const data = (await response.json()) as {
        plaintext: string;
        prefix: string;
      };
      setKey(data.plaintext);
      setCurrentPrefix(data.prefix);
      setConfirming(false);
    } catch {
      setError(true);
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="grid gap-5">
      {currentPrefix ? (
        <div className="grid gap-2">
          <strong className="type-small">{copy.prefixLabel}</strong>
          <code className="break-all type-mono">{currentPrefix}</code>
          <p className="m-0 type-small text-slate-600">{copy.prefixHint}</p>
        </div>
      ) : null}
      <p className="m-0 type-small text-slate-600">{copy.rotateWarning}</p>
      {confirming ? (
        <div className="grid gap-3" role="group" aria-label={copy.confirm}>
          <Button
            onClick={generate}
            pending={pending}
            pendingLabel={copy.generating}
            type="button"
          >
            {copy.confirm}
          </Button>
          <Button
            onClick={() => setConfirming(false)}
            disabled={pending}
            variant="outline"
            type="button"
          >
            {copy.cancel}
          </Button>
        </div>
      ) : (
        <Button
          onClick={() => setConfirming(true)}
          pending={pending}
          pendingLabel={copy.generating}
          type="button"
        >
          {copy.generate}
        </Button>
      )}
      {error ? (
        <p className="m-0 type-small text-reversed" role="alert">
          {copy.requestError}
        </p>
      ) : null}
      {key !== undefined ? (
        <>
          <Banner
            tone="warning"
            title={copy.warningTitle}
            body={copy.warningBody}
          />
          <CopyField
            value={key}
            label={copy.label}
            copyLabel={copy.copy}
            copiedLabel={copy.copied}
            copyErrorLabel={copy.copyError}
            revealOnce
            oneTimeWarning={copy.warningBody}
          />
        </>
      ) : null}
    </div>
  );
}
