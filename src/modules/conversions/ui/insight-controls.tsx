"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { PerformanceReport } from "../ports/performance";
import type { PerformancePageState } from "../application/performance-query";
import { performanceHref } from "./performance-links";

export function InsightFilters({
  report,
  state,
  basePath,
  locale,
  overview = false,
}: {
  report: PerformanceReport;
  state: PerformancePageState;
  basePath: string;
  locale: string;
  overview?: boolean;
}) {
  const router = useRouter();
  const ka = locale === "ka";
  const text = (en: string, ge: string) => (ka ? ge : en);
  const [period, setPeriod] = useState(state.filters.period);
  const [parent, setParent] = useState(
    state.filters.brandId ?? state.filters.creatorId ?? "",
  );
  const [product, setProduct] = useState(state.filters.productId ?? "");
  const [link, setLink] = useState(state.filters.linkId ?? "");
  const [linkStatus, setLinkStatus] = useState(state.filters.linkStatus ?? "");
  const dialog = useRef<HTMLDialogElement>(null);
  const form = useRef<HTMLFormElement>(null);
  const [mobile, setMobile] = useState(false);
  useEffect(() => {
    const q = matchMedia("(max-width: 700px)");
    const update = () => setMobile(q.matches);
    update();
    q.addEventListener("change", update);
    return () => q.removeEventListener("change", update);
  }, []);
  const parentKey = report.role === "creator" ? "brand" : "creator";
  const parents =
    report.role === "creator" ? report.options.brands : report.options.creators;
  const count = [
    state.filters.brandId ?? state.filters.creatorId,
    state.filters.productId,
    state.filters.linkId,
    state.filters.linkStatus,
  ].filter(Boolean).length;
  const fields = (
    <>
      {period === "custom" ? (
        <div className="insight-date-fields">
          <label>
            {text("From", "დან")}
            <input
              name="from"
              type="date"
              defaultValue={state.filters.from}
              required
            />
          </label>
          <label>
            {text("To", "მდე")}
            <input
              name="to"
              type="date"
              defaultValue={state.filters.to}
              required
            />
          </label>
        </div>
      ) : null}
      {!overview ? (
        <>
          <label>
            {text(
              report.role === "creator" ? "Brand" : "Creator",
              report.role === "creator" ? "ბრენდი" : "კრეატორი",
            )}
            <select
              name={parentKey}
              value={parent}
              onChange={(e) => {
                setParent(e.target.value);
                setProduct("");
                setLink("");
              }}
            >
              <option value="">{text("All", "ყველა")}</option>
              {parents.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>
          <label>
            {text("Product", "პროდუქტი")}
            <select
              name="product"
              value={product}
              onChange={(e) => {
                setProduct(e.target.value);
                setLink("");
              }}
            >
              <option value="">{text("All products", "ყველა პროდუქტი")}</option>
              {report.options.products
                ?.filter((o) => !parent || !o.parentId || o.parentId === parent)
                .map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.label}
                  </option>
                ))}
            </select>
          </label>
          <label>
            {text("Tracking link", "ბმული")}
            <select
              name="link"
              value={link}
              onChange={(e) => setLink(e.target.value)}
            >
              <option value="">{text("All links", "ყველა ბმული")}</option>
              {report.options.links
                ?.filter(
                  (o) =>
                    (!product || o.parentId === product) &&
                    (!parent || o.partnerId === parent),
                )
                .map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.label}
                  </option>
                ))}
            </select>
          </label>
          {state.filters.tab === "activity" ? (
            <label>
              {text("Link availability", "ბმულის ხელმისაწვდომობა")}
              <select
                name="linkStatus"
                value={linkStatus}
                onChange={(e) => setLinkStatus(e.target.value)}
              >
                <option value="">{text("All links", "ყველა ბმული")}</option>
                <option value="ACTIVE">{text("Active", "აქტიური")}</option>
                <option value="DISABLED">
                  {text("Unavailable", "მიუწვდომელი")}
                </option>
              </select>
            </label>
          ) : null}
        </>
      ) : null}
      <div className="insight-filter-actions">
        <button
          type="button"
          className="insight-text-button"
          onClick={() => {
            setParent("");
            setProduct("");
            setLink("");
            setLinkStatus("");
          }}
        >
          {text("Reset", "გასუფთავება")}
        </button>
        <button className="x-button" type="submit">
          {text("Show results", "შედეგების ჩვენება")}
        </button>
      </div>
    </>
  );
  return (
    <div
      className={
        overview ? "insight-toolbar overview-range" : "insight-toolbar"
      }
    >
      <form ref={form} action={basePath} method="get">
        <input
          type="hidden"
          name="tab"
          value={state.filters.tab ?? "summary"}
        />
        <input type="hidden" name="view" value={state.breakdown} />
        <div className="insight-range">
          <label>
            <span className="sr-only">{text("Date range", "პერიოდი")}</span>
            <select
              name="period"
              value={period}
              onChange={(e) => {
                const value = e.target.value as typeof period;
                setPeriod(value);
                if (value !== "custom")
                  router.push(
                    performanceHref(basePath, state.filters, state, {
                      period: value,
                      from: undefined,
                      to: undefined,
                      sale: undefined,
                      ledgerPage: undefined,
                      clickPage: undefined,
                    }),
                  );
                else if (mobile) dialog.current?.showModal();
              }}
            >
              <option value="7d">{text("Last 7 days", "ბოლო 7 დღე")}</option>
              <option value="30d">{text("Last 30 days", "ბოლო 30 დღე")}</option>
              <option value="90d">{text("Last 90 days", "ბოლო 90 დღე")}</option>
              <option value="custom">
                {text("Custom dates", "თარიღების არჩევა")}
              </option>
              <option value="all">{text("All time", "სრული პერიოდი")}</option>
            </select>
          </label>
          <small>Asia/Tbilisi</small>
        </div>
        {mobile ? (
          <>
            <button
              className="x-button outline"
              type="button"
              onClick={() => dialog.current?.showModal()}
            >
              {text("Filters", "ფილტრები")}
              {count ? ` (${count})` : ""}
            </button>
            <dialog ref={dialog} className="insight-filter-sheet">
              <header>
                <h2>{text("Filters", "ფილტრები")}</h2>
                <button
                  type="button"
                  className="insight-text-button"
                  onClick={() => dialog.current?.close()}
                >
                  {text("Close", "დახურვა")}
                </button>
              </header>
              {fields}
            </dialog>
          </>
        ) : !overview || period === "custom" ? (
          <div className="insight-filter-fields">{fields}</div>
        ) : null}
      </form>
      {count ? (
        <div className="insight-chips">
          {[
            ...parents,
            ...(report.options.products ?? []),
            ...(report.options.links ?? []),
          ]
            .filter((o) =>
              [
                state.filters.brandId,
                state.filters.creatorId,
                state.filters.productId,
                state.filters.linkId,
              ].includes(o.id),
            )
            .map((o) => (
              <span key={o.id}>{o.label}</span>
            ))}
          <a
            href={performanceHref(
              basePath,
              {
                period: state.filters.period,
                ...(state.filters.from
                  ? { from: state.filters.from, to: state.filters.to! }
                  : {}),
              },
              state,
            )}
          >
            {text("Clear all", "ყველას გასუფთავება")}
          </a>
        </div>
      ) : null}
    </div>
  );
}

export function SalePanel({
  children,
  closeHref,
  label,
  title,
}: {
  children: React.ReactNode;
  closeHref: string;
  label: string;
  title: string;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const router = useRouter();
  useEffect(() => {
    dialog.current?.showModal();
  }, []);
  return (
    <dialog
      aria-label={title}
      className="insight-sale-panel"
      ref={dialog}
      onCancel={(e) => {
        e.preventDefault();
        router.push(closeHref, { scroll: false });
      }}
    >
      <a className="insight-back" href={closeHref}>
        {label}
      </a>
      {children}
    </dialog>
  );
}
