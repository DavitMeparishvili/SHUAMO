import type { ReactNode } from "react";

const TONE_CLASS = {
  info: "bg-slate-50 text-slate-700 border-slate-300",
  warning: "bg-accrued-soft text-accrued border-accrued",
  danger: "bg-reversed-soft text-reversed border-reversed",
} as const;

function NoticeIcon() {
  return (
    <svg
      aria-hidden="true"
      className="mt-0.5 size-5 shrink-0"
      fill="none"
      viewBox="0 0 20 20"
    >
      <circle cx="10" cy="10" r="8" stroke="currentColor" strokeWidth="1.5" />
      <path
        d="M10 8v5M10 5.5v.5"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="1.5"
      />
    </svg>
  );
}

export function Banner({
  tone,
  title,
  body,
  action,
}: {
  tone: keyof typeof TONE_CLASS;
  title: string;
  body: string;
  action?: ReactNode;
}) {
  return (
    <section
      className={`flex gap-3 rounded-sm border p-4 ${TONE_CLASS[tone]}`}
      aria-label={title}
    >
      <NoticeIcon />
      <div className="min-w-0">
        <h3 className="m-0 type-small font-bold">{title}</h3>
        <p className="mb-0 mt-1 type-small">{body}</p>
        {action ? <div className="mt-3">{action}</div> : null}
      </div>
    </section>
  );
}
