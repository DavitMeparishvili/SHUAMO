import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Banner } from "@/src/modules/design-system";
import { listProductsForBrand, ProductList } from "@/src/modules/catalog";
import {
  currentViewer,
  requireBrand,
  WorkspaceShell,
} from "@/src/modules/identity";
import { getMessages, isLocale, t } from "@/src/modules/localization";

export default async function ProductsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{
    created?: string;
    archived?: string;
    status?: "active" | "archived";
  }>;
}) {
  const [{ locale }, query] = await Promise.all([params, searchParams]);
  if (!isLocale(locale)) notFound();
  const allowed = requireBrand(await currentViewer());
  if (!allowed.ok) redirect(`/${locale}/sign-in`);
  const [messages, products] = await Promise.all([
    Promise.resolve(getMessages(locale)),
    listProductsForBrand(allowed.value.brandId),
  ]);
  const filteredProducts =
    query.status === "active"
      ? products.filter(({ status }) => status === "ACTIVE")
      : query.status === "archived"
        ? products.filter(({ status }) => status === "ARCHIVED")
        : products;
  return (
    <WorkspaceShell
      name={allowed.value.brandName}
      title={t(messages, "catalog.title")}
      intro={t(messages, "catalog.intro")}
    >
      <div className="grid gap-8">
        {query.created !== undefined ? (
          <Banner
            tone="info"
            title={t(messages, "catalog.createdTitle")}
            body={t(messages, "catalog.createdBody").replace(
              "{count}",
              query.created,
            )}
          />
        ) : null}
        {query.archived ? (
          <Banner
            tone="info"
            title={t(messages, "catalog.archivedTitle")}
            body={t(messages, "catalog.archivedBody")}
          />
        ) : null}
        <div>
          <Link
            className="inline-flex min-h-11 items-center rounded-pill bg-signal px-5 type-small font-semibold text-paper hover:bg-signal-hover"
            href={`/${locale}/brand/products/new`}
          >
            {t(messages, "catalog.new")}
          </Link>
        </div>
        <nav
          aria-label={t(messages, "catalog.filter.label")}
          className="flex flex-wrap gap-2"
        >
          {(
            [
              ["", "catalog.filter.all"],
              ["active", "catalog.filter.active"],
              ["archived", "catalog.filter.archived"],
            ] as const
          ).map(([status, key]) => (
            <Link
              aria-current={
                (query.status ?? "") === status ? "page" : undefined
              }
              className={`rounded-pill border px-4 py-2 type-small font-semibold ${(query.status ?? "") === status ? "border-signal bg-signal-50 text-signal-700" : "border-slate-300 bg-paper text-slate-700"}`}
              href={status ? `?status=${status}` : `/${locale}/brand/products`}
              key={status}
            >
              {t(messages, key)}
            </Link>
          ))}
        </nav>
        <ProductList
          locale={locale}
          products={filteredProducts}
          copy={{
            caption: t(messages, "catalog.table.caption"),
            sku: t(messages, "catalog.field.sku"),
            title: t(messages, "catalog.field.title"),
            price: t(messages, "catalog.field.price"),
            rate: t(messages, "catalog.field.rate"),
            status: t(messages, "catalog.field.status"),
            links: t(messages, "catalog.field.links"),
            active: t(messages, "catalog.status.active"),
            archived: t(messages, "catalog.status.archived"),
            emptyTitle: t(messages, "catalog.empty.title"),
            emptyBody: t(messages, "catalog.empty.body"),
          }}
        />
      </div>
    </WorkspaceShell>
  );
}
