"use client";
import { useEffect, type ReactNode } from "react";
import Link from "next/link";
export function ProductReportLink({
  href,
  children,
}: {
  href: string;
  children: ReactNode;
}) {
  return (
    <Link
      href={href}
      onClick={() => {
        sessionStorage.setItem(
          "finance-product-list",
          JSON.stringify({
            url: location.pathname + location.search,
            scroll: scrollY,
          }),
        );
      }}
    >
      {children}
    </Link>
  );
}
export function ProductBackLink({
  href,
  children,
}: {
  href: string;
  children: ReactNode;
}) {
  return (
    <Link
      href={href}
      data-product-back
      onClick={() => sessionStorage.setItem("finance-restore-scroll", "yes")}
    >
      {children}
    </Link>
  );
}
export function RestoreProductScroll() {
  useEffect(() => {
    if (sessionStorage.getItem("finance-restore-scroll") !== "yes") return;
    sessionStorage.removeItem("finance-restore-scroll");
    try {
      const state = JSON.parse(
        sessionStorage.getItem("finance-product-list") || "null",
      );
      if (state && typeof state.scroll === "number")
        requestAnimationFrame(() => window.scrollTo(0, state.scroll));
    } catch {
      /* Ignore unavailable prior navigation state. */
    }
  }, []);
  return null;
}
