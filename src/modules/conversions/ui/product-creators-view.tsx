"use client";
import { useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Icon } from "@/src/modules/design-system";
import type {
  CreatorLinkGroup,
  ProductCreatorsData,
  ProductLinkRow,
} from "../infrastructure/prisma-product-workspace";
import type { ProductWorkspaceQuery } from "../application/product-workspace-query";
import {
  productWorkspaceCopy,
  type ProductWorkspaceCopy,
} from "./product-workspace-copy";
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
import { insightDate } from "./insight-shared";

type Mutation = (
  linkId: string,
  status: "ACTIVE" | "DISABLED",
) => Promise<{ ok: boolean; error?: string }>;
type Inspection = {
  link: ProductLinkRow;
  creator: string;
  mode: "terms" | "disable";
};

export function ProductCreatorsView({
  data,
  query,
  locale,
  returnTo,
  baseUrl,
  drawer = false,
  changeStatus,
}: {
  data: ProductCreatorsData;
  query: ProductWorkspaceQuery;
  locale: string;
  returnTo: string;
  baseUrl: string;
  drawer?: boolean;
  changeStatus: Mutation;
}) {
  const c = productWorkspaceCopy(locale),
    router = useRouter();
  const { update, pending, params, path } = useWorkspaceQuery();
  const [inspection, setInspection] = useState<Inspection | null>(null);
  const [working, setWorking] = useState(false);
  const busy = useRef(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [copiedFallback, setCopiedFallback] = useState("");
  const [revision, setRevision] = useState(0);
  const p = data.product;
  const filtered = Boolean(query.cq || query.cs);
  const href = (creator?: string, link?: string) => {
    const search = new URLSearchParams({ product: p.id, period: query.period });
    if (creator) search.set("creator", creator);
    if (link) search.set("link", link);
    if (query.from) {
      search.set("from", query.from);
      search.set("to", query.to);
    }
    return `/${locale}/brand/performance?${search}`;
  };
  const change = (values: Record<string, string>) =>
    update({ ...values, cp: "" });
  async function copy(link: ProductLinkRow) {
    const url = `${baseUrl.replace(/\/$/, "")}/r/${link.code}`;
    try {
      await navigator.clipboard.writeText(url);
      setNotice(c.copied);
      setCopiedFallback("");
    } catch {
      setNotice(c.copyError);
      setCopiedFallback(url);
    }
  }
  async function mutate(link: ProductLinkRow, status: "ACTIVE" | "DISABLED") {
    if (busy.current) return;
    busy.current = true;
    setWorking(true);
    setError("");
    setNotice("");
    try {
      const result = await changeStatus(link.id, status);
      if (!result.ok) {
        setError(c.reasons[result.error ?? ""] ?? c.retry);
        return;
      }
      setInspection(null);
      setNotice(c.saved);
      setRevision((r) => r + 1);
      router.refresh();
    } catch {
      setError(c.retry);
    } finally {
      busy.current = false;
      setWorking(false);
    }
  }
  return (
    <section
      className={"pl-creators-view" + (drawer ? " pl-in-drawer" : "")}
      aria-busy={pending}
    >
      <div className="pl-view-navigation">
        {drawer ? (
          <>
            <a href={path + "?" + params.toString()}>
              {c.fullPage}
              <Icon name="arrow" />
            </a>
            <button
              className="pl-button pl-icon"
              aria-label={c.close}
              onClick={() => router.back()}
            >
              <Icon name="close" />
            </button>
          </>
        ) : (
          <a href={returnTo}>
            <Icon name="arrow" className="pl-back-icon" />
            {c.back}
          </a>
        )}
      </div>
      <header className="pl-detail-product">
        <ProductThumb src={p.image} />
        <div>
          <Link
            className="pl-product-name"
            href={`/${locale}/brand/products/${p.id}`}
          >
            {p.title}
          </Link>
          <ProductStatus status={p.status} copy={c} />
          <p>
            {c.offer}: <strong>{offerRate(p.rateType, p.rate, locale)}</strong>
            <span aria-hidden="true"> · </span>
            {c.price}: {gel(p.price, locale)}
          </p>
        </div>
      </header>
      <div className="pl-between pl-creators-heading">
        <div>
          <h1>{c.creatorsLinks}</h1>
          <p>
            {c.totals}: {p.creators} {c.creators} · {p.links} {c.links} ·{" "}
            {p.active} {c.activeLinks}
          </p>
        </div>
        <PeriodControl
          value={query.period}
          copy={c}
          onChange={(period) => change({ period, from: "", to: "" })}
        />
      </div>
      {filtered ? <p className="pl-filtered-label">{c.filtered}</p> : null}
      <dl className="pl-summary-metrics">
        <div>
          <dd>{data.metrics?.confirmedSales ?? c.unavailable}</dd>
          <dt>{c.sales}</dt>
        </div>
        <div>
          <dd>
            {data.metrics ? gel(data.metrics.sales, locale) : c.unavailable}
          </dd>
          <dt>{c.value}</dt>
        </div>
        <div>
          <dd>
            {data.metrics
              ? gel(data.metrics.commission, locale)
              : c.unavailable}
          </dd>
          <dt>{c.commission}</dt>
        </div>
      </dl>
      {data.metricsUnavailable ? (
        <div className="pl-notice" role="alert">
          {c.metricError}
          <button onClick={() => router.refresh()} className="pl-text-button">
            {c.refresh}
          </button>
        </div>
      ) : null}
      <div className="pl-creator-controls">
        <WorkspaceSearch
          value={query.cq}
          label={c.creatorSearch}
          onChange={(cq) => change({ cq })}
        />
        <label className="pl-filter">
          <span>{c.linkStatus}</span>
          <select
            value={query.cs}
            onChange={(e) => change({ cs: e.target.value })}
          >
            <option value="">{c.anyStatus}</option>
            <option value="ACTIVE">{c.active}</option>
            <option value="DISABLED">{c.disabled}</option>
          </select>
        </label>
        <label className="pl-filter">
          <span>{c.sort}</span>
          <select
            value={query.csort}
            onChange={(e) => change({ csort: e.target.value })}
          >
            <option value="sales">{c.salesSort}</option>
            <option value="commission">{c.commissionSort}</option>
            <option value="name">{c.nameSort}</option>
            <option value="recent">{c.recentSort}</option>
          </select>
        </label>
      </div>
      {filtered ? (
        <div className="pl-chips">
          {query.cq ? (
            <button onClick={() => change({ cq: "" })}>
              {query.cq}
              <Icon name="close" />
            </button>
          ) : null}
          {query.cs ? (
            <button onClick={() => change({ cs: "" })}>
              {query.cs === "ACTIVE" ? c.active : c.disabled}
              <Icon name="close" />
            </button>
          ) : null}
          <button onClick={() => change({ cq: "", cs: "" })}>{c.clear}</button>
        </div>
      ) : null}
      <div className="pl-results-heading" role="status">
        {data.totalGroups} {c.creators} · {data.matchingLinks}{" "}
        {filtered ? c.matching : c.links}
      </div>
      <div role="status" className={notice ? "pl-notice" : "sr-only"}>
        {notice}
        {copiedFallback ? (
          <input
            aria-label={c.copy}
            readOnly
            value={copiedFallback}
            onFocus={(e) => e.target.select()}
          />
        ) : null}
      </div>
      {error && !inspection ? (
        <p className="pl-error" role="alert">
          {error}
        </p>
      ) : null}
      {data.groups.length ? (
        <div className="pl-creator-list">
          {data.groups.map((group) => (
            <CreatorGroup
              key={group.id}
              group={group}
              query={query}
              locale={locale}
              productId={p.id}
              revision={revision}
              unavailable={data.metricsUnavailable}
              working={working}
              copy={c}
              performanceHref={href}
              onCopy={copy}
              inspect={(link, mode) => {
                setError("");
                setInspection({ link, creator: group.name, mode });
              }}
              restore={(link) => mutate(link, "ACTIVE")}
            />
          ))}
        </div>
      ) : (
        <div className="pl-empty">
          <Icon name="users" />
          <h2>{p.links ? c.noMatches : c.noLinks}</h2>
          <p>{p.links ? c.noMatchesBody : c.noLinksBody}</p>
          {filtered ? (
            <button
              className="pl-button"
              onClick={() => change({ cq: "", cs: "" })}
            >
              {c.clear}
            </button>
          ) : null}
        </div>
      )}
      <WorkspacePagination
        copy={c}
        page={data.page}
        pageCount={data.pageCount}
        onChange={(page) => update({ cp: String(page) })}
      />
      <footer className="pl-view-footer">
        <div className="pl-between">
          <p>
            <Icon name="help" />
            {c.history}
          </p>
          <Link className="pl-button" href={href()}>
            {c.productPerformance}
          </Link>
        </div>
        <p className="pl-scope">{c.metricScope}</p>
      </footer>
      {inspection ? (
        <WorkspaceDialog
          title={inspection.mode === "terms" ? c.terms : c.disable}
          close={() => {
            if (!working) setInspection(null);
          }}
          className="pl-terms-dialog"
        >
          <header className="pl-between">
            <h2>{inspection.mode === "terms" ? c.terms : c.disable}</h2>
            <button
              disabled={working}
              className="pl-button pl-icon"
              aria-label={c.close}
              onClick={() => setInspection(null)}
            >
              <Icon name="close" />
            </button>
          </header>
          <p className="pl-inspection-identity">
            {p.title} · {inspection.creator} ·{" "}
            <strong>{inspection.link.code}</strong>
          </p>
          {inspection.mode === "terms" ? (
            <AcceptedTerms link={inspection.link} copy={c} locale={locale} />
          ) : (
            <>
              <p>{c.disableBody}</p>
              {error ? (
                <p role="alert" className="pl-error">
                  {error}
                </p>
              ) : null}
              <footer className="pl-confirm-actions">
                <button
                  className="pl-button"
                  disabled={working}
                  onClick={() => setInspection(null)}
                >
                  {c.cancel}
                </button>
                <button
                  className="pl-button pl-destructive"
                  disabled={working}
                  onClick={() => mutate(inspection.link, "DISABLED")}
                >
                  {working ? c.working : c.disable}
                </button>
              </footer>
            </>
          )}
        </WorkspaceDialog>
      ) : null}
    </section>
  );
}

function CreatorGroup({
  group,
  query,
  locale,
  productId,
  revision,
  unavailable,
  working,
  copy: c,
  performanceHref,
  onCopy,
  inspect,
  restore,
}: {
  group: CreatorLinkGroup;
  query: ProductWorkspaceQuery;
  locale: string;
  productId: string;
  revision: number;
  unavailable: boolean;
  working: boolean;
  copy: ProductWorkspaceCopy;
  performanceHref: (creator?: string, link?: string) => string;
  onCopy: (link: ProductLinkRow) => void;
  inspect: (link: ProductLinkRow, mode: "terms" | "disable") => void;
  restore: (link: ProductLinkRow) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [child, setChild] = useState<{
    key: string;
    group: CreatorLinkGroup;
    unavailable: boolean;
  } | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const generation = JSON.stringify([query, revision]);
  const shown = child?.key === generation ? child.group : group;
  const missing =
    unavailable || (child?.key === generation && child.unavailable);
  const number = (value: number) => (missing ? c.unavailable : value);
  const money = (value: string) =>
    missing ? c.unavailable : gel(value, locale);
  async function load(page: number) {
    setLoading(true);
    setLoadError(false);
    try {
      const search = new URLSearchParams({
        period: query.period,
        cq: query.cq,
        cs: query.cs,
        from: query.from,
        to: query.to,
        linkPage: String(page),
      });
      const response = await fetch(
        `/api/brand/products/${productId}/creators/${group.id}/links?${search}`,
      );
      if (!response.ok) throw new Error("load");
      const result = (await response.json()) as {
        group: CreatorLinkGroup;
        metricsUnavailable: boolean;
      };
      setChild({
        key: generation,
        group: result.group,
        unavailable: result.metricsUnavailable,
      });
    } catch {
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  }
  return (
    <article className="pl-creator-group">
      <header className="pl-creator-parent">
        <button
          className="pl-expand"
          aria-label={(expanded ? c.collapse : c.expand) + " " + group.name}
          aria-expanded={expanded}
          aria-controls={"links-" + group.id}
          onClick={() => setExpanded(!expanded)}
        >
          <Icon name="chevron" />
        </button>
        <span className="pl-avatar">
          {group.avatar ? (
            <Image
              src={group.avatar}
              width={40}
              height={40}
              alt=""
              unoptimized
            />
          ) : (
            group.name.slice(0, 1)
          )}
        </span>
        <div className="pl-creator-name">
          <h2>{group.name}</h2>
          {group.profileSlug ? (
            <Link href={`/${locale}/creators/${group.profileSlug}`}>
              {c.profile}
            </Link>
          ) : (
            <small>{c.privateProfile}</small>
          )}
          <small>
            {group.matchingLinks} {c.matching} / {group.totalLinks}{" "}
            {c.totalLinks}
          </small>
        </div>
        <dl className="pl-creator-stats">
          <div>
            <dt>{c.clicks}</dt>
            <dd>{number(group.clicks)}</dd>
          </div>
          <div>
            <dt>{c.sales}</dt>
            <dd>{number(group.confirmedSales)}</dd>
          </div>
          <div>
            <dt>{c.commission}</dt>
            <dd>{money(group.commission)}</dd>
          </div>
        </dl>
        <Link
          className="pl-button pl-performance"
          href={performanceHref(group.id)}
        >
          {c.performance}
        </Link>
      </header>
      {expanded ? (
        <div
          className="pl-child-links"
          id={"links-" + group.id}
          aria-busy={loading}
        >
          <table className="pl-links-table">
            <thead>
              <tr>
                {[
                  c.code,
                  c.linkStatus,
                  c.terms,
                  c.clicks,
                  c.salesCompact,
                  c.commissionCompact,
                  c.actions,
                ].map((label) => (
                  <th scope="col" key={label}>
                    {label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {shown.links.map((link) => (
                <tr key={link.id}>
                  <td data-label={c.code}>
                    <strong>{link.code}</strong>
                    <button
                      className="pl-text-button pl-copy"
                      onClick={() => onCopy(link)}
                    >
                      {c.copy}
                      <Icon name="link" />
                    </button>
                  </td>
                  <td data-label={c.linkStatus}>
                    <ProductStatus status={link.status} copy={c} />
                  </td>
                  <td data-label={c.terms}>
                    <button
                      className="pl-text-button pl-accepted-rate"
                      onClick={() => inspect(link, "terms")}
                    >
                      {offerRate(link.rateType, link.rate, locale)}
                      {typeof link.terms.version === "number"
                        ? ` · v${link.terms.version}`
                        : ""}
                    </button>
                    {!Object.keys(link.terms).length ? (
                      <small>{c.termsMissing}</small>
                    ) : null}
                  </td>
                  <td data-label={c.clicks}>{number(link.clicks)}</td>
                  <td data-label={c.sales}>{number(link.confirmedSales)}</td>
                  <td data-label={c.commission}>{money(link.commission)}</td>
                  <td data-label={c.actions}>
                    <details
                      className="pl-overflow"
                      onKeyDown={(e) => {
                        if (e.key === "Escape") {
                          e.currentTarget.open = false;
                          e.currentTarget.querySelector("summary")?.focus();
                          e.stopPropagation();
                        }
                      }}
                      onBlur={(e) => {
                        if (!e.currentTarget.contains(e.relatedTarget))
                          e.currentTarget.open = false;
                      }}
                    >
                      <summary
                        className="pl-button pl-icon"
                        aria-label={c.linkActions + ": " + link.code}
                      >
                        <MoreIcon />
                      </summary>
                      <div className="pl-menu">
                        <Link href={performanceHref(group.id, link.id)}>
                          {c.performance}
                        </Link>
                        <button
                          onClick={(e) => {
                            e.currentTarget.closest("details")!.open = false;
                            onCopy(link);
                          }}
                        >
                          {c.copy}
                        </button>
                        <button
                          onClick={(e) => {
                            e.currentTarget.closest("details")!.open = false;
                            inspect(link, "terms");
                          }}
                        >
                          {c.termsView}
                        </button>
                        {link.status === "ACTIVE" ? (
                          <button
                            className="pl-danger-text"
                            disabled={working}
                            onClick={(e) => {
                              e.currentTarget.closest("details")!.open = false;
                              inspect(link, "disable");
                            }}
                          >
                            {c.disable}
                          </button>
                        ) : !link.restoreReason ? (
                          <button
                            disabled={working}
                            onClick={(e) => {
                              e.currentTarget.closest("details")!.open = false;
                              restore(link);
                            }}
                          >
                            {c.restore}
                          </button>
                        ) : (
                          <p>{c.reasons[link.restoreReason]}</p>
                        )}
                      </div>
                    </details>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {loadError ? (
            <p role="alert" className="pl-error">
              {c.retry}
            </p>
          ) : null}
          <WorkspacePagination
            copy={c}
            page={shown.linkPage}
            pageCount={shown.linkPageCount}
            onChange={(page) => {
              if (!loading) void load(page);
            }}
          />
        </div>
      ) : null}
    </article>
  );
}

function AcceptedTerms({
  link,
  copy: c,
  locale,
}: {
  link: ProductLinkRow;
  copy: ProductWorkspaceCopy;
  locale: string;
}) {
  const fields: [string, unknown][] = [
    [c.acceptedRate, offerRate(link.rateType, link.rate, locale)],
    [c.acceptedAt, insightDate(link.acceptedAt, locale)],
    [c.version, link.terms.version],
    [c.cookie, link.terms.cookieWindowDays],
    [c.channels, link.terms.allowedChannels],
    [c.prohibited, link.terms.prohibitedPromotionMethods],
    [c.regions, link.terms.availableRegions],
    [c.payoutTiming, link.terms.payoutTiming],
    [c.coupon, link.terms.couponPolicy],
    [c.returns, link.terms.returnPolicy],
    [c.content, link.terms.contentRequirements],
    [c.special, link.terms.specialTerms],
    [c.starts, link.terms.offerStartsAt],
    [c.ends, link.terms.offerEndsAt],
  ];
  return (
    <>
      {!Object.keys(link.terms).length ? <p>{c.termsMissing}</p> : null}
      <dl className="pl-accepted-terms">
        {fields
          .filter(
            ([, value]) =>
              value !== undefined &&
              value !== null &&
              value !== "" &&
              (!Array.isArray(value) || value.length),
          )
          .map(([label, value]) => (
            <div key={label}>
              <dt>{label}</dt>
              <dd>{Array.isArray(value) ? value.join(", ") : String(value)}</dd>
            </div>
          ))}
      </dl>
    </>
  );
}
