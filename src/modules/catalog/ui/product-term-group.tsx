"use client";

import { useEffect, useRef, type ReactNode } from "react";

export function ProductTermGroup({
  children,
  initiallyOpen,
}: {
  children: ReactNode;
  initiallyOpen: boolean;
}) {
  const details = useRef<HTMLDetailsElement>(null);
  useEffect(() => {
    if (
      initiallyOpen &&
      window.matchMedia("(max-width: 760px)").matches &&
      details.current
    ) {
      details.current.open = false;
    }
  }, [initiallyOpen]);
  return (
    <details
      className="product-detail-term-group"
      ref={details}
      open={initiallyOpen}
    >
      {children}
    </details>
  );
}
