"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import { WorkspaceDialog } from "./product-workspace-controls";

export function ProductCreatorsLink({
  href,
  className,
  children,
}: {
  href: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <Link
      href={href}
      className={className}
      scroll={false}
      onClick={(event) => {
        if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey)
          return;
        try {
          sessionStorage.setItem(
            "product-catalogue-scroll:" +
              window.location.pathname +
              window.location.search,
            String(window.scrollY),
          );
        } catch {}
        if (!window.matchMedia("(min-width: 1280px)").matches) {
          event.preventDefault();
          window.location.assign(href);
        }
      }}
    >
      {children}
    </Link>
  );
}
export function ProductCreatorsDrawer({
  children,
  title,
}: {
  children: ReactNode;
  title: string;
}) {
  const router = useRouter();
  useEffect(() => {
    const media = window.matchMedia("(min-width: 1280px)");
    const change = () => {
      if (!media.matches) window.location.reload();
    };
    change();
    media.addEventListener("change", change);
    return () => media.removeEventListener("change", change);
  }, []);
  return (
    <WorkspaceDialog
      title={title}
      close={() => router.back()}
      className="pl-drawer"
    >
      {children}
    </WorkspaceDialog>
  );
}
