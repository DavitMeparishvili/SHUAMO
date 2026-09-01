import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getMessages, isLocale, t } from "@/src/modules/localization";
import type { DisableReason } from "@/src/modules/partnerships";
import { OfferEnded } from "@/src/modules/tracking";

const REASONS = new Set<DisableReason>([
  "BRAND_DISABLED",
  "CREATOR_REMOVED",
  "PRODUCT_ARCHIVED",
  "LINK_DISABLED",
]);

function isDisableReason(value: string | undefined): value is DisableReason {
  return value !== undefined && REASONS.has(value as DisableReason);
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  return { title: t(getMessages(locale), "offerEnded.metaTitle") };
}

export default async function OfferEndedPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ reason?: string }>;
}) {
  const [{ locale }, query] = await Promise.all([params, searchParams]);
  if (!isLocale(locale)) notFound();
  const messages = getMessages(locale);
  const reason = isDisableReason(query.reason) ? query.reason : "LINK_DISABLED";

  return (
    <OfferEnded
      title={t(messages, "offerEnded.title")}
      intro={t(messages, "offerEnded.intro")}
      reason={{
        code: reason,
        message: t(messages, `offerEnded.reason.${reason}`),
      }}
      note={t(messages, "offerEnded.note")}
    />
  );
}
