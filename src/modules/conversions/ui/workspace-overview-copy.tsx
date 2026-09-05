"use client";
import { useState } from "react";
import { Icon } from "@/src/modules/design-system";
import type { Locale } from "@/src/modules/localization";
export function DashboardCopy({
  url,
  locale,
}: {
  url: string;
  locale: Locale;
}) {
  const [state, setState] = useState<"idle" | "copied" | "error">("idle");
  const ka = locale === "ka";
  return (
    <>
      <button
        className="x-button outline"
        type="button"
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(url);
            setState("copied");
          } catch {
            setState("error");
          }
        }}
      >
        <Icon name="link" width="17" />
        {state === "copied"
          ? ka
            ? "დაკოპირებულია"
            : "Copied!"
          : ka
            ? "ბმულის კოპირება"
            : "Copy link"}
      </button>
      <span
        className={state === "error" ? "registration-note" : "sr-only"}
        role="status"
      >
        {state === "copied"
          ? ka
            ? "ბმული დაკოპირებულია"
            : "Link copied"
          : state === "error"
            ? ka
              ? "კოპირება ვერ მოხერხდა. გახსენი ბმულების გვერდი და დააკოპირე ხელით."
              : "Copy failed. Open Tracking links to copy the address manually."
            : ""}
      </span>
    </>
  );
}
