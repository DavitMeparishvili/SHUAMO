import type { ReactNode } from "react";

export function AuthCard({
  title,
  intro,
  children,
  footer,
}: {
  title: string;
  intro: string;
  children: ReactNode;
  footer: ReactNode;
}) {
  return (
    <div className="mx-auto grid min-h-[calc(100vh-14rem)] max-w-[var(--layout-column)] place-items-center px-[var(--layout-gutter)] py-16 max-[639px]:px-[var(--layout-gutter-sm)]">
      <section
        className="w-full max-w-md rounded-md border border-slate-200 bg-paper p-8 shadow-sm max-[639px]:p-6"
        aria-labelledby="auth-title"
      >
        <h1 className="m-0 type-h1 text-ink" id="auth-title">
          {title}
        </h1>
        <p className="mb-8 mt-3 text-slate-600">{intro}</p>
        {children}
        <p className="mb-0 mt-6 border-t border-slate-200 pt-5 type-small text-slate-600">
          {footer}
        </p>
      </section>
    </div>
  );
}
