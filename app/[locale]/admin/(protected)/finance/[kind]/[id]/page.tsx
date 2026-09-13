import { notFound } from "next/navigation";
import { currentViewer } from "@/src/modules/identity";
import { isLocale } from "@/src/modules/localization";
import { AccountFinance, tbilisiToday } from "@/src/modules/finance";
import { readAdminFinance } from "@/src/infrastructure/finance-services";
import {
  recordPaymentAction,
  reversePaymentAction,
  issueInvoiceAction,
  previewInvoiceAction,
} from "../../actions";
export default async function AccountPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string; kind: string; id: string }>;
  searchParams: Promise<{
    page?: string;
    invoicePage?: string;
    record?: string;
  }>;
}) {
  const [{ locale, kind, id }, query] = await Promise.all([
    params,
    searchParams,
  ]);
  if (!isLocale(locale) || (kind !== "brand" && kind !== "creator")) notFound();
  const result = await readAdminFinance(
    await currentViewer(),
    { kind, id },
    {
      page: Number(query.page || 1),
      invoicePage: Number(query.invoicePage || 1),
      ...(query.record ? { record: query.record } : {}),
    },
  );
  if (!result.ok) notFound();
  return (
    <AccountFinance
      account={result.value}
      locale={locale}
      admin
      requestKey={crypto.randomUUID()}
      today={tbilisiToday()}
      record={recordPaymentAction}
      reverse={reversePaymentAction}
      issue={issueInvoiceAction}
      preview={previewInvoiceAction}
    />
  );
}
