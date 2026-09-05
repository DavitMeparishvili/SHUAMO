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
    <div className="workspace-content">
      <header className="workspace-heading">
        {showName ? (
          <p className="mb-2 mt-0 type-small font-semibold text-signal">
            {name}
          </p>
        ) : null}
        <h1 className="m-0 type-h1 text-ink">{title}</h1>
        <p className="mb-0 mt-3 text-slate-600">{intro}</p>
      </header>
      <section
        className={contentVariant === "panel" ? "workspace-panel" : undefined}
      >
        {children}
      </section>
    </div>
  );
}
