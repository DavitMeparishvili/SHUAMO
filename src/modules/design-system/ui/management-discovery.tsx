"use client";

import { useRef, useState, useTransition, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Icon } from "./brand";

type Filter = {
  name: string;
  label: string;
  options: { value: string; label: string }[];
};

/** The discovery layout with filters appropriate to a brand's management tasks. */
export function ManagementDiscovery({
  title,
  intro,
  values,
  filters,
  sortOptions,
  copy,
  total,
  action,
  children,
}: {
  title: string;
  intro: string;
  values: Record<string, string>;
  filters: Filter[];
  sortOptions: Filter["options"];
  copy: {
    search: string;
    filters: string;
    clear: string;
    close: string;
    apply: string;
    sort: string;
    results: string;
  };
  total: number;
  action?: ReactNode;
  children: ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const sheet = useRef<HTMLDialogElement>(null);
  const [draft, setDraft] = useState(values);
  const [pending, startTransition] = useTransition();
  const activeCount = filters.filter((filter) => values[filter.name]).length;
  const empty = Object.fromEntries(
    Object.keys(values).map((key) => [key, key === "sort" ? "newest" : ""]),
  );
  function navigate(next: Record<string, string>) {
    if (pending) return;
    const query = new URLSearchParams();
    Object.entries(next).forEach(([key, value]) => {
      if (value && !(key === "sort" && value === "newest"))
        query.set(key, value);
    });
    startTransition(() =>
      router.push(`${pathname}${query.size ? `?${query}` : ""}`, {
        scroll: false,
      }),
    );
  }
  function fields(mobile: boolean) {
    const current = mobile ? draft : values;
    return (
      <div className="discovery-filter-fields">
        {filters.map((filter) => (
          <details className="discovery-filter-group" key={filter.name} open>
            <summary>
              {filter.label}
              <Icon name="chevron" />
            </summary>
            <label className="discovery-select-field">
              <span className="sr-only">{filter.label}</span>
              <select
                value={current[filter.name] ?? ""}
                disabled={pending}
                onChange={(event) => {
                  const next = {
                    ...current,
                    [filter.name]: event.target.value,
                  };
                  if (mobile) setDraft(next);
                  else navigate(next);
                }}
              >
                {filter.options.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
          </details>
        ))}
      </div>
    );
  }
  return (
    <div className="discovery-workspace brand-management" aria-busy={pending}>
      <header className="discovery-heading">
        <div className="management-title">
          <h1>{title}</h1>
          {action}
        </div>
        <p>{intro}</p>
        <form
          className="discovery-search"
          role="search"
          onSubmit={(event) => {
            event.preventDefault();
            navigate({
              ...values,
              q: String(
                new FormData(event.currentTarget).get("q") ?? "",
              ).trim(),
            });
          }}
        >
          <input
            key={values.q}
            name="q"
            type="search"
            aria-label={copy.search}
            placeholder={copy.search}
            defaultValue={values.q}
            disabled={pending}
          />
          <button type="submit" aria-label={copy.search} disabled={pending}>
            <Icon name="search" />
          </button>
        </form>
      </header>
      <aside className="discovery-sidebar" aria-label={copy.filters}>
        <div className="discovery-filter-heading">
          <h2>{copy.filters}</h2>
          <button
            type="button"
            disabled={pending}
            onClick={() => navigate(empty)}
          >
            {copy.clear}
          </button>
        </div>
        {fields(false)}
      </aside>
      <section className="discovery-results" aria-label={title}>
        <div className="discovery-toolbar">
          <p className="discovery-result-count" role="status">
            {copy.results.replace("{count}", String(total))}
          </p>
          <button
            className="discovery-filter-trigger"
            type="button"
            aria-haspopup="dialog"
            disabled={pending}
            onClick={() => {
              setDraft(values);
              sheet.current?.showModal();
            }}
          >
            {copy.filters}
            {activeCount ? ` (${activeCount})` : ""}
          </button>
          <label className="discovery-sort">
            <span>{copy.sort}</span>
            <select
              aria-label={copy.sort}
              value={values.sort}
              disabled={pending}
              onChange={(event) =>
                navigate({ ...values, sort: event.target.value })
              }
            >
              {sortOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        </div>
        {children}
      </section>
      <dialog
        ref={sheet}
        className="discovery-filter-sheet"
        aria-labelledby="management-filter-title"
      >
        <header className="discovery-sheet-heading">
          <h2 id="management-filter-title">{copy.filters}</h2>
          <button
            className="icon-button"
            type="button"
            aria-label={copy.close}
            onClick={() => sheet.current?.close()}
          >
            <Icon name="close" />
          </button>
        </header>
        <div className="discovery-sheet-body">
          <button
            className="discovery-clear"
            type="button"
            onClick={() => setDraft(empty)}
          >
            {copy.clear}
          </button>
          {fields(true)}
        </div>
        <footer>
          <button
            className="discovery-primary"
            type="button"
            disabled={pending}
            onClick={() => {
              navigate(draft);
              sheet.current?.close();
            }}
          >
            {copy.apply}
          </button>
        </footer>
      </dialog>
    </div>
  );
}
