import type { ReactNode } from "react";

export function WorkspaceShell({
  name,
  title,
  intro,
  contentVariant = "panel",
  showName = true,
  children,
}: {
  name: string;
  title: string;
  intro: string;
  contentVariant?: "panel" | "plain";
  showName?: boolean;
  children: ReactNode;
}) {
  return (
    <div className="mx-auto grid max-w-[var(--layout-column)] gap-10 px-[var(--layout-gutter)] py-12 max-[1179px]:px-[var(--layout-gutter-md)] max-[639px]:px-[var(--layout-gutter-sm)]">
      <header className="max-w-[70ch]">
        {showName ? (
          <p className="mb-2 mt-0 type-small font-semibold text-signal">
            {name}
          </p>
        ) : null}
        <h1 className="m-0 type-h1 text-ink">{title}</h1>
        <p className="mb-0 mt-3 text-slate-600">{intro}</p>
      </header>
      <section
        className={
          contentVariant === "panel"
            ? "rounded-md border border-slate-200 bg-slate-50 px-6 py-8 max-[639px]:px-4"
            : undefined
        }
      >
        {children}
      </section>
    </div>
  );
}
