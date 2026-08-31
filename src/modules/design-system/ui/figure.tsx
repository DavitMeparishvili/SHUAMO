import type { ReactNode } from "react";

interface FigureProps {
  label: string;
  value: ReactNode;
  hint?: string;
  estimate?: boolean;
  estimateLabel?: string;
  href?: string;
}

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
          {estimateLabel ?? "Estimate"}
        </span>
      ) : hint ? (
        <span className="mt-2 block type-caption text-slate-600">{hint}</span>
      ) : null}
    </>
  );

  if (href) {
    return (
      <a
        className="block rounded-md border border-slate-200 bg-paper p-4 shadow-xs transition-[border-color,box-shadow] duration-150 hover:border-signal-200 hover:shadow-sm"
        href={href}
      >
        {content}
      </a>
    );
  }

  return <div className="p-4">{content}</div>;
}
