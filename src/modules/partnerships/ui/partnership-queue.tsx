import { Button, EmptyState, StatusPill } from "@/src/modules/design-system";

export function PartnershipQueue({
  partnerships,
  decideAction,
  copy,
  locale = "en",
}: {
  locale?: string;
  partnerships: readonly {
    id: string;
    status: "PENDING" | "APPROVED" | "REJECTED";
    submittedAt?: string;
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
            <details className="partnership-review">
              <summary>
                {locale === "ka" ? "განაცხადის განხილვა" : "Review application"}
              </summary>
              <div className="partnership-review-content">
                <h3>{partnership.creator.displayName}</h3>
                {partnership.submittedAt ? (
                  <p>
                    {locale === "ka" ? "განაცხადის თარიღი" : "Submitted"}:{" "}
                    {partnership.submittedAt}
                  </p>
                ) : null}
                {partnership.creator.profileHref ? (
                  <a href={partnership.creator.profileHref}>
                    {locale === "ka"
                      ? "საჯარო პროფილის გადახედვა"
                      : "Preview public creator profile"}{" "}
                    →
                  </a>
                ) : (
                  <p>
                    {locale === "ka"
                      ? "კრეატორს საჯარო პროფილი ჯერ არ გამოუქვეყნებია."
                      : "This creator has not published a public profile yet."}
                  </p>
                )}
                <p>
                  {locale === "ka"
                    ? "დამტკიცების შემდეგ კრეატორს შეეძლება თქვენი კატალოგის პრომოცია. პროდუქტის პირობებს კრეატორი ცალკე მიიღებს."
                    : "This creator can promote your catalogue after approval. They will accept each product’s terms when creating a link."}
                </p>
                <div className="flex flex-wrap gap-2">
                  <form
                    action={decideAction.bind(null, partnership.id, "APPROVE")}
                  >
                    <Button type="submit">{copy.approve}</Button>
                  </form>
                  <form
                    action={decideAction.bind(null, partnership.id, "REJECT")}
                  >
                    <Button type="submit" variant="outline">
                      {copy.reject}
                    </Button>
                  </form>
                </div>
              </div>
            </details>
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
