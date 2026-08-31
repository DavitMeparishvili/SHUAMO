import type { ButtonHTMLAttributes, ReactNode } from "react";

const VARIANT = {
  signal:
    "bg-signal text-paper shadow-xs hover:bg-signal-hover active:bg-signal-active",
  outline:
    "border border-slate-300 bg-paper text-ink hover:border-ink active:bg-slate-50",
  ghost: "bg-transparent text-slate-700 hover:bg-slate-100 active:bg-slate-100",
  danger:
    "bg-reversed text-paper hover:bg-reversed-hover active:bg-reversed-active",
} as const;

export function Button({
  variant = "signal",
  size = "md",
  pending = false,
  pendingLabel,
  className,
  children,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: keyof typeof VARIANT;
  size?: "sm" | "md";
  pending?: boolean;
  pendingLabel?: string;
  children: ReactNode;
}) {
  return (
    <button
      {...rest}
      disabled={pending || rest.disabled}
      aria-busy={pending || undefined}
      className={[
        "inline-flex min-h-[44px] items-center justify-center gap-2 rounded-pill type-small",
        "cursor-pointer transition-[background-color,border-color] duration-150",
        "disabled:cursor-not-allowed disabled:opacity-60",
        size === "sm" ? "px-4" : "px-5",
        VARIANT[variant],
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <span>{children}</span>
      {pending && pendingLabel ? (
        <span className="type-caption opacity-80">{pendingLabel}</span>
      ) : null}
    </button>
  );
}
