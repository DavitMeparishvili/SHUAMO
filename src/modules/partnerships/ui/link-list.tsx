import Decimal from "decimal.js";
import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import type { ProductTypeValue } from "@/src/modules/catalog";
import type { LinkPerformanceRow } from "@/src/modules/conversions";
import {
  Button,
  CopyField,
  EmptyState,
  Icon,
  MoneyAmount,
  StatusPill,
} from "@/src/modules/design-system";
import { Money } from "@/src/modules/shared";
import { resolveLink, type DisableReason } from "../domain/disable-chain";
import { CopyOfferLink } from "./discovery-card-actions";

export function LinkList({
  locale,
  links,
  performance,
  baseUrl,
  copy,
  brandControls,
  variant = "default",
  trailing,
}: {
  variant?: "default" | "discovery";
  /** Extra per-link control (e.g. "Add to shop") in the card actions area. */
  trailing?: (link: { productId: string; active: boolean }) => ReactNode;
  locale: string;
  brandControls?: {
    creator: string;
    enable: string;
    disable: string;
    setStatusAction: (
      linkId: string,
      status: "ACTIVE" | "DISABLED",
    ) => void | Promise<void>;
  };
  links: readonly {
    id: string;
    code: string;
    commissionType: "PERCENT" | "FIXED";
    commissionValue: { toString(): string };
    status: "ACTIVE" | "DISABLED";
    acceptedTerms?: unknown;
    termsAcceptedAt?: Date;
    product: {
      id: string;
      title: string;
      sku: string;
      productType: ProductTypeValue;
      imageUrls: readonly string[];
      status: "ACTIVE" | "ARCHIVED";
      brand: {
        id: string;
        name: string;
        status: "PENDING" | "APPROVED" | "SUSPENDED";
      };
    };
    creator: {
      displayName?: string;
      partnerships: readonly {
        brandId: string;
        status: "PENDING" | "APPROVED" | "REJECTED";
      }[];
    };
  }[];
  performance?: ReadonlyMap<string, LinkPerformanceRow>;
  baseUrl: string;
  copy: {
    emptyTitle: string;
    emptyBody: string;
    active: string;
    link: string;
    rate: string;
    status: string;
    viewProduct: string;
    imageFallback: string;
    acceptedTerms: string;
    copy: string;
    copied: string;
    copyError: string;
    productTypes: Record<ProductTypeValue, string>;
    reasons: Record<DisableReason, string>;
    last30Days: string;
    clicks: string;
    converted: string;
    orders: string;
    confirmed: string;
    noActivity: string;
    viewPerformance: string;
  };
}) {
  if (links.length === 0)
    return <EmptyState title={copy.emptyTitle} body={copy.emptyBody} />;
  return (
    <div
      className={
        variant === "discovery"
          ? "discovery-grid"
          : "grid gap-5 sm:grid-cols-2 xl:grid-cols-3"
      }
    >
      {links.map((link, index) => {
        const metrics = performance?.get(link.id);
        const partnership = link.creator.partnerships.find(
          ({ brandId }) => brandId === link.product.brand.id,
        );
        const resolution = resolveLink({
          brandStatus: link.product.brand.status,
          partnershipStatus: partnership?.status,
          productStatus: link.product.status,
          linkStatus: link.status,
        });
        const extra = trailing?.({
          productId: link.product.id,
          active: resolution.active,
        });
        const rate =
          link.commissionType === "PERCENT"
            ? `${new Decimal(link.commissionValue.toString()).times(100).toString()}%`
            : `${new Decimal(link.commissionValue.toString()).toFixed(2)} ₾`;
        const acceptedVersion =
          typeof link.acceptedTerms === "object" &&
          link.acceptedTerms !== null &&
          "version" in link.acceptedTerms &&
          typeof link.acceptedTerms.version === "number"
            ? link.acceptedTerms.version
            : 1;
        if (variant === "discovery") {
          const href = `/${locale}/${brandControls ? "brand" : "creator"}/products/${link.product.id}`;
          const url = `${baseUrl.replace(/\/$/, "")}/r/${link.code}`;
          const hasActivity =
            metrics &&
            (metrics.clicks > 0 ||
              metrics.orders > 0 ||
              metrics.confirmed !== "0.00");
          return (
            <article className="discovery-card tracking-card" key={link.id}>
              <Link
                className="discovery-product-image"
                href={href}
                aria-label={link.product.title}
                tabIndex={-1}
              >
                {link.product.imageUrls[0] ? (
                  <Image
                    alt=""
                    className="object-cover"
                    fill
                    loading={index === 0 ? "eager" : "lazy"}
                    sizes="(max-width: 639px) 108px, (max-width: 1050px) 40vw, 25vw"
                    src={link.product.imageUrls[0]}
                    unoptimized
                  />
                ) : (
                  <span className="discovery-image-fallback">
                    <Icon name="box" />
                    <span>{copy.imageFallback}</span>
                  </span>
                )}
              </Link>
              <div className="discovery-card-body">
                <p className="discovery-brand">
                  {brandControls
                    ? `${brandControls.creator}: ${link.creator.displayName}`
                    : link.product.brand.name}
                </p>
                <h2>
                  <Link href={href}>{link.product.title}</Link>
                </h2>
                <dl className="discovery-terms tracking-terms">
                  <div className="tracking-status">
                    <dt>{copy.status}</dt>
                    <dd data-active={resolution.active}>
                      {resolution.active
                        ? copy.active
                        : copy.reasons[resolution.reason]}
                    </dd>
                  </div>
                  <div className="discovery-commission">
                    <dt>{copy.rate}</dt>
                    <dd>{rate}</dd>
                  </div>
                </dl>
                <p className="discovery-cookie">
                  {copy.acceptedTerms.replace(
                    "{version}",
                    String(acceptedVersion),
                  )}
                </p>
                <div
                  className="discovery-active-link tracking-copy-row"
                  data-active={resolution.active}
                >
                  <code title={url} aria-label={`${copy.link}: ${url}`}>
                    {url.replace(/^https?:\/\//, "")}
                  </code>
                  <CopyOfferLink
                    url={url}
                    label={copy.copy}
                    copiedLabel={copy.copied}
                    errorLabel={copy.copyError}
                  />
                </div>
              </div>
              <div className="tracking-performance">
                <p className="tracking-period">{copy.last30Days}</p>
                {hasActivity ? (
                  <dl className="tracking-metrics">
                    <div>
                      <dt>{copy.clicks}</dt>
                      <dd>{metrics.clicks}</dd>
                    </div>
                    <div>
                      <dt>{copy.converted}</dt>
                      <dd>{metrics.convertedClicks}</dd>
                    </div>
                    <div>
                      <dt>{copy.orders}</dt>
                      <dd>{metrics.orders}</dd>
                    </div>
                    <div>
                      <dt>{copy.confirmed}</dt>
                      <dd className="tracking-earned">
                        {new Decimal(metrics.confirmed).toFixed(2)} ₾
                      </dd>
                    </div>
                  </dl>
                ) : (
                  <p className="tracking-no-activity">{copy.noActivity}</p>
                )}
                <Link
                  className="discovery-primary"
                  href={`/${locale}/${brandControls ? "brand/performance" : "creator/earnings"}?link=${link.id}&view=links#breakdown`}
                >
                  {copy.viewPerformance}
                </Link>
                {extra ? (
                  <div className="tracking-shop-action">{extra}</div>
                ) : null}
              </div>
              {brandControls ? (
                <form
                  className="management-link-action"
                  action={brandControls.setStatusAction.bind(
                    null,
                    link.id,
                    link.status === "ACTIVE" ? "DISABLED" : "ACTIVE",
                  )}
                >
                  <Button
                    type="submit"
                    variant={link.status === "ACTIVE" ? "danger" : "outline"}
                  >
                    {link.status === "ACTIVE"
                      ? brandControls.disable
                      : brandControls.enable}
                  </Button>
                </form>
              ) : null}
            </article>
          );
        }
        return (
          <article
            className="group grid min-w-0 grid-cols-[minmax(0,1fr)] overflow-hidden rounded-md border border-slate-200 bg-paper transition-[border-color,box-shadow] duration-200 hover:border-signal hover:shadow-sm"
            key={link.id}
          >
            <Link
              className="block text-inherit no-underline focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-focus"
              href={`/${locale}/${brandControls ? "brand" : "creator"}/products/${link.product.id}`}
            >
              <div className="relative aspect-[4/3] overflow-hidden bg-slate-100">
                {link.product.imageUrls[0] ? (
                  <Image
                    alt=""
                    className="object-cover transition-transform duration-300 ease-out group-hover:scale-[1.025]"
                    fill
                    sizes="(max-width: 639px) 100vw, (max-width: 1279px) 50vw, 33vw"
                    src={link.product.imageUrls[0]}
                    unoptimized
                  />
                ) : (
                  <div className="grid size-full content-between bg-slate-100 p-5">
                    <span className="type-caption font-semibold text-slate-600">
                      {link.product.brand.name}
                    </span>
                    <div className="grid justify-items-center gap-3 text-center">
                      <span
                        aria-hidden="true"
                        className="grid size-14 place-items-center rounded-full border border-slate-300 type-h3 text-slate-600"
                      >
                        {link.product.brand.name.slice(0, 2).toUpperCase()}
                      </span>
                      <span className="type-small font-semibold text-ink">
                        {copy.productTypes[link.product.productType]}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-3 type-caption text-slate-600">
                      <span>{copy.imageFallback}</span>
                      <code className="min-w-0 truncate type-mono">
                        {link.product.sku}
                      </code>
                    </div>
                  </div>
                )}
              </div>
              <div className="grid gap-4 p-5">
                <div>
                  <div className="flex items-start justify-between gap-3 type-caption text-slate-600">
                    <span>{link.product.brand.name}</span>
                    <span className="text-right">
                      {copy.productTypes[link.product.productType]}
                    </span>
                  </div>
                  <h2 className="mb-0 mt-2 line-clamp-2 type-h3 text-ink transition-colors group-hover:text-signal">
                    {link.product.title}
                  </h2>
                  {brandControls ? (
                    <p className="mb-0 mt-2 break-words type-small text-slate-600">
                      {brandControls.creator}: {link.creator.displayName}
                    </p>
                  ) : null}
                </div>
                <dl className="m-0 grid grid-cols-2 gap-4">
                  <div>
                    <dt className="type-caption text-slate-600">{copy.rate}</dt>
                    <dd className="m-0 mt-1 type-mono font-semibold text-ink">
                      {rate}
                    </dd>
                  </div>
                  <div>
                    <dt className="type-caption text-slate-600">
                      {copy.status}
                    </dt>
                    <dd className="m-0 mt-1">
                      <StatusPill
                        state={resolution.active ? "active" : "disabled"}
                        label={
                          resolution.active
                            ? copy.active
                            : copy.reasons[resolution.reason]
                        }
                      />
                    </dd>
                  </div>
                </dl>
                <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 border-t border-slate-200 pt-3">
                  <p className="m-0 type-caption text-slate-600">
                    {copy.acceptedTerms.replace(
                      "{version}",
                      String(acceptedVersion),
                    )}
                  </p>
                  <span className="inline-flex min-h-11 shrink-0 items-center gap-2 type-small font-semibold text-signal">
                    {copy.viewProduct} <span aria-hidden="true">→</span>
                  </span>
                </div>
              </div>
            </Link>
            <div className="min-w-0 border-t border-slate-200 p-4">
              <CopyField
                value={`${baseUrl.replace(/\/$/, "")}/r/${link.code}`}
                label={copy.link}
                copyLabel={copy.copy}
                copiedLabel={copy.copied}
                copyErrorLabel={copy.copyError}
                compact
                truncateValue
              />
            </div>
            <div className="grid gap-3 border-t border-slate-200 bg-slate-50 p-4">
              <p className="m-0 type-caption font-semibold text-slate-600">
                {copy.last30Days}
              </p>
              {metrics &&
              (metrics.clicks > 0 ||
                metrics.orders > 0 ||
                metrics.confirmed !== "0.00") ? (
                <div className="flex flex-wrap items-center gap-x-4 gap-y-2 type-small text-ink">
                  <span>
                    <span className="type-mono font-semibold">
                      {metrics.clicks}
                    </span>{" "}
                    {copy.clicks}
                  </span>
                  <span>
                    <span className="type-mono font-semibold">
                      {metrics.convertedClicks}
                    </span>{" "}
                    {copy.converted}
                  </span>
                  <span>
                    <span className="type-mono font-semibold">
                      {metrics.orders}
                    </span>{" "}
                    {copy.orders}
                  </span>
                  <span>
                    <MoneyAmount
                      size="sm"
                      tone="settled"
                      value={Money.of(metrics.confirmed)}
                    />{" "}
                    {copy.confirmed}
                  </span>
                </div>
              ) : (
                <p className="m-0 type-small text-slate-600">
                  {copy.noActivity}
                </p>
              )}
              <Link
                className="inline-flex min-h-11 w-fit items-center type-small font-semibold text-signal"
                href={`/${locale}/${brandControls ? "brand/performance" : "creator/earnings"}?link=${link.id}&view=links#breakdown`}
              >
                {copy.viewPerformance}
              </Link>
              {extra ? (
                <div className="tracking-shop-action">{extra}</div>
              ) : null}
            </div>
            {brandControls ? (
              <form
                className="border-t border-slate-200 p-4"
                action={brandControls.setStatusAction.bind(
                  null,
                  link.id,
                  link.status === "ACTIVE" ? "DISABLED" : "ACTIVE",
                )}
              >
                <Button
                  type="submit"
                  variant={link.status === "ACTIVE" ? "danger" : "outline"}
                >
                  {link.status === "ACTIVE"
                    ? brandControls.disable
                    : brandControls.enable}
                </Button>
              </form>
            ) : null}
          </article>
        );
      })}
    </div>
  );
}

type ResolvedLinkRow = {
  id: string;
  code: string;
  commissionType: "PERCENT" | "FIXED";
  commissionValue: { toString(): string };
  status: "ACTIVE" | "DISABLED";
  product: {
    title: string;
    status: "ACTIVE" | "ARCHIVED";
    commissionType: "PERCENT" | "FIXED";
    commissionValue: { toString(): string };
    brand: {
      id: string;
      name: string;
      status: "PENDING" | "APPROVED" | "SUSPENDED";
    };
  };
  creator: {
    displayName: string;
    partnerships: readonly {
      brandId: string;
      status: "PENDING" | "APPROVED" | "REJECTED";
    }[];
  };
};

function resolutionFor(link: ResolvedLinkRow) {
  const partnership = link.creator.partnerships.find(
    ({ brandId }) => brandId === link.product.brand.id,
  );
  return resolveLink({
    brandStatus: link.product.brand.status,
    partnershipStatus: partnership?.status,
    productStatus: link.product.status,
    linkStatus: link.status,
  });
}

export function BrandLinkList({
  locale,
  links,
  performance,
  baseUrl,
  setStatusAction,
  copy,
  showProduct = true,
}: {
  locale: string;
  links: readonly ResolvedLinkRow[];
  performance?: ReadonlyMap<string, LinkPerformanceRow>;
  baseUrl: string;
  setStatusAction: (
    linkId: string,
    status: "ACTIVE" | "DISABLED",
  ) => void | Promise<void>;
  copy: {
    emptyTitle: string;
    emptyBody: string;
    active: string;
    link: string;
    creator: string;
    rate: string;
    enable: string;
    disable: string;
    copy: string;
    copied: string;
    copyError: string;
    reasons: Record<DisableReason, string>;
    last30Days: string;
    clicks: string;
    converted: string;
    orders: string;
    confirmed: string;
    noActivity: string;
    viewPerformance: string;
  };
  showProduct?: boolean;
}) {
  if (links.length === 0) {
    return <EmptyState title={copy.emptyTitle} body={copy.emptyBody} />;
  }

  return (
    <div className="grid gap-4">
      {links.map((link) => {
        const metrics = performance?.get(link.id);
        const resolution = resolutionFor(link);
        const nextStatus = link.status === "ACTIVE" ? "DISABLED" : "ACTIVE";
        const rate =
          link.commissionType === "PERCENT"
            ? `${new Decimal(link.commissionValue.toString()).times(100).toString()}%`
            : `${link.commissionValue.toString()} ₾`;
        return (
          <article
            className="grid gap-5 rounded-md border border-slate-200 bg-paper p-5 lg:grid-cols-[minmax(0,1fr)_minmax(260px,1fr)_minmax(220px,auto)_auto] lg:items-center"
            key={link.id}
          >
            <div className="grid min-w-0 gap-2">
              {showProduct ? (
                <>
                  <h2 className="m-0 type-h3 text-ink">{link.product.title}</h2>
                  <p className="m-0 break-words type-small text-slate-600">
                    {copy.creator}: {link.creator.displayName}
                  </p>
                </>
              ) : (
                <h3 className="m-0 break-words type-h3 text-ink">
                  <span className="sr-only">{copy.creator}: </span>
                  {link.creator.displayName}
                </h3>
              )}
              <p className="m-0 type-small text-slate-600">
                {copy.rate}: <code className="type-mono text-ink">{rate}</code>
              </p>
              <div>
                <StatusPill
                  state={resolution.active ? "active" : "disabled"}
                  label={
                    resolution.active
                      ? copy.active
                      : copy.reasons[resolution.reason]
                  }
                />
              </div>
            </div>
            <CopyField
              value={`${baseUrl.replace(/\/$/, "")}/r/${link.code}`}
              label={copy.link}
              copyLabel={copy.copy}
              copiedLabel={copy.copied}
              copyErrorLabel={copy.copyError}
            />
            <div className="grid gap-2">
              <p className="m-0 type-caption font-semibold text-slate-600">
                {copy.last30Days}
              </p>
              {metrics &&
              (metrics.clicks > 0 ||
                metrics.orders > 0 ||
                metrics.confirmed !== "0.00") ? (
                <p className="m-0 type-small text-ink">
                  <span className="type-mono font-semibold">
                    {metrics.clicks}
                  </span>{" "}
                  {copy.clicks} ·{" "}
                  <span className="type-mono font-semibold">
                    {metrics.convertedClicks}
                  </span>{" "}
                  {copy.converted} ·{" "}
                  <span className="type-mono font-semibold">
                    {metrics.orders}
                  </span>{" "}
                  {copy.orders} ·{" "}
                  <MoneyAmount
                    size="sm"
                    tone="settled"
                    value={Money.of(metrics.confirmed)}
                  />
                </p>
              ) : (
                <p className="m-0 type-small text-slate-600">
                  {copy.noActivity}
                </p>
              )}
              <Link
                className="inline-flex min-h-11 w-fit items-center type-small font-semibold text-signal"
                href={`/${locale}/brand/performance?link=${link.id}&view=links#breakdown`}
              >
                {copy.viewPerformance}
              </Link>
            </div>
            <form action={setStatusAction.bind(null, link.id, nextStatus)}>
              <Button
                type="submit"
                variant={nextStatus === "DISABLED" ? "danger" : "outline"}
              >
                {nextStatus === "DISABLED" ? copy.disable : copy.enable}
              </Button>
            </form>
          </article>
        );
      })}
    </div>
  );
}
