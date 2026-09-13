import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import {
  currentViewer,
  requireAdmin,
  AuthCard,
  SignInForm,
} from "@/src/modules/identity";
import { isLocale } from "@/src/modules/localization";
export default async function AdminLogin({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const viewer = await currentViewer();
  if (requireAdmin(viewer).ok) redirect(`/${locale}/admin/finance`);
  const t = (en: string, ka: string) => (locale === "ka" ? ka : en);
  return (
    <AuthCard
      title={t("Admin sign in", "ადმინისტრატორის შესვლა")}
      intro={t(
        "Manage Xurjin finance and platform performance.",
        "მართეთ Xurjin-ის ფინანსები და პლატფორმის შედეგები.",
      )}
      footer={
        <Link href={`/${locale}/workspace`}>
          {t("Back to workspace", "სამუშაო სივრცეში დაბრუნება")}
        </Link>
      }
    >
      {viewer.kind === "anonymous" ? (
        <SignInForm
          locale={locale}
          mode="sign-in"
          returnTo={`/${locale}/admin/finance`}
          copy={{
            email: t("Email", "ელფოსტა"),
            password: t("Password", "პაროლი"),
            name: t("Name", "სახელი"),
            submit: t("Sign in", "შესვლა"),
            pending: t("Signing in…", "მიმდინარეობს შესვლა…"),
            errorTitle: t("Unable to sign in", "შესვლა ვერ მოხერხდა"),
            errorBody: t(
              "Check your email and password.",
              "შეამოწმეთ ელფოსტა და პაროლი.",
            ),
          }}
        />
      ) : (
        <p role="status">
          {t(
            "This account does not have admin access.",
            "ამ ანგარიშს ადმინისტრატორის წვდომა არ აქვს.",
          )}
        </p>
      )}
    </AuthCard>
  );
}
