"use client";

import { useRef, useState, useTransition } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Icon } from "@/src/modules/design-system";
import type { Locale } from "@/src/modules/localization";
import {
  APPLICATION_STATES,
  filterBrands,
  readBrandFilters,
  type BrandDirectoryItem,
  type BrandFilters,
} from "../domain/brand-directory";
import { brandCategoryLabel, brandsCopy } from "./brands-copy";

export function BrandsDirectory({
  items,
  locale,
  applyAction,
}: {
  items: BrandDirectoryItem[];
  locale: Locale;
  applyAction: (brandId: string) => Promise<{ ok: boolean }>;
}) {
  const copy = brandsCopy(locale);
  const pathname = usePathname();
  const params = useSearchParams();
  const filters = readBrandFilters(params);
  const sheet = useRef<HTMLDialogElement>(null);
  const detail = useRef<HTMLDialogElement>(null);
  const [draft, setDraft] = useState(filters);
  const [selected, setSelected] = useState<BrandDirectoryItem | null>(null);
  const [pending, startTransition] = useTransition();
  const [applyingId, setApplyingId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{
    error: boolean;
    text: string;
  } | null>(null);
  const [limit, setLimit] = useState(24);
  const resetSecondary = (value: BrandFilters): BrandFilters => ({
    ...value,
    categories: [],
    location: "",
    interests: [],
  });
  const activeCount = (value: BrandFilters) =>
    value.categories.length +
    value.interests.length +
    Number(Boolean(value.location));
  const categories = [...new Set(items.flatMap((i) => i.categories))].sort(
    (a, b) =>
      brandCategoryLabel(a, locale).localeCompare(
        brandCategoryLabel(b, locale),
        locale,
      ),
  );
  const locations = [
    ...new Map(
      items
        .filter((i) => i.locationKey)
        .map((i) => [i.locationKey, i.location]),
    ).entries(),
  ].sort((a, b) => a[1].localeCompare(b[1], locale));
  const interests = [
    ...new Map(
      items.flatMap((i) =>
        i.interests.map((interest) => [interest.key, interest.label] as const),
      ),
    ).entries(),
  ].sort((a, b) => a[1].localeCompare(b[1], locale));
  const matching = filterBrands(items, filters, false);
  const results = matching
    .filter((i) => filters.status === "ALL" || i.status === filters.status)
    .sort((a, b) =>
      filters.sort === "newest"
        ? b.createdAt.localeCompare(a.createdAt) ||
          a.name.localeCompare(b.name, locale)
        : a.name.localeCompare(b.name, locale) *
          (filters.sort === "za" ? -1 : 1),
    );
  const previewCount = filterBrands(items, draft).length;
  function navigate(next: BrandFilters) {
    const query = new URLSearchParams();
    if (next.q) query.set("q", next.q);
    if (next.status !== "ALL") query.set("status", next.status);
    next.categories.forEach((c) => query.append("category", c));
    if (next.location) query.set("location", next.location);
    next.interests.forEach((i) => query.append("interest", i));
    if (next.sort !== "az") query.set("sort", next.sort);
    window.history.pushState(
      null,
      "",
      `${pathname}${query.size ? `?${query}` : ""}`,
    );
    setLimit(24);
  }
  function fields(mobile: boolean) {
    const value = mobile ? draft : filters;
    const update = (next: Partial<BrandFilters>) =>
      mobile
        ? setDraft({ ...value, ...next })
        : navigate({ ...value, ...next });
    function toggle(key: "categories" | "interests", item: string) {
      update({
        [key]: value[key].includes(item)
          ? value[key].filter((v) => v !== item)
          : [...value[key], item],
      });
    }
    return (
      <div className="brands-filter-fields">
        <fieldset>
          <legend>{copy.category}</legend>
          {categories.map((category) => (
            <label key={category}>
              <input
                type="checkbox"
                checked={value.categories.includes(category)}
                onChange={() => toggle("categories", category)}
              />
              <span>{brandCategoryLabel(category, locale)}</span>
              <small>
                {items.filter((i) => i.categories.includes(category)).length}
              </small>
            </label>
          ))}
        </fieldset>
        <label className="brands-location">
          <span>{copy.location}</span>
          <select
            value={value.location}
            onChange={(e) => update({ location: e.target.value })}
          >
            <option value="">{copy.anyLocation}</option>
            {value.location &&
            !locations.some(([key]) => key === value.location) ? (
              <option value={value.location}>{value.location}</option>
            ) : null}
            {locations.map(([key, label]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <fieldset>
          <legend>{copy.interests}</legend>
          {interests.map(([key, label]) => (
            <label key={key}>
              <input
                type="checkbox"
                checked={value.interests.includes(key)}
                onChange={() => toggle("interests", key)}
              />
              <span>{label}</span>
            </label>
          ))}
        </fieldset>
      </div>
    );
  }
  const statusBadge = (item: BrandDirectoryItem) => (
    <span
      className={`brands-status brands-status-${item.status.toLowerCase()}`}
    >
      <span aria-hidden="true" className="brands-status-dot" />
      {copy[item.status]}
    </span>
  );
  function showDetail(item: BrandDirectoryItem) {
    setSelected(item);
    detail.current?.showModal();
  }
  function apply(item: BrandDirectoryItem) {
    if (pending) return;
    setApplyingId(item.id);
    setFeedback(null);
    startTransition(async () => {
      try {
        const result = await applyAction(item.id);
        setFeedback({
          error: !result.ok,
          text: result.ok ? `${item.name}: ${copy.submitted}` : copy.error,
        });
      } catch {
        setFeedback({ error: true, text: copy.error });
      } finally {
        setApplyingId(null);
      }
    });
  }
  return (
    <div className="brands-workspace">
      <header className="brands-heading">
        <h1>{copy.title}</h1>
        <p>{copy.intro}</p>
      </header>
      <form
        role="search"
        className="brands-search"
        onSubmit={(e) => {
          e.preventDefault();
          const q = String(new FormData(e.currentTarget).get("q") ?? "").trim();
          navigate({ ...filters, q });
        }}
      >
        <button type="submit" aria-label={copy.search}>
          <Icon name="search" />
        </button>
        <input
          key={filters.q}
          type="search"
          name="q"
          aria-label={copy.search}
          placeholder={copy.search}
          defaultValue={filters.q}
        />
      </form>
      <div className="brands-applications">
        <p id="brands-application-label">{copy.application}</p>
        <div
          className="brands-status-tabs"
          role="group"
          aria-labelledby="brands-application-label"
        >
          {APPLICATION_STATES.map((status) => (
            <button
              type="button"
              key={status}
              aria-pressed={filters.status === status}
              onClick={() => navigate({ ...filters, status })}
            >
              {copy[status]}
              <span>
                {status === "ALL"
                  ? matching.length
                  : matching.filter((i) => i.status === status).length}
              </span>
            </button>
          ))}
        </div>
      </div>
      <div className="brands-layout">
        <aside className="brands-sidebar" aria-label={copy.filters}>
          <div className="brands-filter-heading">
            <h2>{copy.filters}</h2>
            {activeCount(filters) > 0 ? (
              <button
                type="button"
                onClick={() => navigate(resetSecondary(filters))}
              >
                {copy.reset}
              </button>
            ) : null}
          </div>
          {fields(false)}
        </aside>
        <section className="brands-results" aria-label={copy.title}>
          <div className="brands-list-panel">
            <div className="brands-toolbar">
              <p role="status">
                {results.length === 1
                  ? copy.countOne
                  : copy.count.replace("{count}", String(results.length))}
              </p>
              <button
                className="brands-filter-trigger"
                type="button"
                aria-haspopup="dialog"
                onClick={() => {
                  setDraft(
                    readBrandFilters(
                      new URLSearchParams(window.location.search),
                    ),
                  );
                  sheet.current?.showModal();
                }}
              >
                <FilterIcon />
                {copy.filters}
                {activeCount(filters) ? ` (${activeCount(filters)})` : ""}
              </button>
              <label className="brands-sort">
                <span>{copy.sort}:</span>
                <select
                  aria-label={copy.sort}
                  value={filters.sort}
                  onChange={(e) =>
                    navigate({ ...filters, sort: e.target.value })
                  }
                >
                  <option value="az">{copy.az}</option>
                  <option value="za">{copy.za}</option>
                  <option value="newest">{copy.newest}</option>
                </select>
              </label>
            </div>
            {feedback ? (
              <p
                role={feedback.error ? "alert" : "status"}
                className={
                  feedback.error ? "brands-feedback error" : "brands-feedback"
                }
              >
                {feedback.text}
              </p>
            ) : null}
            {results.length ? (
              <ul className="brands-list">
                {results.slice(0, limit).map((item) => (
                  <li key={item.id} className="brands-row">
                    <div className="brands-image">
                      {item.imageUrl /* eslint-disable-next-line @next/next/no-img-element */ ? (
                        <img
                          src={item.imageUrl}
                          alt=""
                          width="88"
                          height="72"
                          loading="lazy"
                          onError={(e) => {
                            e.currentTarget.style.display = "none";
                          }}
                        />
                      ) : null}
                      <span aria-hidden="true">{item.name.slice(0, 1)}</span>
                    </div>
                    <div className="brands-identity">
                      <h2>
                        {item.profileHref ? (
                          <Link href={item.profileHref}>{item.name}</Link>
                        ) : (
                          <button
                            className="brands-name"
                            type="button"
                            onClick={() => showDetail(item)}
                          >
                            {item.name}
                          </button>
                        )}
                      </h2>
                      <div className="brands-mobile-status">
                        {statusBadge(item)}
                      </div>
                      <p>{item.tagline || copy.unpublished}</p>
                    </div>
                    <div className="brands-meta">
                      {item.categories.length ? (
                        <span>
                          <TagIcon />
                          {item.categories
                            .map((c) => brandCategoryLabel(c, locale))
                            .join(", ")}
                        </span>
                      ) : null}
                      {item.location ? (
                        <span>
                          <LocationIcon />
                          <span className="brands-location-full">
                            {item.location}
                          </span>
                          <span className="brands-location-city">
                            {item.location.split(",")[0]}
                          </span>
                        </span>
                      ) : null}
                    </div>
                    <div className="brands-desktop-status">
                      <small>{copy.application}</small>
                      {statusBadge(item)}
                    </div>
                    <div className="brands-row-action">
                      {item.status === "APPROVED" ? (
                        <Link
                          className="brands-action"
                          href={`/${locale}/creator/products?brand=${item.id}`}
                        >
                          {copy.browse}
                        </Link>
                      ) : item.status === "NOT_APPLIED" ? (
                        <button
                          className="brands-action"
                          type="button"
                          disabled={pending}
                          onClick={() => apply(item)}
                        >
                          {applyingId === item.id ? copy.applying : copy.apply}
                        </button>
                      ) : (
                        <button
                          className="brands-action brands-action-outline"
                          type="button"
                          aria-haspopup="dialog"
                          onClick={() => showDetail(item)}
                        >
                          {item.status === "PENDING"
                            ? copy.pendingAction
                            : copy.rejectedAction}
                        </button>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="brands-empty">
                <Icon name="search" />
                <h2>{items.length ? copy.empty : copy.emptyAll}</h2>
                <p>{items.length ? copy.emptyBody : copy.emptyAllBody}</p>
                {items.length ? (
                  <button
                    type="button"
                    className="brands-action"
                    onClick={() =>
                      navigate({
                        ...resetSecondary(filters),
                        q: "",
                        status: "ALL",
                      })
                    }
                  >
                    {copy.reset}
                  </button>
                ) : null}
              </div>
            )}
          </div>
          {results.length > limit ? (
            <button
              className="brands-load-more"
              type="button"
              onClick={() => setLimit((v) => v + 24)}
            >
              {copy.more}
            </button>
          ) : null}
          {results.length ? (
            <p className="brands-footnote">
              {filters.status === "APPROVED"
                ? results.length === 1
                  ? copy.approvedNoteOne
                  : copy.approvedNote.replace("{count}", String(results.length))
                : results.length === 1
                  ? copy.showingOne
                  : copy.showing
                      .replace(
                        "{count}",
                        String(Math.min(results.length, limit)),
                      )
                      .replace("{total}", String(results.length))}
            </p>
          ) : null}
        </section>
      </div>
      <dialog
        ref={sheet}
        className="brands-sheet"
        aria-labelledby="brands-sheet-title"
        onClick={(e) => {
          if (
            e.target === e.currentTarget &&
            e.clientY < e.currentTarget.getBoundingClientRect().top
          )
            sheet.current?.close();
        }}
      >
        <div className="brands-sheet-handle" aria-hidden="true" />
        <header className="brands-sheet-heading">
          <h2 id="brands-sheet-title">
            {copy.filters}
            {activeCount(draft) ? <span> ({activeCount(draft)})</span> : null}
          </h2>
          <button
            type="button"
            className="brands-reset"
            onClick={() => setDraft(resetSecondary(draft))}
          >
            {copy.reset}
          </button>
          <button
            type="button"
            className="icon-button"
            aria-label={copy.close}
            autoFocus
            onClick={() => sheet.current?.close()}
          >
            <Icon name="close" />
          </button>
        </header>
        <div className="brands-sheet-body">{fields(true)}</div>
        <footer>
          <button
            type="button"
            className="brands-action"
            onClick={() => {
              navigate(draft);
              sheet.current?.close();
            }}
          >
            {previewCount === 1
              ? copy.showOne
              : copy.show.replace("{count}", String(previewCount))}
          </button>
        </footer>
      </dialog>
      <dialog
        ref={detail}
        className="brands-detail"
        aria-labelledby="brands-detail-title"
      >
        <header>
          <h2 id="brands-detail-title">{selected?.name}</h2>
          <button
            type="button"
            className="icon-button"
            autoFocus
            aria-label={copy.close}
            onClick={() => detail.current?.close()}
          >
            <Icon name="close" />
          </button>
        </header>
        {selected ? (
          <>
            <p className="brands-detail-label">{copy.application}</p>
            {statusBadge(selected)}
            {selected.appliedAt ? (
              <p className="brands-detail-date">
                {copy.appliedOn}:{" "}
                {new Intl.DateTimeFormat(locale, {
                  dateStyle: "medium",
                }).format(new Date(selected.appliedAt))}
              </p>
            ) : null}
            <p>
              {selected.status === "PENDING"
                ? copy.pendingBody
                : selected.status === "REJECTED"
                  ? copy.rejectedBody
                  : copy.unpublished}
            </p>
            {selected.profileHref ? (
              <Link className="brands-action" href={selected.profileHref}>
                {copy.profile}
              </Link>
            ) : null}
          </>
        ) : null}
      </dialog>
    </div>
  );
}

function FilterIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      aria-hidden="true"
    >
      <path d="M3 6h18M6 12h12M10 18h4" />
    </svg>
  );
}
function TagIcon() {
  return (
    <svg
      width="17"
      height="17"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      aria-hidden="true"
    >
      <path d="m3 12 9-9h8v8l-9 10-8-9Z" />
      <circle cx="16" cy="7" r="1" />
    </svg>
  );
}
function LocationIcon() {
  return (
    <svg
      width="17"
      height="17"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      aria-hidden="true"
    >
      <path d="M19 10c0 5-7 12-7 12S5 15 5 10a7 7 0 0 1 14 0Z" />
      <circle cx="12" cy="10" r="2.5" />
    </svg>
  );
}
