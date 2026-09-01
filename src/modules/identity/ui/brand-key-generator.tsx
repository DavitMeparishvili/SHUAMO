"use client";

import { useState } from "react";
import { Banner, Button, CopyField } from "@/src/modules/design-system";

export function BrandKeyGenerator({
  copy,
}: {
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
  };
}) {
  const [key, setKey] = useState<string>();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState(false);

  async function generate() {
    setPending(true);
    setError(false);
    try {
      const response = await fetch("/api/brand/key", { method: "POST" });
      if (!response.ok) throw new Error("request failed");
      const data = (await response.json()) as { plaintext: string };
      setKey(data.plaintext);
    } catch {
      setError(true);
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="grid gap-5">
      <Button
        onClick={generate}
        pending={pending}
        pendingLabel={copy.generating}
        type="button"
      >
        {copy.generate}
      </Button>
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
