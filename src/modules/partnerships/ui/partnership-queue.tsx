import { Button, EmptyState, StatusPill } from "@/src/modules/design-system";

export function PartnershipQueue({
  partnerships,
  decideAction,
  copy,
}: {
  partnerships: readonly {
    id: string;
    status: "PENDING" | "APPROVED" | "REJECTED";
    creator: {
      displayName: string;
      profile?: { slug: string | null; status: string } | null;
      profileHref?: string;
    };
  }[];
  decideAction: (
    partnershipId: string,
    decision: "APPROVE" | "REJECT",
  ) => void | Promise<void>;
  copy: Record<
    | "emptyTitle"
    | "emptyBody"
    | "approve"
    | "reject"
    | "pending"
    | "approved"
    | "rejected"
    | "approvalNotice"
    | "remove"
    | "removeNotice"
    | "restore",
    string
  >;
}) {
  if (partnerships.length === 0)
    return <EmptyState title={copy.emptyTitle} body={copy.emptyBody} />;
  return (
    <div className="grid gap-3">
      {partnerships.map((partnership) => (
        <article
          className="grid gap-4 rounded-md border border-slate-200 bg-paper p-5 sm:grid-cols-[1fr_auto] sm:items-center"
          key={partnership.id}
        >
          <div className="grid gap-2">
            <h2 className="m-0 type-h3 text-ink">
              {partnership.creator.profileHref ? (
                <a
                  className="text-inherit"
                  href={partnership.creator.profileHref}
                >
                  {partnership.creator.displayName}
                </a>
              ) : (
                partnership.creator.displayName
              )}
            </h2>
            <div>
              <StatusPill
                state={
                  partnership.status === "PENDING"
                    ? "pending"
                    : partnership.status === "APPROVED"
                      ? "active"
                      : "cancelled"
                }
                label={
                  partnership.status === "PENDING"
                    ? copy.pending
                    : partnership.status === "APPROVED"
                      ? copy.approved
                      : copy.rejected
                }
              />
            </div>
            {partnership.status === "PENDING" ? (
              <p className="m-0 type-small text-slate-600">
                {copy.approvalNotice}
              </p>
            ) : partnership.status === "APPROVED" ? (
              <p className="m-0 max-w-[65ch] type-small text-slate-600">
                {copy.removeNotice}
              </p>
            ) : null}
          </div>
          {partnership.status === "PENDING" ? (
            <div className="flex flex-wrap gap-2">
              <form action={decideAction.bind(null, partnership.id, "APPROVE")}>
                <Button type="submit">{copy.approve}</Button>
              </form>
              <form action={decideAction.bind(null, partnership.id, "REJECT")}>
                <Button type="submit" variant="outline">
                  {copy.reject}
                </Button>
              </form>
            </div>
          ) : partnership.status === "APPROVED" ? (
            <form action={decideAction.bind(null, partnership.id, "REJECT")}>
              <Button type="submit" variant="danger">
                {copy.remove}
              </Button>
            </form>
          ) : partnership.status === "REJECTED" ? (
            <form action={decideAction.bind(null, partnership.id, "APPROVE")}>
              <Button type="submit" variant="outline">
                {copy.restore}
              </Button>
            </form>
          ) : null}
        </article>
      ))}
    </div>
  );
}

export function CreatorBrandList({
  brands,
  applyAction,
  copy,
}: {
  brands: readonly {
    id: string;
    name: string;
    status?: "PENDING" | "APPROVED" | "REJECTED" | undefined;
    profile?: { slug: string | null; status: string } | null;
    profileHref?: string;
  }[];
  applyAction: (brandId: string) => void | Promise<void>;
  copy: Record<
    "emptyTitle" | "emptyBody" | "apply" | "pending" | "approved" | "rejected",
    string
  >;
}) {
  if (brands.length === 0)
    return <EmptyState title={copy.emptyTitle} body={copy.emptyBody} />;
  return (
    <div className="grid gap-3">
      {brands.map((brand) => (
        <article
          className="flex flex-col gap-4 rounded-md border border-slate-200 bg-paper p-5 sm:flex-row sm:items-center sm:justify-between"
          key={brand.id}
        >
          <div className="grid gap-2">
            <h2 className="m-0 type-h3 text-ink">
              {brand.profileHref ? (
                <a className="text-inherit" href={brand.profileHref}>
                  {brand.name}
                </a>
              ) : (
                brand.name
              )}
            </h2>
            {brand.status ? (
              <div>
                <StatusPill
                  state={
                    brand.status === "PENDING"
                      ? "pending"
                      : brand.status === "APPROVED"
                        ? "active"
                        : "cancelled"
                  }
                  label={
                    brand.status === "PENDING"
                      ? copy.pending
                      : brand.status === "APPROVED"
                        ? copy.approved
                        : copy.rejected
                  }
                />
              </div>
            ) : null}
          </div>
          {!brand.status ? (
            <form action={applyAction.bind(null, brand.id)}>
              <Button type="submit">{copy.apply}</Button>
            </form>
          ) : null}
        </article>
      ))}
    </div>
  );
}
