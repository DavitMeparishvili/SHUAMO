import type { Locale } from "@/src/modules/localization";
import { EmptyState } from "@/src/modules/design-system";
import { FallbackLabel, localized } from "./profile-shared";
type DirectoryItem = {
  id: string;
  slug: string;
  name: string;
  taglineKa: string;
  taglineEn: string;
  locationKa: string;
  locationEn: string;
  imageUrl: string;
  categories: string[];
};
export function ProfileDirectory({
  role,
  locale,
  items,
  copy,
}: {
  role: "brands" | "creators";
  locale: Locale;
  items: DirectoryItem[];
  copy: {
    title: string;
    intro: string;
    search: string;
    category: string;
    location: string;
    filter: string;
    empty: string;
    emptyBody: string;
    fallback: string;
    imageAlt: string;
  };
}) {
  return (
    <div className="mx-auto max-w-[var(--layout-column)] px-[var(--layout-gutter)] py-12 max-[1179px]:px-[var(--layout-gutter-md)] max-[639px]:px-[var(--layout-gutter-sm)]">
      <header className="max-w-[70ch]">
        <h1 className="m-0 type-h1 text-ink">{copy.title}</h1>
        <p className="mt-3 text-lg text-slate-600">{copy.intro}</p>
      </header>
      <form className="my-8 grid grid-cols-[2fr_1fr_1fr_auto] gap-3 rounded-sm bg-slate-50 p-4 max-[760px]:grid-cols-1">
        <label className="grid gap-1 type-small font-semibold text-ink">
          {copy.search}
          <input
            className="min-h-11 rounded-sm border border-slate-300 bg-paper px-3 font-normal"
            name="q"
          />
        </label>
        <label className="grid gap-1 type-small font-semibold text-ink">
          {copy.category}
          <input
            className="min-h-11 rounded-sm border border-slate-300 bg-paper px-3 font-normal"
            name="category"
          />
        </label>
        <label className="grid gap-1 type-small font-semibold text-ink">
          {copy.location}
          <input
            className="min-h-11 rounded-sm border border-slate-300 bg-paper px-3 font-normal"
            name="location"
          />
        </label>
        <button
          className="mt-auto min-h-11 rounded-pill bg-signal px-5 font-semibold text-paper"
          type="submit"
        >
          {copy.filter}
        </button>
      </form>
      {items.length ? (
        <div className="grid grid-cols-3 gap-6 max-[850px]:grid-cols-2 max-[560px]:grid-cols-1">
          {items.map((item) => {
            const tagline = localized(item.taglineKa, item.taglineEn, locale);
            const location = localized(
              item.locationKa,
              item.locationEn,
              locale,
            );
            return (
              <a
                className="group overflow-hidden rounded-md border border-slate-200 bg-paper text-ink no-underline shadow-xs transition hover:border-signal hover:shadow-sm"
                href={`/${locale}/${role}/${item.slug}`}
                key={item.id}
              >
                <div className="aspect-[4/3] overflow-hidden bg-slate-100">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    className="h-full w-full object-cover transition-transform group-hover:scale-[1.02]"
                    src={item.imageUrl}
                    alt={copy.imageAlt.replace("{name}", item.name)}
                  />
                </div>
                <div className="p-5">
                  <h2 className="m-0 type-h3">{item.name}</h2>
                  <p className="mb-2 mt-2 text-slate-600">
                    {tagline.text}
                    <FallbackLabel
                      from={tagline.fallbackFrom}
                      copy={copy.fallback}
                    />
                  </p>
                  {location.text ? (
                    <p className="my-2 type-small text-slate-600">
                      ⌖ {location.text}
                      <FallbackLabel
                        from={location.fallbackFrom}
                        copy={copy.fallback}
                      />
                    </p>
                  ) : null}
                  <div className="mt-4 flex flex-wrap gap-2">
                    {item.categories.map((category) => (
                      <span
                        className="rounded-pill bg-slate-100 px-3 py-1 type-caption"
                        key={category}
                      >
                        {category}
                      </span>
                    ))}
                  </div>
                </div>
              </a>
            );
          })}
        </div>
      ) : (
        <EmptyState title={copy.empty} body={copy.emptyBody} />
      )}
    </div>
  );
}
