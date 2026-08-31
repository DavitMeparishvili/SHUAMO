import { notFound } from "next/navigation";
import { getMessages, isLocale, t } from "@/src/modules/localization";

export default async function LandingPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();

  const messages = getMessages(locale);

  return (
    <>
      <h1>{t(messages, "app.name")}</h1>
      <p>{t(messages, "app.tagline")}</p>
    </>
  );
}
