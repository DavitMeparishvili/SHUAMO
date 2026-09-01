import Decimal from "decimal.js";
import {
  Button,
  CopyField,
  EmptyState,
  StatusPill,
} from "@/src/modules/design-system";
import { resolveLink, type DisableReason } from "../domain/disable-chain";

export function LinkList({
  links,
  baseUrl,
  copy,
}: {
  links: readonly {
    id: string;
    code: string;
    commissionType: "PERCENT" | "FIXED";
    commissionValue: { toString(): string };
    status: "ACTIVE" | "DISABLED";
    product: {
      title: string;
      status: "ACTIVE" | "ARCHIVED";
      brand: {
        id: string;
        name: string;
        status: "PENDING" | "APPROVED" | "SUSPENDED";
      };
    };
    creator: {
      partnerships: readonly {
        brandId: string;
        status: "PENDING" | "APPROVED" | "REJECTED";
      }[];
    };
  }[];
  baseUrl: string;
  copy: {
    emptyTitle: string;
    emptyBody: string;
    active: string;
    link: string;
    rate: string;
    copy: string;
    copied: string;
    copyError: string;
    reasons: Record<DisableReason, string>;
  };
}) {
  if (links.length === 0)
    return <EmptyState title={copy.emptyTitle} body={copy.emptyBody} />;
  return (
    <div className="grid gap-4">
      {links.map((link) => {
        const partnership = link.creator.partnerships.find(
          ({ brandId }) => brandId === link.product.brand.id,
        );
        const resolution = resolveLink({
          brandStatus: link.product.brand.status,
          partnershipStatus: partnership?.status,
          productStatus: link.product.status,
          linkStatus: link.status,
        });
        const rate =
          link.commissionType === "PERCENT"
            ? `${new Decimal(link.commissionValue.toString()).times(100).toString()}%`
            : `${link.commissionValue.toString()} ₾`;
        return (
          <article
            className="grid gap-5 rounded-md border border-slate-200 bg-paper p-5 sm:grid-cols-[minmax(0,1fr)_minmax(280px,1fr)]"
            key={link.id}
          >
            <div className="grid content-start gap-2">
              <p className="m-0 type-small font-semibold text-slate-600">
                {link.product.brand.name}
              </p>
              <h2 className="m-0 type-h3 text-ink">{link.product.title}</h2>
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
  links,
  baseUrl,
  setStatusAction,
  copy,
}: {
  links: readonly ResolvedLinkRow[];
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
    enable: string;
    disable: string;
    copy: string;
    copied: string;
    copyError: string;
    reasons: Record<DisableReason, string>;
  };
}) {
  if (links.length === 0) {
    return <EmptyState title={copy.emptyTitle} body={copy.emptyBody} />;
  }

  return (
    <div className="grid gap-4">
      {links.map((link) => {
        const resolution = resolutionFor(link);
        const nextStatus = link.status === "ACTIVE" ? "DISABLED" : "ACTIVE";
        return (
          <article
            className="grid gap-5 rounded-md border border-slate-200 bg-paper p-5 lg:grid-cols-[minmax(0,1fr)_minmax(280px,1fr)_auto] lg:items-center"
            key={link.id}
          >
            <div className="grid min-w-0 gap-2">
              <h2 className="m-0 type-h3 text-ink">{link.product.title}</h2>
              <p className="m-0 break-words type-small text-slate-600">
                {copy.creator}: {link.creator.displayName}
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
