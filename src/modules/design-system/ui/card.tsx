import type { ReactNode } from "react";

interface CardProps {
  as?: "div" | "a";
  href?: string;
  raised?: boolean;
  className?: string;
  children: ReactNode;
}

export function Card({
  as = "div",
  href,
  raised = false,
  className,
  children,
}: CardProps) {
  const classes = [
    "block rounded-md border border-slate-200 bg-paper p-5 shadow-xs",
    as === "a" && raised
      ? "transition-[border-color,box-shadow] duration-150 hover:border-signal-200 hover:shadow-sm"
      : undefined,
    className,
  ]
    .filter(Boolean)
    .join(" ");

  if (as === "a") {
    return (
      <a className={classes} href={href}>
        {children}
      </a>
    );
  }

  return <div className={classes}>{children}</div>;
}
