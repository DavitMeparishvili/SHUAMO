import Link from "next/link";
import { notFound } from "next/navigation";
import { getMessages, isLocale, t } from "@/src/modules/localization";
import { AuthCard, SignInForm } from "@/src/modules/identity";

export default async function SignInPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const messages = getMessages(locale);
  return (
    <AuthCard
      title={t(messages, "identity.signIn.title")}
      intro={t(messages, "identity.signIn.intro")}
      footer={
        <>
          {t(messages, "identity.signIn.noAccount")}{" "}
          <Link href={`/${locale}/sign-up`}>
            {t(messages, "identity.signUp.link")}
          </Link>
        </>
      }
    >
      <SignInForm
        locale={locale}
        mode="sign-in"
        copy={{
          email: t(messages, "identity.field.email"),
          password: t(messages, "identity.field.password"),
          name: t(messages, "identity.field.name"),
          submit: t(messages, "identity.signIn.submit"),
          pending: t(messages, "identity.pending"),
          errorTitle: t(messages, "identity.error.title"),
          errorBody: t(messages, "identity.error.signIn"),
        }}
      />
    </AuthCard>
  );
}
