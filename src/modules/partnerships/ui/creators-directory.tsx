/* eslint-disable @next/next/no-img-element */
"use client";

import { useRef, useState, useTransition } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Icon } from "@/src/modules/design-system";
import type { Locale } from "@/src/modules/localization";
import {
  CREATOR_STATES,
  compareCreatorText,
  filterCreators,
  readCreatorFilters,
  type CreatorDirectoryItem,
  type CreatorFilters,
} from "../domain/creator-directory";
import { creatorsCopy } from "./creators-copy";
import { brandCategoryLabel } from "./brands-copy";

export function CreatorsDirectory({
  items,
  locale,
  decideAction,
  inviteAction,
}: {
  items: CreatorDirectoryItem[];
  locale: Locale;
  decideAction: (id: string, decision: "APPROVE" | "REJECT") => Promise<void>;
  inviteAction: (id: string) => Promise<void>;
}) {
  const copy = creatorsCopy(locale);
  const pathname = usePathname();
  const params = useSearchParams();
  const filters = readCreatorFilters(params);
  const sheet = useRef<HTMLDialogElement>(null);
  const detail = useRef<HTMLDialogElement>(null);
  const [draft, setDraft] = useState(filters);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = items.find((item) => item.id === selectedId);
  const [pending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<{
    error: boolean;
    text: string;
  } | null>(null);
  const [limit, setLimit] = useState(24);
  const activeCount = (value: CreatorFilters) =>
    value.categories.length +
    value.formats.length +
    Number(Boolean(value.location)) +
    Number(Boolean(value.activation));
  const resetSecondary = (value: CreatorFilters): CreatorFilters => ({
    ...value,
    categories: [],
    location: "",
    formats: [],
    activation: "",
  });
  const categories = [
    ...new Set(items.flatMap((item) => item.categories)),
  ].sort((a, b) =>
    compareCreatorText(
      brandCategoryLabel(a, locale),
      brandCategoryLabel(b, locale),
    ),
  );
  const formats = [...new Set(items.flatMap((item) => item.formats))].sort(
    compareCreatorText,
  );
  const locations = [
    ...new Map(
      items
        .filter((item) => item.locationKey)
        .map((item) => [item.locationKey, item.location]),
    ).entries(),
  ].sort((a, b) => compareCreatorText(a[1], b[1]));
  const matching = filterCreators(items, filters, false);
  const results = matching
    .filter(
      (item) => filters.status === "ALL" || item.status === filters.status,
    )
    .sort((a, b) =>
      filters.sort === "newest"
        ? compareCreatorText(b.createdAt, a.createdAt) ||
          compareCreatorText(a.name, b.name)
        : compareCreatorText(a.name, b.name) * (filters.sort === "za" ? -1 : 1),
    );
  function navigate(next: CreatorFilters) {
    const query = new URLSearchParams();
    if (next.q) query.set("q", next.q);
    if (next.status !== "ALL") query.set("status", next.status);
    next.categories.forEach((value) => query.append("category", value));
    next.formats.forEach((value) => query.append("format", value));
    if (next.location) query.set("location", next.location);
    if (next.activation) query.set("activation", next.activation);
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
    const update = (next: Partial<CreatorFilters>) =>
      mobile
        ? setDraft({ ...value, ...next })
        : navigate({ ...value, ...next });
    const checkboxes = (
      key: "categories" | "formats",
      label: string,
      options: string[],
    ) =>
      options.length ? (
        <fieldset>
          <legend>{label}</legend>
          {options.map((option) => (
            <label key={option}>
              <input
                type="checkbox"
                checked={value[key].includes(option)}
                onChange={() =>
                  update({
                    [key]: value[key].includes(option)
                      ? value[key].filter((v) => v !== option)
                      : [...value[key], option],
                  })
                }
              />
              <span>
                {key === "categories"
                  ? brandCategoryLabel(option, locale)
                  : option}
              </span>
              <small>
                {items.filter((item) => item[key].includes(option)).length}
              </small>
            </label>
          ))}
        </fieldset>
      ) : null;
    return (
      <div className="brands-filter-fields">
        {checkboxes("categories", copy.category, categories)}
        <label className="brands-location">
          <span>{copy.location}</span>
          <select
            value={value.location}
            onChange={(event) => update({ location: event.target.value })}
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
        {checkboxes("formats", copy.formats, formats)}
        <label className="brands-location">
          <span>{copy.activity}</span>
          <select
            value={value.activation}
            onChange={(event) => update({ activation: event.target.value })}
          >
            <option value="">{copy.anyActivity}</option>
            <option value="no-link">{copy.noLink}</option>
            <option value="has-link">{copy.hasLink}</option>
            <option value="has-sale">{copy.hasSale}</option>
          </select>
        </label>
      </div>
    );
  }
  const badge = (item: CreatorDirectoryItem) => (
    <span
      className={`brands-status brands-status-${item.status === "NOT_PARTNERED" ? "not_applied" : item.status.toLowerCase()}`}
    >
      <span aria-hidden="true" className="brands-status-dot" />
      {copy[item.status]}
    </span>
  );
  function showDetail(item: CreatorDirectoryItem) {
    setSelectedId(item.id);
    setFeedback(null);
    detail.current?.showModal();
  }
  function save(item: CreatorDirectoryItem, decision?: "APPROVE" | "REJECT") {
    if (pending) return;
    setFeedback(null);
    startTransition(async () => {
      try {
        if (item.partnershipId && decision)
          await decideAction(item.partnershipId, decision);
        else if (!item.partnershipId) await inviteAction(item.id);
        else return;
        detail.current?.close();
        setFeedback({ error: false, text: `${item.name}: ${copy.saved}` });
      } catch {
        setFeedback({ error: true, text: copy.error });
      }
    });
  }
  return (
    <div className="brands-workspace creators-directory">
      <header className="brands-heading">
        <h1>{copy.title}</h1>
        <p>{copy.intro}</p>
      </header>
      <form
        className="brands-search"
        role="search"
        onSubmit={(event) => {
          event.preventDefault();
          navigate({
            ...filters,
            q: String(new FormData(event.currentTarget).get("q") ?? "").trim(),
          });
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
        <p id="creators-partnership-label">{copy.partnership}</p>
        <div
          className="brands-status-tabs"
          role="group"
          aria-labelledby="creators-partnership-label"
        >
          {CREATOR_STATES.map((status) => (
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
                  : matching.filter((item) => item.status === status).length}
              </span>
            </button>
          ))}
        </div>
      </div>
      <div className="brands-layout">
        <aside className="brands-sidebar" aria-label={copy.filters}>
          <div className="brands-filter-heading">
            <h2>{copy.filters}</h2>
            {activeCount(filters) ? (
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
                  setDraft(filters);
                  sheet.current?.showModal();
                }}
              >
                <FilterIcon />
                {copy.filters}
                {activeCount(filters) ? ` (${activeCount(filters)})` : ""}
              </button>
              <label className="brands-sort">
                <span>{copy.sort}</span>
                <select
                  aria-label={copy.sort}
                  value={filters.sort}
                  onChange={(event) =>
                    navigate({ ...filters, sort: event.target.value })
                  }
                >
                  {(["az", "za", "newest"] as const).map((sort) => (
                    <option key={sort} value={sort}>
                      {copy[sort]}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            {feedback && !feedback.error ? (
              <p role="status" className="brands-feedback">
                {feedback.text}
              </p>
            ) : null}
            {results.length ? (
              <ul className="brands-list">
                {results.slice(0, limit).map((item) => (
                  <li className="brands-row" key={item.id}>
                    <div className="brands-image">
                      {item.imageUrl ? (
                        <img
                          src={item.imageUrl}
                          alt=""
                          width="88"
                          height="72"
                          loading="lazy"
                          onError={(event) => {
                            event.currentTarget.style.display = "none";
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
                      <div className="brands-mobile-status">{badge(item)}</div>
                      <p>{item.tagline || copy.unpublished}</p>
                    </div>
                    <div className="brands-meta">
                      {item.categories.length ? (
                        <span>
                          <TagIcon />
                          {item.categories
                            .map((value) => brandCategoryLabel(value, locale))
                            .join(", ")}
                        </span>
                      ) : null}
                      {item.location ? (
                        <span>
                          <Icon name="pin" />
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
                      <small>{copy.partnership}</small>
                      {badge(item)}
                    </div>
                    <div className="brands-row-action">
                      <button
                        type="button"
                        className={`brands-action${item.status === "REJECTED" ? " brands-action-outline" : ""}`}
                        aria-haspopup="dialog"
                        disabled={pending}
                        onClick={() => showDetail(item)}
                      >
                        {item.status === "APPROVED"
                          ? copy.manage
                          : item.status === "PENDING"
                            ? copy.review
                            : item.status === "REJECTED"
                              ? copy.decision
                              : copy.invite}
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="brands-empty">
                <Icon name="search" />
                <h2>{copy.empty}</h2>
                <p>{copy.emptyBody}</p>
                <button
                  className="brands-action"
                  type="button"
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
              </div>
            )}
          </div>
          {results.length > limit ? (
            <button
              className="brands-load-more"
              type="button"
              onClick={() => setLimit((value) => value + 24)}
            >
              {copy.more}
            </button>
          ) : null}
          {results.length ? (
            <p className="brands-footnote">
              {copy.showing
                .replace("{count}", String(Math.min(limit, results.length)))
                .replace("{total}", String(results.length))}
            </p>
          ) : null}
        </section>
      </div>
      <dialog
        ref={sheet}
        className="brands-sheet"
        aria-labelledby="creators-sheet-title"
      >
        <div className="brands-sheet-handle" aria-hidden="true" />
        <header className="brands-sheet-heading">
          <h2 id="creators-sheet-title">
            {copy.filters}{" "}
            {activeCount(draft) ? <span>{activeCount(draft)}</span> : null}
          </h2>
          <button
            className="brands-reset"
            type="button"
            onClick={() => setDraft(resetSecondary(draft))}
          >
            {copy.reset}
          </button>
          <button
            className="icon-button"
            type="button"
            aria-label={copy.close}
            onClick={() => sheet.current?.close()}
          >
            <Icon name="close" />
          </button>
        </header>
        <div className="brands-sheet-body">{fields(true)}</div>
        <footer>
          <button
            className="brands-action"
            type="button"
            onClick={() => {
              navigate(draft);
              sheet.current?.close();
            }}
          >
            {copy.show.replace(
              "{count}",
              String(filterCreators(items, draft).length),
            )}
          </button>
        </footer>
      </dialog>
      <dialog
        ref={detail}
        className="brands-detail"
        aria-labelledby="creator-detail-title"
        onCancel={(event) => {
          if (pending) event.preventDefault();
        }}
      >
        {selected ? (
          <>
            <header>
              <h2 id="creator-detail-title">{selected.name}</h2>
              <button
                className="icon-button"
                type="button"
                disabled={pending}
                aria-label={copy.close}
                onClick={() => detail.current?.close()}
              >
                <Icon name="close" />
              </button>
            </header>
            <p className="brands-detail-label">{copy.partnership}</p>
            {badge(selected)}
            {selected.appliedAt ? (
              <p className="brands-detail-date">
                {copy.appliedOn}:{" "}
                {new Intl.DateTimeFormat(locale === "ka" ? "ka-GE" : "en-GB", {
                  dateStyle: "medium",
                  timeZone: "Asia/Tbilisi",
                }).format(new Date(selected.appliedAt))}
              </p>
            ) : null}
            <p>
              {selected.status === "APPROVED"
                ? copy.approvedBody
                : selected.status === "PENDING"
                  ? copy.pendingBody
                  : selected.status === "REJECTED"
                    ? copy.rejectedBody
                    : copy.inviteBody}
            </p>
            {feedback?.error ? (
              <p role="alert" className="brands-feedback error">
                {feedback.text}
              </p>
            ) : null}
            <div className="creators-detail-actions">
              {selected.profileHref ? (
                <Link
                  className="brands-action brands-action-outline"
                  href={selected.profileHref}
                >
                  {copy.profile}
                </Link>
              ) : (
                <p>{copy.unpublished}</p>
              )}
              {selected.status === "APPROVED" ? (
                <Link
                  className="brands-action brands-action-outline"
                  href={`/${locale}/brand/links?creator=${selected.id}`}
                >
                  {copy.links}
                </Link>
              ) : null}
              <button
                className={`brands-action${selected.status === "APPROVED" ? " creators-remove" : ""}`}
                type="button"
                disabled={pending}
                onClick={() =>
                  save(
                    selected,
                    selected.status === "APPROVED" ? "REJECT" : "APPROVE",
                  )
                }
              >
                {pending
                  ? copy.working
                  : selected.status === "APPROVED"
                    ? copy.remove
                    : selected.status === "PENDING"
                      ? copy.approve
                      : selected.status === "REJECTED"
                        ? copy.restore
                        : copy.invite}
              </button>
              {selected.status === "PENDING" ? (
                <button
                  className="brands-action brands-action-outline"
                  type="button"
                  disabled={pending}
                  onClick={() => save(selected, "REJECT")}
                >
                  {copy.reject}
                </button>
              ) : null}
            </div>
          </>
        ) : null}
      </dialog>
    </div>
  );
}
function FilterIcon() {
  return (
    <svg
      width="18"
      height="18"
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
      <path d="m3 12 9-9h8v8l-9 9-8-8Z" />
      <circle cx="16" cy="7" r="1" />
    </svg>
  );
}
