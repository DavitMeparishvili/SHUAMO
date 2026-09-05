import { headers } from "next/headers";
import Image from "next/image";
import { notFound, redirect } from "next/navigation";
import { isLocale } from "@/src/modules/localization";
import { auth, currentViewer, RegistrationForm } from "@/src/modules/identity";
import { Icon } from "@/src/modules/design-system";
import { prisma } from "@/src/infrastructure/db/client";
export default async function SignUpPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ role?: string }>;
}) {
  const [{ locale }, query] = await Promise.all([params, searchParams]);
  if (!isLocale(locale)) notFound();
  const viewer = await currentViewer();
  if (viewer.kind !== "anonymous") redirect("/" + locale + "/workspace");
  const session = await auth.api.getSession({ headers: await headers() });
  const application = session
    ? await prisma.appUser.findUnique({
        where: { id: session.user.id },
        include: { brand: true, creator: true },
      })
    : null;
  if (
    application?.brand?.status === "SUSPENDED" ||
    application?.creator?.status === "SUSPENDED"
  )
    redirect("/" + locale + "/sign-in?status=suspended");
  const role = query.role === "brand" ? "brand" : "creator";
  const brand = role === "brand";
  const text = (en: string, ka: string) => (locale === "ka" ? ka : en);
  return (
    <div className={brand ? "auth-world" : "auth-world creator-registration"}>
      <header className="auth-intro">
        <h1>
          {text(
            brand ? "Grow your brand." : "Creator registration",
            brand ? "გაზარდე შენი ბრენდი." : "კრეატორის რეგისტრაცია",
          )}{" "}
          <span className="gradient-text">
            {text(
              brand ? "Together." : "Your next chapter.",
              brand ? "კრეატორებთან ერთად." : "ახალი შესაძლებლობები.",
            )}
          </span>
        </h1>
        <p>
          {text(
            brand
              ? "Bring your products to new audiences through trusted creators. Connect, collaborate, and measure the results."
              : "Join Xurjin, connect your social channels, discover brand offers, and earn commission from real sales.",
            brand
              ? "მიაწვდინე შენი პროდუქცია ახალ აუდიტორიას სანდო კრეატორების მეშვეობით. ითანამშრომლე და გაზომე შედეგები."
              : "შეუერთდი Xurjin-ს, დააკავშირე შენი სოციალური არხები, აღმოაჩინე ბრენდების შეთავაზებები და მიიღე შემოსავალი რეალური გაყიდვებიდან.",
          )}
        </p>
        <div className="auth-benefits">
          <span>
            <Icon name="users" />
            {text("Trusted connections", "სანდო თანამშრომლობა")}
          </span>
          <span>
            <Icon name="chart" />
            {text("Measurable results", "გაზომვადი შედეგები")}
          </span>
          <span>
            <Icon name="shield" />
            {text("Clear commission terms", "საკომისიოს ნათელი პირობები")}
          </span>
        </div>
      </header>
      <div className="registration-layout">
        <aside className="registration-story">
          <div className="story-photo">
            <Image
              src={brand ? "/images/seller.webp" : "/images/creator.webp"}
              alt=""
              fill
              sizes="40vw"
            />
          </div>
          <h2>
            {text(
              brand
                ? "Good brands grow together."
                : "Your content. Real possibilities.",
              brand
                ? "ძლიერი ბრენდები ერთად იზრდებიან."
                : "შენი კონტენტი. რეალური შესაძლებლობები.",
            )}
          </h2>
          <p>
            {text(
              "Build connections that turn inspiration into action.",
              "შექმენი კავშირები, რომლებიც შთაგონებას რეალურ შედეგად აქცევს.",
            )}
          </p>
          <div className="story-points">
            {[
              [
                "shop",
                text(
                  brand ? "Reach new customers" : "Discover brands",
                  brand ? "მიაღწიე ახალ მომხმარებლებს" : "აღმოაჩინე ბრენდები",
                ),
                text(
                  "Find the right people and products for you.",
                  "იპოვე შენთვის შესაფერისი ადამიანები და პროდუქტები.",
                ),
              ],
              [
                "link",
                text(
                  "Make every connection count",
                  "მიიღე შედეგი ყოველი კავშირიდან",
                ),
                text(
                  "Personal links connect products to real sales.",
                  "პირადი ბმულები პროდუქტებს რეალურ გაყიდვებთან აკავშირებს.",
                ),
              ],
              [
                "chart",
                text("See your progress", "თვალი ადევნე შედეგებს"),
                text(
                  "Clicks, sales, and commissions in one place.",
                  "კლიკები, გაყიდვები და საკომისიო ერთ სივრცეში.",
                ),
              ],
            ].map(([icon, title, body]) => (
              <div key={title}>
                <Icon name={icon as "shop" | "link" | "chart"} />
                <div>
                  <h3>{title}</h3>
                  <p>{body}</p>
                </div>
              </div>
            ))}
          </div>
        </aside>
        <section className="registration-panel">
          <RegistrationForm
            key={role}
            locale={locale}
            role={role}
            existingEmail={session?.user.email}
            pendingApplication={Boolean(
              application?.brand || application?.creator,
            )}
          />
        </section>
      </div>
    </div>
  );
}
