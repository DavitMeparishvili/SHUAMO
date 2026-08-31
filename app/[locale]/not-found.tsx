import { DEFAULT_LOCALE } from "@/src/modules/localization/config";
import { getMessages, t } from "@/src/modules/localization/get-messages";

// Rendered inside app/[locale]/layout.tsx, which already supplies the document
// and the <main> landmark, so this contributes only the message.
export default function LocaleNotFound() {
  const messages = getMessages(DEFAULT_LOCALE);

  return (
    <>
      <h1>{t(messages, "notFound.title")}</h1>
      <p>{t(messages, "notFound.body")}</p>
    </>
  );
}
