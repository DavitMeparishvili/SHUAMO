"use client";

import { useRef, type ReactNode } from "react";

export function MobileFilterSheet({
  label,
  closeLabel,
  activeCount,
  children,
}: {
  label: string;
  closeLabel: string;
  activeCount: number;
  children: ReactNode;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  return (
    <div className="sm:hidden">
      <button
        className="inline-flex min-h-11 items-center gap-2 rounded-pill border border-slate-300 bg-paper px-4 type-small font-semibold text-ink"
        onClick={() => dialogRef.current?.showModal()}
        type="button"
      >
        <svg
          aria-hidden="true"
          className="size-4"
          fill="none"
          viewBox="0 0 24 24"
        >
          <path
            d="M4 7h16M7 12h10M10 17h4"
            stroke="currentColor"
            strokeLinecap="round"
            strokeWidth="1.7"
          />
        </svg>
        {label}
        {activeCount > 0 ? (
          <span className="grid min-w-5 place-items-center rounded-pill bg-signal px-1 text-paper">
            {activeCount}
          </span>
        ) : null}
      </button>
      <dialog
        aria-label={label}
        className="fixed inset-x-0 bottom-0 top-auto m-0 max-h-[88dvh] w-full max-w-none overflow-y-auto rounded-t-lg border-0 bg-paper p-0 text-ink shadow-md backdrop:bg-ink/40"
        ref={dialogRef}
      >
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-paper px-4 py-4">
          <h2 className="m-0 type-h3">{label}</h2>
          <button
            className="min-h-11 rounded-pill px-4 type-small font-semibold hover:bg-slate-100"
            onClick={() => dialogRef.current?.close()}
            type="button"
          >
            {closeLabel}
          </button>
        </div>
        <div className="p-4">{children}</div>
      </dialog>
    </div>
  );
}
