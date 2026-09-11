"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/src/modules/design-system";
import type { IntegrationCopy } from "./integration-copy";
import { examplePayload } from "./integration-examples";
import { integrationStyles as styles } from "./integration-styles";

export function CodeExample({
  examples,
  copy,
  label,
}: {
  examples: { label: string; code: string }[];
  copy: Pick<IntegrationCopy, "copy" | "copied" | "copyError">;
  label: string;
}) {
  const [selected, setSelected] = useState(0);
  const [status, setStatus] = useState("");
  const example = examples[selected]!;
  async function copyCode() {
    try {
      await navigator.clipboard.writeText(example.code);
      setStatus(copy.copied);
    } catch {
      setStatus(copy.copyError);
    }
  }
  return (
    <div className={styles.codeBlock}>
      <div className={styles.codeToolbar}>
        <div role="group" aria-label={label} className={styles.languages}>
          {examples.length > 1 ? (
            examples.map((item, index) => (
              <button
                key={item.label}
                type="button"
                aria-pressed={selected === index}
                onClick={() => {
                  setSelected(index);
                  setStatus("");
                }}
              >
                {item.label}
              </button>
            ))
          ) : (
            <span>{example.label}</span>
          )}
        </div>
        <button type="button" onClick={copyCode}>
          {copy.copy}
        </button>
      </div>
      <pre tabIndex={0} aria-label={example.label}>
        <code>{example.code}</code>
      </pre>
      <div className={styles.copyStatus} role="status">
        {status}
      </div>
    </div>
  );
}

export function IntegrationValidator({
  initialPayload,
  copy,
}: {
  initialPayload: string;
  copy: Pick<
    IntegrationCopy,
    | "payload"
    | "validate"
    | "validating"
    | "freshExample"
    | "validationError"
    | "result"
    | "requestId"
    | "previewAmount"
    | "outcomes"
  >;
}) {
  const router = useRouter();
  const [payload, setPayload] = useState(initialPayload);
  const [pending, setPending] = useState(false);
  const [result, setResult] = useState<{
    outcome: string;
    issues?: string[];
    commissionAmount?: string;
    requestId?: string | undefined;
  }>();
  const [error, setError] = useState(false);

  async function validate(event: React.FormEvent) {
    event.preventDefault();
    setPending(true);
    setError(false);
    setResult(undefined);
    try {
      const response = await fetch("/api/brand/integration/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: payload,
      });
      const data = await response.json();
      const outcome = data.outcome ?? data.error;
      if (typeof outcome !== "string" || !copy.outcomes[outcome])
        throw new Error("unexpected response");
      setResult({
        outcome,
        issues: data.issues,
        commissionAmount: data.commissionAmount,
        requestId: response.headers.get("X-Request-Id") ?? undefined,
      });
      router.refresh();
    } catch {
      setError(true);
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={validate} className={styles.validator}>
      <label htmlFor="conversion-payload">{copy.payload}</label>
      <textarea
        id="conversion-payload"
        spellCheck={false}
        autoCapitalize="off"
        autoComplete="off"
        value={payload}
        onChange={(event) => setPayload(event.target.value)}
        rows={16}
        disabled={pending}
      />
      <div className={styles.actions}>
        <Button type="submit" pending={pending} pendingLabel={copy.validating}>
          {copy.validate}
        </Button>
        <Button
          type="button"
          variant="outline"
          disabled={pending}
          onClick={() => {
            setPayload(examplePayload());
            setResult(undefined);
            setError(false);
          }}
        >
          {copy.freshExample}
        </Button>
      </div>
      {error ? <p role="alert">{copy.validationError}</p> : null}
      <div role="status" aria-live="polite">
        {result ? (
          <div className={styles.result}>
            <h3>{copy.result}</h3>
            <p>{copy.outcomes[result.outcome]}</p>
            {result.commissionAmount !== undefined ? (
              <p>
                {copy.previewAmount}: <strong>{result.commissionAmount}</strong>
              </p>
            ) : null}
            {result.issues?.length ? (
              <ul>
                {result.issues.map((issue, index) => (
                  <li key={`${issue}-${index}`}>
                    <code>{issue}</code>
                  </li>
                ))}
              </ul>
            ) : null}
            {result.requestId ? (
              <p>
                {copy.requestId}: <code>{result.requestId}</code>
              </p>
            ) : null}
          </div>
        ) : null}
      </div>
    </form>
  );
}

export function RefreshRequests({ label }: { label: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  return (
    <Button
      type="button"
      variant="outline"
      pending={pending}
      onClick={() => startTransition(() => router.refresh())}
    >
      {label}
    </Button>
  );
}
