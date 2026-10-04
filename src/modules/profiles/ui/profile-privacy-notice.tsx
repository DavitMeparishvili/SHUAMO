import Link from "next/link";
import type { Locale } from "@/src/modules/localization";
import { profileSetupCopy } from "./profile-setup-copy";

export function ProfilePrivacyNotice({
  locale,
  role,
}: {
  locale: Locale;
  role: "brand" | "creator";
}) {
  const copy = profileSetupCopy(locale, role);
  return (
    <aside className="profile-privacy-notice" aria-label={copy.privateTitle}>
      <div>
        <strong>{copy.privateTitle}</strong>
        <p>{copy.privacy}</p>
      </div>
      <Link href={`/${locale}/${role}/profile`}>{copy.stay}</Link>
    </aside>
  );
}
