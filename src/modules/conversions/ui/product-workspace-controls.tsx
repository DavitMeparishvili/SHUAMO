"use client";
import { useEffect, useRef, useTransition, type ReactNode } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Icon } from "@/src/modules/design-system";
import type { ProductWorkspaceCopy } from "./product-workspace-copy";

export function useWorkspaceQuery() {
  const router = useRouter();
  const path = usePathname();
  const params = useSearchParams();
  const current = useRef(params.toString());
  const [pending, startTransition] = useTransition();
  useEffect(() => {
    current.current = params.toString();
  }, [params]);
  const update = (values: Record<string, string>) => {
    const next = new URLSearchParams(current.current);
    for (const [key, value] of Object.entries(values))
      if (value) next.set(key, value);
      else next.delete(key);
    current.current = next.toString();
    startTransition(() =>
      router.replace(path + (next.size ? "?" + next.toString() : ""), {
        scroll: false,
      }),
    );
  };
  return { update, pending, params, path };
}

export function WorkspaceSearch({
  value,
  label,
  onChange,
}: {
  value: string;
  label: string;
  onChange: (value: string) => void;
}) {
  const input = useRef<HTMLInputElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const change = useRef(onChange);
  useEffect(() => {
    change.current = onChange;
  });
  useEffect(() => {
    if (input.current && document.activeElement !== input.current)
      input.current.value = value;
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [value]);
  return (
    <label className="pl-search">
      <Icon name="search" />
      <input
        ref={input}
        type="search"
        aria-label={label}
        placeholder={label}
        defaultValue={value}
        onChange={(e) => {
          if (timer.current) clearTimeout(timer.current);
          const next = e.target.value;
          timer.current = setTimeout(() => change.current(next), 300);
        }}
      />
    </label>
  );
}

export function PeriodControl({
  value,
  copy,
  onChange,
}: {
  value: string;
  copy: ProductWorkspaceCopy;
  onChange: (value: string) => void;
}) {
  return (
    <label className="pl-period">
      <Icon name="calendar" />
      <select
        aria-label={copy.period}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        <option value="7d">{copy.days7}</option>
        <option value="30d">{copy.days30}</option>
        <option value="90d">{copy.days90}</option>
        <option value="all">{copy.allTime}</option>
        {value === "custom" ? (
          <option value="custom">{copy.custom}</option>
        ) : null}
      </select>
    </label>
  );
}
export function WorkspacePagination({
  page,
  pageCount,
  onChange,
  copy,
}: {
  page: number;
  pageCount: number;
  onChange: (page: number) => void;
  copy: ProductWorkspaceCopy;
}) {
  if (pageCount <= 1) return null;
  return (
    <nav className="pl-pagination" aria-label={copy.page}>
      <button
        className="pl-button"
        disabled={page <= 1}
        onClick={() => onChange(page - 1)}
      >
        {copy.previous}
      </button>
      <span>
        {copy.page} {page} {copy.of} {pageCount}
      </span>
      <button
        className="pl-button"
        disabled={page >= pageCount}
        onClick={() => onChange(page + 1)}
      >
        {copy.next}
      </button>
    </nav>
  );
}
export function WorkspaceDialog({
  title,
  children,
  close,
  className = "",
}: {
  title: string;
  children: ReactNode;
  close: () => void;
  className?: string;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current;
    const focused = document.activeElement as HTMLElement | null;
    const returnFocus =
      focused?.closest("details")?.querySelector("summary") ?? focused;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    dialog?.showModal();
    return () => {
      dialog?.close();
      document.body.style.overflow = previousOverflow;
      if (returnFocus?.isConnected) returnFocus.focus();
    };
  }, []);
  return (
    <dialog
      ref={ref}
      className={"pl-dialog " + className}
      aria-label={title}
      onCancel={(e) => {
        e.preventDefault();
        e.stopPropagation();
        close();
      }}
    >
      {children}
    </dialog>
  );
}
