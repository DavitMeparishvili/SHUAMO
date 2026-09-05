"use client";
import { useRef, useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { Icon, XurjinLogo, type IconName } from "@/src/modules/design-system";
import type { Viewer } from "@/src/modules/identity";
import type { Locale } from "@/src/modules/localization";

export function SiteFrame({
  locale,
  viewer,
  children,
}: {
  locale: Locale;
  viewer: Viewer;
  children: ReactNode;
}) {
  const path = usePathname();
  const discovery = /^\/(ka|en)\/(creator\/)?products$/.test(path);
  const productDetail = /^\/(ka|en)\/(creator\/)?products\/[^/]+$/.test(path);
  const trackingLinks = /^\/(ka|en)\/creator\/links$/.test(path);
  const brandsPage = /^\/(ka|en)\/creator\/brands$/.test(path);
  const drawer = useRef<HTMLDialogElement>(null);
  const [signingOut, setSigningOut] = useState(false);
  const label = (en: string, ka: string) => (locale === "ka" ? ka : en);
  const workspace =
    (viewer.kind === "brand" || viewer.kind === "creator") &&
    !["", "sign-up", "sign-in"].includes(path.split("/")[2] ?? "");
  const brand = viewer.kind === "brand";
  const root = `/${locale}/${brand ? "brand" : viewer.kind === "admin" ? "workspace" : "creator"}`;
  const name =
    viewer.kind === "brand"
      ? viewer.brandName
      : viewer.kind === "creator"
        ? viewer.displayName
        : "Xurjin";
  const nav: { href: string; text: string; icon: IconName }[] = [
    { href: root, text: label("Overview", "მთავარი"), icon: "home" },
    {
      href: brand ? `${root}/products` : `/${locale}/creator/products`,
      text: label(
        brand ? "Products" : "Discover products",
        brand ? "პროდუქტები" : "პროდუქტების ძიება",
      ),
      icon: brand ? "box" : "search",
    },
    {
      href: `${root}/${brand ? "creators" : "brands"}`,
      text: brand
        ? label("Collaborations", "თანამშრომლობები")
        : label("Brands", "ბრენდები"),
      icon: "users",
    },
    {
      href: `${root}/links`,
      text: label("Tracking links", "ჩემი ბმულები"),
      icon: "link",
    },
    ...(brand
      ? [
          {
            href: `${root}/orders`,
            text: label("Orders", "შეკვეთები"),
            icon: "cart" as const,
          },
        ]
      : []),
    {
      href: `${root}/${brand ? "performance" : "earnings"}`,
      text: label("Analytics", "ანალიტიკა"),
      icon: "chart",
    },
    {
      href: `${root}/profile`,
      text: label("Profile", "პროფილი"),
      icon: "user",
    },
    ...(brand
      ? [
          {
            href: `${root}/settings`,
            text: label("Settings", "პარამეტრები"),
            icon: "settings" as const,
          },
        ]
      : []),
  ];
  const marketing = [
    {
      href: `/${locale}/#why-xurjin`,
      text: label("Why Xurjin", "რატომ Xurjin"),
    },
    {
      href: `/${locale}/#how-it-works`,
      text: label("How it works", "როგორ მუშაობს"),
    },
    {
      href: `/${locale}/sign-up?role=brand`,
      text: label("For sellers", "გამყიდველებისთვის"),
    },
    {
      href: `/${locale}/sign-up?role=creator`,
      text: label("For creators", "კრეატორებისთვის"),
    },
    { href: `/${locale}/#about`, text: label("About us", "ჩვენ შესახებ") },
  ];
  const localeControl = (
    <nav className="language-switch" aria-label={label("Language", "ენა")}>
      {(["ka", "en"] as const).map((l) => (
        <a
          href={path.replace(/^\/(ka|en)/, `/${l}`)}
          hrefLang={l}
          lang={l}
          aria-current={l === locale ? "true" : undefined}
          key={l}
          onClick={(e) => {
            e.preventDefault();
            window.location.assign(
              path.replace(/^\/(ka|en)/, `/${l}`) +
                window.location.search +
                window.location.hash,
            );
          }}
        >
          {l.toUpperCase()}
        </a>
      ))}
    </nav>
  );
  const navLinks = nav.map((n) => (
    <Link
      href={n.href}
      key={n.href}
      className={
        path === n.href ||
        (!brand && (discovery || productDetail) && n.icon === "search") ||
        (n.href !== root && path.startsWith(n.href + "/"))
          ? "active"
          : ""
      }
      aria-current={
        path === n.href ||
        (!brand && (discovery || productDetail) && n.icon === "search")
          ? "page"
          : undefined
      }
      onClick={() => drawer.current?.close()}
    >
      <Icon name={n.icon} />
      <span>{n.text}</span>
    </Link>
  ));
  async function signOut() {
    setSigningOut(true);
    try {
      const r = await fetch("/api/auth/sign-out", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "{}",
      });
      if (r.ok) window.location.assign(`/${locale}`);
    } finally {
      setSigningOut(false);
    }
  }
  const account = (
    <div className="rail-account">
      <span className="avatar">{name.slice(0, 1)}</span>
      <strong>{name}</strong>
      <Link href={`${root}/profile`}>
        {label("View profile", "პროფილის ნახვა")} →
      </Link>
    </div>
  );
  return (
    <div
      className={
        (workspace ? "site-frame workspace-frame" : "site-frame public-frame") +
        (productDetail ? " product-detail-frame" : "") +
        (brandsPage ? " brands-frame" : "")
      }
    >
      <a className="skip-link" href="#main">
        {label("Skip to content", "შინაარსზე გადასვლა")}
      </a>
      {workspace && (
        <aside className="workspace-rail">
          <Link className="brand-link" href={`/${locale}`} aria-label="Xurjin">
            <XurjinLogo />
          </Link>
          {account}
          <nav
            className="rail-nav"
            aria-label={label("Primary navigation", "მთავარი ნავიგაცია")}
          >
            {navLinks}
            <Link href={`/${locale}/coming-soon?feature=notifications`}>
              <Icon name="bell" />
              <span>{label("Notifications", "შეტყობინებები")}</span>
              <span className="nav-soon">{label("Soon", "მალე")}</span>
            </Link>
          </nav>
          <div className="rail-bottom">
            <Link
              className="rail-help"
              href={`/${locale}/coming-soon?feature=help`}
            >
              <Icon name="help" />
              {label("Help & support", "დახმარება")}
            </Link>
            <button disabled={signingOut} onClick={signOut}>
              <Icon name="logout" />
              {label("Sign out", "გასვლა")}
            </button>
            <small>© {new Date().getFullYear()} Xurjin</small>
          </div>
        </aside>
      )}
      <div className="site-body">
        <header className={workspace ? "workspace-topbar" : "marketing-header"}>
          {workspace && productDetail ? (
            <Link
              className="product-detail-mobile-back icon-button"
              href={`/${locale}/products`}
              aria-label={label("Back to products", "პროდუქტებზე დაბრუნება")}
            >
              <Icon name="arrow" />
            </Link>
          ) : null}
          <button
            className="mobile-menu icon-button"
            aria-label={label("Open navigation", "მენიუს გახსნა")}
            onClick={() => drawer.current?.showModal()}
          >
            <Icon name="menu" />
          </button>
          {!workspace && (
            <Link
              className="brand-link"
              href={`/${locale}`}
              aria-label="Xurjin"
            >
              <XurjinLogo />
            </Link>
          )}
          {workspace && (
            <Link
              className="mobile-workspace-brand brand-link"
              href={`/${locale}`}
              aria-label="Xurjin"
            >
              <XurjinLogo />
            </Link>
          )}
          {workspace && productDetail ? (
            <div className="discovery-breadcrumb">
              <Icon name="arrow" />
              <Link href={`/${locale}/products`}>
                {label("Discover", "აღმოჩენა")}
              </Link>
              <span>/ {label("Product details", "პროდუქტის დეტალები")}</span>
            </div>
          ) : null}
          {workspace && (discovery || trackingLinks || brandsPage) ? (
            <div className="discovery-breadcrumb">
              <Icon name="arrow" />
              <span>
                {brandsPage
                  ? label("Brands", "ბრენდები")
                  : trackingLinks
                    ? label("Tracking links", "ტრეკინგ ბმულები")
                    : label("Discover", "აღმოჩენა")}
              </span>
            </div>
          ) : workspace ? (
            <form
              className="global-search"
              action={
                brand ? `${root}/products` : `/${locale}/creator/products`
              }
            >
              <Icon name="search" />
              <input
                name="q"
                aria-label={label("Search products", "პროდუქტების ძიება")}
                placeholder={label("Search products…", "მოძებნე პროდუქტები…")}
              />
            </form>
          ) : (
            <nav
              className="marketing-nav"
              aria-label={label("Primary navigation", "მთავარი ნავიგაცია")}
            >
              {marketing.map((n) => (
                <Link key={n.href} href={n.href}>
                  {n.text}
                </Link>
              ))}
            </nav>
          )}
          <div className="header-actions">
            {localeControl}
            {workspace ? (
              <>
                <Link
                  className="icon-button notification-button"
                  href={`/${locale}/coming-soon?feature=notifications`}
                  aria-label={label(
                    "Notifications — coming soon",
                    "შეტყობინებები — მალე",
                  )}
                >
                  <Icon name="bell" />
                </Link>
                <Link href={`${root}/profile`} className="topbar-account">
                  <span className="avatar small">{name.slice(0, 1)}</span>
                  <span>
                    <strong>{name}</strong>
                    <small>
                      {label(
                        brand ? "Seller" : "Creator",
                        brand ? "გამყიდველი" : "კრეატორი",
                      )}
                    </small>
                  </span>
                </Link>
              </>
            ) : (
              <Link
                className="x-button primary header-cta"
                href={
                  viewer.kind === "anonymous"
                    ? `/${locale}/sign-up`
                    : `/${locale}/workspace`
                }
              >
                {label(
                  viewer.kind === "anonymous" ? "Get started" : "Dashboard",
                  viewer.kind === "anonymous" ? "დაიწყე ახლავე" : "ჩემი სივრცე",
                )}
              </Link>
            )}
          </div>
        </header>
        <main id="main">{children}</main>
        <footer
          className={workspace ? "workspace-footer" : "marketing-footer"}
          id="about"
        >
          {workspace ? (
            <>
              <span>© {new Date().getFullYear()} Xurjin</span>
              <span>
                {label(
                  "Creators. Brands. Growing together.",
                  "კრეატორები. ბრენდები. ერთად ზრდისთვის.",
                )}
              </span>
              <Link href={`/${locale}/coming-soon?feature=help`}>
                {label("Help", "დახმარება")}
              </Link>
            </>
          ) : (
            <div className="footer-grid">
              <div>
                <Link className="brand-link" href={`/${locale}`}>
                  <XurjinLogo />
                </Link>
                <p>
                  {label(
                    "Where brands and creators in Georgia connect, collaborate, and grow together.",
                    "პლატფორმა, სადაც ბრენდები და კრეატორები ერთად ქმნიან ახალ შესაძლებლობებს.",
                  )}
                </p>
                <div className="footer-socials">
                  <Icon name="users" />
                  <span>
                    {label(
                      "Made for connection.",
                      "შექმნილია თანამშრომლობისთვის.",
                    )}
                  </span>
                </div>
              </div>
              <div>
                <h3>{label("Platform", "პლატფორმა")}</h3>
                {marketing.slice(0, 4).map((n) => (
                  <Link href={n.href} key={n.href}>
                    {n.text}
                  </Link>
                ))}
              </div>
              <div>
                <h3>{label("Explore", "აღმოაჩინე")}</h3>
                <Link href={`/${locale}/products`}>
                  {label("Products", "პროდუქტები")}
                </Link>
                <Link href={`/${locale}/brands`}>
                  {label("Brands", "ბრენდები")}
                </Link>
                <Link href={`/${locale}/creators`}>
                  {label("Creators", "კრეატორები")}
                </Link>
                <Link href={`/${locale}/sign-in`}>
                  {label("Sign in", "შესვლა")}
                </Link>
              </div>
              <div>
                <h3>{label("Resources", "რესურსები")}</h3>
                {["Help center", "Terms of service", "Privacy policy"].map(
                  (f, i) => (
                    <Link
                      href={`/${locale}/coming-soon?feature=${["help", "terms", "privacy"][i]}`}
                      key={f}
                    >
                      {locale === "ka"
                        ? [
                            "დახმარების ცენტრი",
                            "მომსახურების პირობები",
                            "კონფიდენციალურობა",
                          ][i]
                        : f}
                    </Link>
                  ),
                )}
              </div>
              <small className="footer-copyright">
                © {new Date().getFullYear()} Xurjin.{" "}
                {label("All rights reserved.", "ყველა უფლება დაცულია.")}
              </small>
            </div>
          )}
        </footer>
      </div>
      {workspace && (
        <nav
          className="workspace-bottom-nav"
          aria-label={label("Mobile navigation", "მობილური ნავიგაცია")}
        >
          {[
            nav[0]!,
            nav[1]!,
            nav.find((n) => n.icon === (brand ? "link" : "users"))!,
            nav.find((n) => n.icon === (brand ? "chart" : "link"))!,
          ].map((n) => (
            <Link
              key={n.href}
              href={n.href}
              aria-current={
                path === n.href ||
                (!brand && (discovery || productDetail) && n.icon === "search")
                  ? "page"
                  : undefined
              }
            >
              <Icon name={n.icon} />
              <span>
                {!brand
                  ? n.icon === "search"
                    ? label("Discover", "აღმოჩენა")
                    : n.icon === "link"
                      ? label("Links", "ბმულები")
                      : n.text
                  : n.text}
              </span>
            </Link>
          ))}
          {((discovery || trackingLinks || productDetail) && !brand) ||
          path === `${root}/profile` ? (
            <Link
              href={`${root}/profile`}
              aria-current={path === `${root}/profile` ? "page" : undefined}
            >
              <Icon name="user" />
              <span>{label("Profile", "პროფილი")}</span>
            </Link>
          ) : (
            <button onClick={() => drawer.current?.showModal()}>
              <Icon name="menu" />
              <span>{label("More", "მეტი")}</span>
            </button>
          )}
        </nav>
      )}
      <dialog
        className="navigation-drawer"
        aria-label={label("Navigation", "ნავიგაცია")}
        ref={drawer}
        onClick={(e) => {
          if (e.target === e.currentTarget) drawer.current?.close();
        }}
      >
        <div className="drawer-heading">
          <XurjinLogo />
          <button
            className="icon-button"
            aria-label={label("Close navigation", "მენიუს დახურვა")}
            onClick={() => drawer.current?.close()}
          >
            <Icon name="close" />
          </button>
        </div>
        {workspace ? (
          <>
            {account}
            <nav
              className="rail-nav"
              aria-label={label("All destinations", "ყველა გვერდი")}
            >
              {navLinks}
              <Link
                href={`/${locale}/coming-soon?feature=notifications`}
                onClick={() => drawer.current?.close()}
              >
                <Icon name="bell" />
                {label("Notifications — soon", "შეტყობინებები — მალე")}
              </Link>
              <button onClick={signOut} disabled={signingOut}>
                <Icon name="logout" />
                {label("Sign out", "გასვლა")}
              </button>
            </nav>
          </>
        ) : (
          <nav
            className="rail-nav"
            aria-label={label("All destinations", "ყველა გვერდი")}
          >
            {marketing.map((n) => (
              <Link
                key={n.href}
                href={n.href}
                onClick={() => drawer.current?.close()}
              >
                {n.text}
              </Link>
            ))}
            <Link href={`/${locale}/sign-in`}>
              {label("Sign in", "შესვლა")}
            </Link>
          </nav>
        )}
        {localeControl}
      </dialog>
    </div>
  );
}
