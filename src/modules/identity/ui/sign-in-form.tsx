"use client";

import { useState, type FormEvent } from "react";
import { Button, Field } from "@/src/modules/design-system";
import type { Locale } from "@/src/modules/localization";

export interface AuthFormCopy {
  email: string;
  password: string;
  name: string;
  submit: string;
  pending: string;
  errorTitle: string;
  errorBody: string;
}

export function SignInForm({
  locale,
  mode,
  returnTo,
  copy,
}: {
  locale: Locale;
  mode: "sign-in" | "sign-up";
  returnTo?: string | undefined;
  copy: AuthFormCopy;
}) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(false);
    const form = new FormData(event.currentTarget);
    const payload = {
      email: String(form.get("email") ?? ""),
      password: String(form.get("password") ?? ""),
      ...(mode === "sign-up"
        ? { name: String(form.get("name") ?? ""), locale }
        : {}),
    };
    try {
      const response = await fetch(
        `/api/auth/${mode === "sign-in" ? "sign-in" : "sign-up"}/email`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      );
      if (!response.ok) {
        setError(true);
        return;
      }
      window.location.assign(returnTo ?? `/${locale}/workspace`);
    } catch {
      setError(true);
    } finally {
      setPending(false);
    }
  }

  return (
    <form className="grid gap-5" onSubmit={submit} noValidate={false}>
      {error ? (
        <div
          className="rounded-sm border border-reversed bg-reversed-soft p-4 text-reversed"
          role="alert"
          tabIndex={-1}
        >
          <h2 className="m-0 type-small font-bold">{copy.errorTitle}</h2>
          <p className="mb-0 mt-1 type-small">{copy.errorBody}</p>
          <p className="mb-0 mt-2 type-caption">
            <a href="#email">{copy.email}</a> ·{" "}
            <a href="#password">{copy.password}</a>
          </p>
        </div>
      ) : null}
      {mode === "sign-up" ? (
        <Field
          id="name"
          name="name"
          label={copy.name}
          autoComplete="name"
          required
        />
      ) : null}
      <Field
        id="email"
        name="email"
        label={copy.email}
        type="email"
        autoComplete="email"
        required
      />
      <Field
        id="password"
        name="password"
        label={copy.password}
        type="password"
        autoComplete={mode === "sign-in" ? "current-password" : "new-password"}
        minLength={8}
        required
      />
      <Button pending={pending} pendingLabel={copy.pending} type="submit">
        {copy.submit}
      </Button>
    </form>
  );
}
