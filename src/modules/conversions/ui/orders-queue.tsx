"use client";

import { useId, useState } from "react";
import {
  EmptyState,
  MoneyAmount,
  StatusPill,
} from "@/src/modules/design-system";
import { Money } from "@/src/modules/shared";
import type {
  ConversionStatus,
  OrderAction,
} from "../domain/order-transitions";
import type { ConversionView } from "../ports/conversion-repository";
import { OrderDecisionForm } from "./order-decision-form";
import styles from "./orders-queue.module.css";

function statusState(status: ConversionStatus) {
  return status.toLowerCase() as Lowercase<ConversionStatus>;
}

export function OrdersQueue({
  orders,
  locale,
  formattedDates,
  decisionAction,
  copy,
}: {
  orders: readonly ConversionView[];
  locale: "ka" | "en";
  formattedDates?: Record<string, string>;
  decisionAction: (
    conversionId: string,
    action: OrderAction,
  ) => void | Promise<void>;
  copy: {
    emptyTitle: string;
    emptyBody: string;
    order: string;
    date: string;
    lineItems: string;
    sku: string;
    quantity: string;
    creator: string;
    commission: string;
    noAttribution: string;
    unattributedExplanation: string;
    cancel: string;
    pendingAction: string;
    cancelConfirmedWarning: string;
    all: string;
    search: string;
    searchPlaceholder: string;
    details: string;
    products: string;
    explanation: string;
    cancelledNote: string;
    noResults: string;
    reset: string;
    previous: string;
    next: string;
    page: string;
    statuses: Record<Lowercase<ConversionStatus>, string>;
  };
}) {
  const searchId = useId();
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<ConversionStatus | "ALL">("ALL");
  const [page, setPage] = useState(1);
  if (orders.length === 0)
    return <EmptyState title={copy.emptyTitle} body={copy.emptyBody} />;
  const needle = query.trim().toLocaleLowerCase(locale);
  const matching = orders.filter(
    (order) =>
      (status === "ALL" || order.status === status) &&
      [
        order.orderId,
        ...order.items.flatMap((item) => [
          item.sku,
          item.attribution?.creatorName ?? "",
        ]),
      ].some((value) => value.toLocaleLowerCase(locale).includes(needle)),
  );
  const pages = Math.max(1, Math.ceil(matching.length / 10));
  const currentPage = Math.min(page, pages);
  const visible = matching.slice((currentPage - 1) * 10, currentPage * 10);
  const filters = [
    { value: "ALL", label: copy.all, count: orders.length },
    {
      value: "CONFIRMED",
      label: copy.statuses.confirmed,
      count: orders.filter((order) => order.status === "CONFIRMED").length,
    },
    {
      value: "CANCELLED",
      label: copy.statuses.cancelled,
      count: orders.filter((order) => order.status === "CANCELLED").length,
    },
  ] as const;
  return (
    <div className={styles.workspace}>
      <div className={styles.toolbar}>
        <div className={styles.filters} role="group" aria-label={copy.order}>
          {filters.map((filter) => (
            <button
              key={filter.value}
              type="button"
              aria-pressed={status === filter.value}
              onClick={() => {
                setStatus(filter.value);
                setPage(1);
              }}
            >
              {filter.label} <span>{filter.count}</span>
            </button>
          ))}
        </div>
        <div className={styles.search}>
          <label className="sr-only" htmlFor={searchId}>
            {copy.search}
          </label>
          <svg
            aria-hidden="true"
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.7"
          >
            <circle cx="10.5" cy="10.5" r="6.5" />
            <path d="m16 16 4.5 4.5" />
          </svg>
          <input
            id={searchId}
            type="search"
            value={query}
            placeholder={copy.searchPlaceholder}
            onChange={(event) => {
              setQuery(event.target.value);
              setPage(1);
            }}
          />
        </div>
      </div>
      <p className={styles.guidance}>{copy.explanation}</p>
      <div className={styles.ledger}>
        <div className={styles.columnHead} aria-hidden="true">
          <span>
            {copy.order} / {copy.date}
          </span>
          <span>
            {copy.products} / {copy.creator}
          </span>
          <span>{copy.commission}</span>
          <span />
        </div>
        {visible.map((order) => {
          const skus = [...new Set(order.items.map((item) => item.sku))];
          const creators = [
            ...new Set(
              order.items.map(
                (item) => item.attribution?.creatorName ?? copy.noAttribution,
              ),
            ),
          ];
          return (
            <details className={styles.order} key={order.id}>
              <summary className={styles.summary}>
                <div className={styles.identity}>
                  <div className={styles.orderTitle}>
                    <span className={styles.orderId}>
                      {copy.order} #{order.orderId}
                    </span>
                    <StatusPill
                      state={statusState(order.status)}
                      label={copy.statuses[statusState(order.status)]}
                    />
                  </div>
                  <time dateTime={order.occurredAt}>
                    {formattedDates?.[order.id] ?? order.occurredAt}
                  </time>
                </div>
                <div className={styles.products}>
                  <span>
                    {skus.length === 1
                      ? skus[0]
                      : `${copy.products}: ${skus.length}`}
                  </span>
                  <span>{creators.join(", ")}</span>
                </div>
                <div className={styles.amount}>
                  <span className={styles.mobileLabel}>{copy.commission}</span>
                  <MoneyAmount
                    size="sm"
                    value={Money.of(order.commissionAmount)}
                  />
                  {order.status === "CANCELLED" ? (
                    <span className={styles.excluded}>
                      {copy.cancelledNote}
                    </span>
                  ) : null}
                </div>
                <span className={styles.disclosure}>
                  <span className="sr-only">{copy.details}</span>
                  <svg
                    aria-hidden="true"
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.7"
                  >
                    <path d="m9 5 7 7-7 7" />
                  </svg>
                </span>
              </summary>
              <div className={styles.detail}>
                <h2>{copy.lineItems}</h2>
                {!order.items.some((item) => item.attribution !== undefined) ? (
                  <p className={styles.note}>{copy.unattributedExplanation}</p>
                ) : null}
                <div className={styles.items}>
                  {order.items.map((item) => (
                    <dl className={styles.item} key={item.id}>
                      <div>
                        <dt>{copy.sku}</dt>
                        <dd className={styles.sku}>{item.sku}</dd>
                      </div>
                      <div>
                        <dt>{copy.quantity}</dt>
                        <dd>{item.qty}</dd>
                      </div>
                      <div>
                        <dt>{copy.creator}</dt>
                        <dd>
                          {item.attribution?.creatorName ?? copy.noAttribution}
                        </dd>
                      </div>
                      <div>
                        <dt>{copy.commission}</dt>
                        <dd>
                          <MoneyAmount
                            size="sm"
                            value={Money.of(
                              item.attribution?.commissionAmount ?? "0.00",
                            )}
                          />
                        </dd>
                      </div>
                    </dl>
                  ))}
                </div>
                {order.status === "CONFIRMED" ? (
                  <footer className={styles.footer}>
                    <OrderDecisionForm
                      conversionId={order.id}
                      action="CANCEL"
                      decisionAction={decisionAction}
                      label={copy.cancel}
                      pendingLabel={copy.pendingAction}
                      confirmation={copy.cancelConfirmedWarning}
                    />
                  </footer>
                ) : null}
              </div>
            </details>
          );
        })}
        {matching.length === 0 ? (
          <div className={styles.noResults}>
            <p>{copy.noResults}</p>
            <button
              type="button"
              onClick={() => {
                setQuery("");
                setStatus("ALL");
                setPage(1);
              }}
            >
              {copy.reset}
            </button>
          </div>
        ) : null}
      </div>
      <footer className={styles.pagination}>
        <p role="status">
          {copy.order}: {matching.length} <span aria-hidden="true">·</span>{" "}
          {copy.page} {currentPage} / {pages}
        </p>
        {pages > 1 ? (
          <div>
            <button
              type="button"
              disabled={currentPage === 1}
              onClick={() => setPage(currentPage - 1)}
            >
              {copy.previous}
            </button>
            <button
              type="button"
              disabled={currentPage === pages}
              onClick={() => setPage(currentPage + 1)}
            >
              {copy.next}
            </button>
          </div>
        ) : null}
      </footer>
    </div>
  );
}
