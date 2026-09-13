"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Icon } from "@/src/modules/design-system";
import type {
  ProductCatalogueData,
  ProductSummary,
} from "../infrastructure/prisma-product-workspace";
import type { ProductWorkspaceQuery } from "../application/product-workspace-query";
import { productWorkspaceCopy } from "./product-workspace-copy";
import {
  PeriodControl,
  WorkspaceDialog,
  WorkspacePagination,
  WorkspaceSearch,
  useWorkspaceQuery,
} from "./product-workspace-controls";
import {
  MoreIcon,
  offerRate,
  ProductStatus,
  ProductThumb,
  productMoney as gel,
} from "./product-workspace-shared";
import { ProductCreatorsLink } from "./product-creators-navigation";

type Filters = {
  coverage: string;
  status: string;
  type: string;
  rate: string;
  sort: string;
};
export function BrandProductCatalogue({
  data,
  query,
  locale,
  productTypes,
}: {
  data: ProductCatalogueData;
  query: ProductWorkspaceQuery;
  locale: string;
  productTypes: { value: string; label: string }[];
}) {
  const c = productWorkspaceCopy(locale);
  const { update, pending, params, path } = useWorkspaceQuery();
  const [draft, setDraft] = useState<Filters | null>(null);
  const coverage = [
    { value: "", label: c.all, count: data.facets.all },
    { value: "active", label: c.activeCoverage, count: data.facets.active },
    { value: "none", label: c.none, count: data.facets.none },
    {
      value: "disabled",
      label: c.disabledCoverage,
      count: data.facets.disabled,
    },
  ];
  const sorts = [
    { value: "newest", label: c.newest },
    { value: "sales", label: c.salesSort },
    { value: "value", label: c.valueSort },
    { value: "creators", label: c.creatorsSort },
    { value: "title", label: c.nameSort },
  ];
  const change = (values: Record<string, string>) =>
    update({ ...values, page: "" });
  const clear = () =>
    change({ q: "", coverage: "", status: "", type: "", rate: "", sort: "" });
  const filterCount = [
    query.coverage,
    query.status,
    query.type,
    query.rate,
  ].filter(Boolean).length;
  const returnTo = path + (params.size ? "?" + params.toString() : "");
  const creatorsHref = (id: string) => {
    const next = new URLSearchParams({ period: query.period, returnTo });
    if (query.from) {
      next.set("from", query.from);
      next.set("to", query.to);
    }
    return `/${locale}/brand/products/${id}/creators?${next}`;
  };
  useEffect(() => {
    try {
      const key =
        "product-catalogue-scroll:" +
        window.location.pathname +
        window.location.search;
      const value = sessionStorage.getItem(key);
      if (value) {
        window.scrollTo(0, Number(value));
        sessionStorage.removeItem(key);
      }
    } catch {}
  }, []);
  const filterFields = (
    values: Filters,
    set: (values: Record<string, string>) => void,
    mobile = false,
  ) => (
    <>
      {[
        ...(mobile
          ? [{ name: "coverage", label: c.coverage, options: coverage }]
          : []),
        {
          name: "status",
          label: c.status,
          options: [
            { value: "", label: c.anyStatus },
            { value: "ACTIVE", label: c.active },
            { value: "ARCHIVED", label: c.archived },
          ],
        },
        {
          name: "type",
          label: c.type,
          options: [{ value: "", label: c.anyType }, ...productTypes],
        },
        ...(data.rateTypes.length > 1
          ? [
              {
                name: "rate",
                label: c.rateType,
                options: [
                  { value: "", label: c.anyType },
                  { value: "PERCENT", label: c.percent },
                  { value: "FIXED", label: c.fixed },
                ],
              },
            ]
          : []),
        ...(mobile ? [{ name: "sort", label: c.sort, options: sorts }] : []),
      ].map((f) => (
        <label className="pl-filter" key={f.name}>
          <span>{f.label}</span>
          <select
            value={values[f.name as keyof Filters]}
            onChange={(e) => set({ [f.name]: e.target.value })}
          >
            {f.options.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </label>
      ))}
    </>
  );
  const chips = [
    { key: "q", value: query.q, label: query.q },
    {
      key: "coverage",
      value: query.coverage,
      label: coverage.find((o) => o.value === query.coverage)?.label,
    },
    {
      key: "status",
      value: query.status,
      label: query.status === "ACTIVE" ? c.active : c.archived,
    },
    {
      key: "type",
      value: query.type,
      label: productTypes.find((o) => o.value === query.type)?.label,
    },
    {
      key: "rate",
      value: query.rate,
      label: query.rate === "PERCENT" ? c.percent : c.fixed,
    },
  ].filter((chip) => chip.value);
  const identity = (p: ProductSummary) => (
    <div className="pl-product-identity">
      <ProductThumb src={p.image} />
      <div>
        <Link
          className="pl-product-name"
          href={`/${locale}/brand/products/${p.id}`}
        >
          {p.title}
        </Link>
        <ProductStatus status={p.status} copy={c} />
        <span className="pl-price">{gel(p.price, locale)}</span>
      </div>
    </div>
  );
  const counts = (p: ProductSummary) => (
    <div className="pl-link-counts">
      {p.links === 0 ? <span className="pl-muted">{c.noLinks}</span> : null}
      <ProductCreatorsLink href={creatorsHref(p.id)}>
        {p.creators} {c.creators} · {p.links} {c.links}
      </ProductCreatorsLink>
      <small>
        {p.active} {c.activeLinks}
      </small>
    </div>
  );
  const actions = (p: ProductSummary) => (
    <div className="pl-row-actions">
      <ProductCreatorsLink
        className="pl-button pl-outline"
        href={creatorsHref(p.id)}
      >
        {c.view}
      </ProductCreatorsLink>
      <details
        className="pl-overflow"
        onKeyDown={(e) => {
          if (e.key === "Escape") {
            e.currentTarget.open = false;
            e.currentTarget.querySelector("summary")?.focus();
          }
        }}
        onBlur={(e) => {
          if (!e.currentTarget.contains(e.relatedTarget))
            e.currentTarget.open = false;
        }}
      >
        <summary
          className="pl-button pl-icon"
          aria-label={c.productActions + ": " + p.title}
        >
          <MoreIcon />
        </summary>
        <div className="pl-menu">
          <Link href={`/${locale}/brand/products/${p.id}`}>{c.edit}</Link>
        </div>
      </details>
    </div>
  );
  return (
    <section
      className="pl-catalogue"
      aria-busy={pending}
      data-product-links-direction="user-pinned compact catalogue; navy shell; white rows; explicit product-to-creator drawer; mobile cards"
    >
      <header className="pl-page-heading">
        <div>
          <h1>{c.products}</h1>
          <p>{c.intro}</p>
        </div>
        <Link
          className="pl-button pl-primary"
          href={`/${locale}/brand/products/new`}
        >
          <span aria-hidden="true">+</span>
          {c.add}
        </Link>
      </header>
      <div className="pl-searchbar">
        <WorkspaceSearch
          value={query.q}
          label={c.search}
          onChange={(q) => change({ q })}
        />
        <button
          className="pl-button pl-mobile-filter"
          onClick={() =>
            setDraft({
              coverage: query.coverage,
              status: query.status,
              type: query.type,
              rate: query.rate,
              sort: query.sort,
            })
          }
        >
          <Icon name="settings" />
          {c.filters}
          {filterCount ? ` (${filterCount})` : ""}
        </button>
        <PeriodControl
          value={query.period}
          copy={c}
          onChange={(period) => change({ period, from: "", to: "" })}
        />
      </div>
      <div className="pl-coverage" aria-label={c.coverage}>
        {coverage.map((o) => (
          <button
            key={o.value}
            aria-pressed={query.coverage === o.value}
            onClick={() => change({ coverage: o.value })}
          >
            {o.label}
            <span>{o.count}</span>
          </button>
        ))}
      </div>
      <div className="pl-catalogue-body">
        <aside className="pl-filter-rail">
          <div className="pl-between">
            <h2>{c.filters}</h2>
            <button className="pl-text-button" onClick={clear}>
              {c.reset}
            </button>
          </div>
          {filterFields(query, change)}
        </aside>
        <div className="pl-results">
          {data.metricsUnavailable ? (
            <p className="pl-notice" role="alert">
              {c.metricError}
              <button
                className="pl-text-button"
                onClick={() => window.location.reload()}
              >
                {c.refresh}
              </button>
            </p>
          ) : null}
          <div className="pl-between pl-results-heading">
            <span role="status">
              {data.total} {c.results}
            </span>
            <label className="pl-sort">
              <span>{c.sort}</span>
              <select
                value={query.sort}
                onChange={(e) => change({ sort: e.target.value })}
              >
                {sorts.map((o) => (
                  <option value={o.value} key={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </label>
          </div>
          {chips.length ? (
            <div className="pl-chips">
              {chips.map((chip) => (
                <button
                  key={chip.key}
                  onClick={() => change({ [chip.key]: "" })}
                >
                  {chip.label}
                  <Icon name="close" />
                </button>
              ))}
              <button onClick={clear}>{c.clear}</button>
            </div>
          ) : null}
          {data.items.length ? (
            <>
              <table className="pl-products-table">
                <thead>
                  <tr>
                    {[
                      c.product,
                      c.offer,
                      c.creatorsLinks,
                      c.sales,
                      c.value,
                      c.actions,
                    ].map((s) => (
                      <th key={s} scope="col">
                        {s}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {data.items.map((p) => (
                    <tr key={p.id}>
                      <td>{identity(p)}</td>
                      <td>
                        <span className="pl-rate">
                          {offerRate(p.rateType, p.rate, locale)}
                        </span>
                      </td>
                      <td>{counts(p)}</td>
                      <td className="pl-number">
                        {data.metricsUnavailable
                          ? c.unavailable
                          : p.confirmedSales}
                      </td>
                      <td className="pl-number">
                        {data.metricsUnavailable
                          ? c.unavailable
                          : gel(p.sales, locale)}
                      </td>
                      <td>{actions(p)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="pl-product-cards">
                {data.items.map((p) => (
                  <article key={p.id} className="pl-product-card">
                    {identity(p)}
                    <div className="pl-card-offer">
                      <span className="pl-rate">
                        {offerRate(p.rateType, p.rate, locale)}
                      </span>{" "}
                      <span className="pl-muted">{c.offer}</span>
                      {counts(p)}
                    </div>
                    <dl className="pl-mobile-metrics">
                      <div>
                        <dt>{c.sales}</dt>
                        <dd>
                          {data.metricsUnavailable
                            ? c.unavailable
                            : p.confirmedSales}
                        </dd>
                      </div>
                      <div>
                        <dt>{c.value}</dt>
                        <dd>
                          {data.metricsUnavailable
                            ? c.unavailable
                            : gel(p.sales, locale)}
                        </dd>
                      </div>
                    </dl>
                    {actions(p)}
                  </article>
                ))}
              </div>
            </>
          ) : (
            <div className="pl-empty">
              <Icon name="box" />
              <h2>{chips.length ? c.noMatches : c.empty}</h2>
              <p>{chips.length ? c.noMatchesBody : c.emptyBody}</p>
              {chips.length ? (
                <button className="pl-button" onClick={clear}>
                  {c.clear}
                </button>
              ) : (
                <Link
                  className="pl-button pl-primary"
                  href={`/${locale}/brand/products/new`}
                >
                  {c.add}
                </Link>
              )}
            </div>
          )}
          <p className="pl-scope">{c.scope}</p>
          <WorkspacePagination
            copy={c}
            page={data.page}
            pageCount={data.pageCount}
            onChange={(page) => update({ page: String(page) })}
          />
        </div>
      </div>
      {draft ? (
        <WorkspaceDialog
          title={c.filters}
          close={() => setDraft(null)}
          className="pl-filter-sheet"
        >
          <header className="pl-between">
            <h2>{c.filters}</h2>
            <button
              className="pl-button pl-icon"
              aria-label={c.close}
              onClick={() => setDraft(null)}
            >
              <Icon name="close" />
            </button>
          </header>
          {filterFields(
            draft,
            (values) => setDraft({ ...draft, ...values }),
            true,
          )}
          <footer className="pl-between">
            <button
              className="pl-button"
              onClick={() =>
                setDraft({
                  coverage: "",
                  status: "",
                  type: "",
                  rate: "",
                  sort: "newest",
                })
              }
            >
              {c.reset}
            </button>
            <button
              className="pl-button pl-primary"
              onClick={() => {
                change(draft);
                setDraft(null);
              }}
            >
              {c.apply}
            </button>
          </footer>
        </WorkspaceDialog>
      ) : null}
    </section>
  );
}
