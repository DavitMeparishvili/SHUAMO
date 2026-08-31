import type { ReactNode } from "react";

type FigureProps = {
  label: string;
  value: ReactNode;
  hint?: string;
  href?: string;
} & (
  | { estimate: true; estimateLabel: string }
  | { estimate?: false; estimateLabel?: never }
);

export function Figure({
  label,
  value,
  hint,
  estimate = false,
  estimateLabel,
  href,
}: FigureProps) {
  const content = (
    <>
      <span className="type-caption block text-slate-500">{label}</span>
      <span className="mt-1 block type-figure text-ink">{value}</span>
      {estimate ? (
        <span className="mt-2 block type-caption text-slate-600">
          {estimateLabel}
        </span>
      ) : hint ? (
        <span className="mt-2 block type-caption text-slate-600">{hint}</span>
      ) : null}
    </>
  );

  if (href) {
    return (
      <a
        className="block rounded-md border border-slate-200 bg-paper p-4 shadow-xs transition-[border-color,box-shadow] duration-150 hover:border-signal hover:shadow-sm active:border-signal-active"
        href={href}
      >
        {content}
      </a>
    );
  }

  return <div className="p-4">{content}</div>;
}
