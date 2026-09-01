import Link from "next/link";
import { notFound } from "next/navigation";
import { getMessages, isLocale, t } from "@/src/modules/localization";
import { AuthCard, SignInForm } from "@/src/modules/identity";

export default async function SignUpPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const messages = getMessages(locale);
  return (
    <AuthCard
      title={t(messages, "identity.signUp.title")}
      intro={t(messages, "identity.signUp.intro")}
      footer={
        <>
          {t(messages, "identity.signUp.hasAccount")}{" "}
          <Link href={`/${locale}/sign-in`}>
            {t(messages, "identity.signIn.link")}
          </Link>
        </>
      }
    >
      <SignInForm
        locale={locale}
        mode="sign-up"
        copy={{
          email: t(messages, "identity.field.email"),
          password: t(messages, "identity.field.password"),
          name: t(messages, "identity.field.name"),
          submit: t(messages, "identity.signUp.submit"),
          pending: t(messages, "identity.pending"),
          errorTitle: t(messages, "identity.error.title"),
          errorBody: t(messages, "identity.error.signUp"),
        }}
      />
    </AuthCard>
  );
}
