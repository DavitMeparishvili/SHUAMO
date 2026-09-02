import Link from "next/link";
import { notFound } from "next/navigation";
import { getMessages, isLocale, t } from "@/src/modules/localization";
import {
  AuthCard,
  safeProfileReturnTo,
  SignInForm,
} from "@/src/modules/identity";

export default async function SignInPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ returnTo?: string | string[] }>;
}) {
  const [{ locale }, query] = await Promise.all([params, searchParams]);
  if (!isLocale(locale)) notFound();
  const messages = getMessages(locale);
  const returnTo = safeProfileReturnTo(locale, query.returnTo);
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
        returnTo={returnTo}
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
