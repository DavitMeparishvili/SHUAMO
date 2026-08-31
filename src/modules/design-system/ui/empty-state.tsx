import type { ReactNode } from "react";

export function EmptyState({
  title,
  body,
  action,
}: {
  title: string;
  body: string;
  action?: ReactNode;
}) {
  return (
    <div className="mx-auto max-w-[62ch] py-10 text-center">
      <h3 className="m-0 type-h3 text-ink">{title}</h3>
      <p className="mx-auto mb-0 mt-3 max-w-[58ch] text-slate-600">{body}</p>
      {action ? <div className="mt-6">{action}</div> : null}
    </div>
  );
}
