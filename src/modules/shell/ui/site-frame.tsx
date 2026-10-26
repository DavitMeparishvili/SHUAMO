"use client";
import { useRef, useState, type ReactNode } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Icon, XurjinLogo, type IconName } from "@/src/modules/design-system";
import type { Viewer } from "@/src/modules/identity";
import type { Locale } from "@/src/modules/localization";
import type { MarketingCopy } from "./marketing-copy";

export function SiteFrame({
  locale,
  marketingCopy,
  viewer,
  children,
  profilePublished = true,
  profilePrivacyNotice,
}: {
  locale: Locale;
  marketingCopy: MarketingCopy;
  viewer: Viewer;
  children: ReactNode;
  profilePublished?: boolean;
  profilePrivacyNotice?: ReactNode;
}) {
  const path = usePathname();
  const searchParams = useSearchParams();
  const discovery = /^\/(ka|en)\/(creator\/)?products$/.test(path);
  const brandManagement = /^\/(ka|en)\/brand\/(products|creators|links)$/.test(
    path,
  );
  const productDetail = /^\/(ka|en)\/(creator\/)?products\/[^/]+$/.test(path);
  const trackingLinks = /^\/(ka|en)\/creator\/links$/.test(path);
  const brandsPage = /^\/(ka|en)\/creator\/brands$/.test(path);
  const drawer = useRef<HTMLDialogElement>(null);
  const [signingOut, setSigningOut] = useState(false);
  const label = (en: string, ka: string) => (locale === "ka" ? ka : en);
  const admin =
    (/^\/(ka|en)\/admin\/(?!login(?:$|\/))/.test(path) ||
      /^\/(ka|en)\/finance\/invoices\//.test(path)) &&
    (viewer.kind === "admin" ||
      (viewer.kind !== "anonymous" && viewer.isAdmin));
  const workspace =
    admin ||
    ((viewer.kind === "brand" || viewer.kind === "creator") &&
      !["", "sign-up", "sign-in"].includes(path.split("/")[2] ?? "") &&
      !path.endsWith("/admin/login"));
  const brand = viewer.kind === "brand";
  const root = `/${locale}/${brand ? "brand" : viewer.kind === "admin" ? "workspace" : "creator"}`;
  const name = admin
    ? label("Finance administrator", "ფინანსების ადმინისტრატორი")
    : viewer.kind === "brand"
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
        ? label("Creators", "თანამშრომლობები")
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
            text: label("Sales", "შეკვეთები"),
            icon: "cart" as const,
          },
        ]
      : []),
    {
      href: `${root}/${brand ? "performance" : "earnings"}`,
      text: label("Performance", "ანალიტიკა"),
      icon: "chart",
    },
    ...(viewer.kind === "creator" && viewer.isTeamLead === true
      ? [
          {
            href: `/${locale}/creator/team`,
            text: label("My team", "ჩემი გუნდი"),
            icon: "users" as const,
          },
        ]
      : []),
    {
      href: `${root}/profile`,
      text: label("Profile", "პროფილი"),
      icon: "user",
    },
    ...(brand
      ? [
          {
            href: `${root}/settings`,
            text: label("Integration", "ინტეგრაცია"),
            icon: "settings" as const,
          },
        ]
      : []),
  ];
  if (admin)
    nav.splice(
      0,
      nav.length,
      {
        href: `/${locale}/admin/finance`,
        text: label("Finance", "ფინანსები"),
        icon: "chart",
      },
      {
        href: `/${locale}/admin/products`,
        text: label("Products", "პროდუქტები"),
        icon: "box",
      },
      {
        href: `/${locale}/admin/performance`,
        text: label("Performance", "ანალიტიკა"),
        icon: "chart",
      },
    );
  else if (workspace) {
    nav.push({
      href: `${root}/finance`,
      text: label("Finance", "ფინანსები"),
      icon: "chart",
    });
    if (viewer.kind === "admin" || viewer.isAdmin)
      nav.push({
        href: `/${locale}/admin/finance`,
        text: label("Admin finance", "ადმინისტრატორის ფინანსები"),
        icon: "settings",
      });
  }
  // Brand link management now starts at Products; legacy URLs remain under Performance.
  if (brand) {
    const trackingIndex = nav.findIndex((item) => item.icon === "link");
    if (trackingIndex !== -1) nav.splice(trackingIndex, 1);
  }
  const marketing = [
    {
      href: `/${locale}#how-it-works`,
      text: marketingCopy["nav.how"],
    },
    {
      href: `/${locale}#for-brands`,
      text: marketingCopy["nav.brands"],
    },
    {
      href: `/${locale}#for-creators`,
      text: marketingCopy["nav.creators"],
    },
    { href: `/${locale}#faq`, text: marketingCopy["nav.faq"] },
  ];
  const explore = [
    { href: `/${locale}/products`, text: marketingCopy["footer.products"] },
    { href: `/${locale}/brands`, text: marketingCopy["footer.brands"] },
    { href: `/${locale}/creators`, text: marketingCopy["footer.creators"] },
  ];
  const publicNavigation = [...marketing, ...explore];
  const publicNavigationLinks = publicNavigation.map((n) => {
    // Native anchors scroll again when the same fragment is already in the URL.
    const NavigationLink = n.href.includes("#") ? "a" : Link;
    return (
      <NavigationLink
        key={n.href}
        href={n.href}
        onClick={() => drawer.current?.close()}
      >
        {n.text}
      </NavigationLink>
    );
  });
  const localeControl = (
    <nav className="language-switch" aria-label={marketingCopy["nav.language"]}>
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
      onClick={(event) => {
        drawer.current?.close();
        if (
          admin &&
          /\/admin\/(performance|products)/.test(path) &&
          /\/admin\/(performance|products)$/.test(n.href)
        ) {
          event.preventDefault();
          const query = new URLSearchParams(searchParams.toString());
          const products = n.href.endsWith("/products");
          query.set("tab", products ? "products" : "overview");
          query.set(
            "page",
            products ? query.get("listPage") || query.get("page") || "1" : "1",
          );
          query.delete("returnTo");
          query.delete("listPage");
          window.location.assign(`${n.href}?${query}`);
        }
      }}
    >
      <Icon name={n.icon} />
      <span>{n.text}</span>
    </Link>
  ));
  async function signOut() {
    if (
      !window.dispatchEvent(
        new Event("workspace:before-leave", { cancelable: true }),
      )
    )
      return;
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
      <span className="avatar">{admin ? "FA" : name.slice(0, 1)}</span>
      <strong>{name}</strong>
      <Link href={admin ? `/${locale}/workspace` : `${root}/profile`}>
        {label("View profile", "პროფილის ნახვა")} →
      </Link>
    </div>
  );
  return (
    <div
      className={
        (workspace ? "site-frame workspace-frame" : "site-frame public-frame") +
        (admin ? " admin-frame" : "") +
        (productDetail ? " product-detail-frame" : "") +
        (brandsPage || path === `/${locale}/brand/creators`
          ? " brands-frame"
          : "")
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
          {admin ? (
            <p className="admin-workspace-label">
              {label("Admin workspace", "ადმინისტრატორის სივრცე")}
            </p>
          ) : (
            account
          )}
          <nav className="rail-nav" aria-label={marketingCopy["nav.primary"]}>
            {navLinks}
            {!admin && (
              <Link href={`/${locale}/coming-soon?feature=notifications`}>
                <Icon name="bell" />
                <span>{label("Notifications", "შეტყობინებები")}</span>
                <span className="nav-soon">{label("Soon", "მალე")}</span>
              </Link>
            )}
          </nav>
          {admin && viewer.kind !== "admin" && (
            <Link className="rail-help" href={`/${locale}/workspace`}>
              {label("Back to workspace", "სამუშაო სივრცეში დაბრუნება")}
            </Link>
          )}
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
              href={brand ? `${root}/products` : `/${locale}/products`}
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
              <Link href={brand ? `${root}/products` : `/${locale}/products`}>
                {brand
                  ? marketingCopy["footer.products"]
                  : label("Discover", "აღმოჩენა")}
              </Link>
              <span>/ {label("Product details", "პროდუქტის დეტალები")}</span>
            </div>
          ) : null}
          {admin ? (
            <div className="admin-workspace-breadcrumb">
              {label("Admin workspace", "ადმინისტრატორის სივრცე")}
            </div>
          ) : workspace &&
            (discovery || trackingLinks || brandsPage || brandManagement) ? (
            <div className="discovery-breadcrumb">
              <Icon name="arrow" />
              <span>
                {brandManagement
                  ? nav.find((item) => item.href === path)?.text
                  : brandsPage
                    ? marketingCopy["footer.brands"]
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
              aria-label={marketingCopy["nav.primary"]}
            >
              {publicNavigationLinks}
            </nav>
          )}
          <div className="header-actions">
            {localeControl}
            {admin ? (
              <div className="topbar-account">
                <span className="avatar small">FA</span>
                <strong>{name}</strong>
              </div>
            ) : workspace ? (
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
                  <span className="avatar small">
                    {admin ? "FA" : name.slice(0, 1)}
                  </span>
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
                {viewer.kind === "anonymous"
                  ? marketingCopy.getStarted
                  : marketingCopy.dashboard}
              </Link>
            )}
          </div>
        </header>
        <main id="main">
          {!profilePublished &&
          workspace &&
          !admin &&
          !path.endsWith("/profile") &&
          (viewer.kind === "brand" || viewer.kind === "creator")
            ? profilePrivacyNotice
            : null}
          {children}
        </main>
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
                <p>{marketingCopy["footer.description"]}</p>
                <div className="footer-socials">
                  <Icon name="users" />
                  <span>{marketingCopy["footer.tagline"]}</span>
                </div>
              </div>
              <div>
                <h3>{marketingCopy["footer.platform"]}</h3>
                {marketing.slice(0, 3).map((n) => (
                  <a href={n.href} key={n.href}>
                    {n.text}
                  </a>
                ))}
              </div>
              <div>
                <h3>{marketingCopy["footer.explore"]}</h3>
                {explore.map((n) => (
                  <Link href={n.href} key={n.href}>
                    {n.text}
                  </Link>
                ))}
                <Link href={`/${locale}/sign-in`}>
                  {marketingCopy["signIn"]}
                </Link>
              </div>
              <div>
                <h3>{marketingCopy["footer.resources"]}</h3>
                <a href={`/${locale}#how-it-works`}>
                  {marketingCopy["nav.how"]}
                </a>
                <a href={`/${locale}#faq`}>{marketingCopy["footer.faq"]}</a>
                <p className="footer-policy-status">
                  {marketingCopy["footer.policiesPending"]}
                </p>
              </div>
              <small className="footer-copyright">
                © {new Date().getFullYear()} Xurjin.{" "}
                {marketingCopy["footer.copyright"]}
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
          {(admin
            ? nav
            : [
                nav[0]!,
                nav[1]!,
                nav.find((n) => n.icon === "users")!,
                nav.find((n) => n.icon === (brand ? "cart" : "link"))!,
              ]
          ).map((n) => (
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
          <button onClick={() => drawer.current?.showModal()}>
            <Icon name="menu" />
            <span>{label("More", "მეტი")}</span>
          </button>
        </nav>
      )}
      <dialog
        className="navigation-drawer"
        aria-label={marketingCopy["nav.title"]}
        ref={drawer}
        onClick={(e) => {
          if (e.target === e.currentTarget) drawer.current?.close();
        }}
      >
        <div className="drawer-heading">
          <XurjinLogo />
          <button
            className="icon-button"
            aria-label={marketingCopy["nav.close"]}
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
              aria-label={marketingCopy["nav.destinations"]}
            >
              {navLinks}
              {!admin && (
                <Link
                  href={`/${locale}/coming-soon?feature=notifications`}
                  onClick={() => drawer.current?.close()}
                >
                  <Icon name="bell" />
                  {label("Notifications — soon", "შეტყობინებები — მალე")}
                </Link>
              )}
              <button onClick={signOut} disabled={signingOut}>
                <Icon name="logout" />
                {label("Sign out", "გასვლა")}
              </button>
            </nav>
          </>
        ) : (
          <nav
            className="rail-nav"
            aria-label={marketingCopy["nav.destinations"]}
          >
            {publicNavigationLinks}
            <Link href={`/${locale}/sign-in`}>{marketingCopy["signIn"]}</Link>
          </nav>
        )}
        {localeControl}
      </dialog>
    </div>
  );
}
