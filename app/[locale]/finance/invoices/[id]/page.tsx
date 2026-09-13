import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { currentViewer, requireAdmin } from "@/src/modules/identity";
import { isLocale } from "@/src/modules/localization";
import {
  InvoiceDocument,
  PrintInvoiceButton,
  BalanceSummary,
} from "@/src/modules/finance";
import {
  readFinanceInvoice,
  readAdminFinance,
  readOwnFinance,
} from "@/src/infrastructure/finance-services";
import "@/app/finance.css";
export default async function InvoicePage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  if (!isLocale(locale)) notFound();
  const viewer = await currentViewer();
  if (viewer.kind === "anonymous") redirect(`/${locale}/sign-in`);
  const result = await readFinanceInvoice(viewer, id);
  if (!result.ok) notFound();
  const invoice = result.value,
    admin = requireAdmin(viewer).ok;
  const live = await (admin
    ? readAdminFinance(viewer, invoice.party)
    : readOwnFinance(viewer));
  return (
    <div className="finance-surface workspace-content finance-issued">
      <nav className="finance-heading finance-no-print">
        <Link
          href={`/${locale}/${admin ? `admin/finance/${invoice.party.kind}/${invoice.party.id}` : `${invoice.party.kind}/finance`}`}
        >
          {locale === "ka" ? "ფინანსებზე დაბრუნება" : "Back to finance"}
        </Link>
        <div className="finance-actions">
          <a
            className="finance-button"
            href={`/api/finance/invoices/${id}/download?locale=${locale}`}
          >
            {locale === "ka" ? "HTML-ის ჩამოტვირთვა" : "Download HTML"}
          </a>
          <PrintInvoiceButton locale={locale} />
        </div>
      </nav>
      <InvoiceDocument invoice={invoice} locale={locale} />
      {live.ok && (
        <aside className="finance-no-print">
          <h2>
            {locale === "en"
              ? "Current account balance"
              : "\u10d0\u10dc\u10d2\u10d0\u10e0\u10d8\u10e8\u10d8\u10e1 \u10db\u10d8\u10db\u10d3\u10d8\u10dc\u10d0\u10e0\u10d4 \u10d1\u10d0\u10da\u10d0\u10dc\u10e1\u10d8"}
          </h2>
          <BalanceSummary account={live.value} locale={locale} />
        </aside>
      )}
    </div>
  );
}
