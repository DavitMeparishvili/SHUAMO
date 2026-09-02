import Link from "next/link";

function pagesAround(current: number, total: number): number[] {
  const values = new Set([1, total, current - 1, current, current + 1]);
  return [...values]
    .filter((page) => page >= 1 && page <= total)
    .sort((left, right) => left - right);
}

export function CatalogPagination({
  page,
  pageCount,
  hrefForPage,
  copy,
}: {
  page: number;
  pageCount: number;
  hrefForPage: (page: number) => string;
  copy: {
    label: string;
    previous: string;
    next: string;
    page: string;
    of: string;
  };
}) {
  if (pageCount <= 1) return null;
  const pages = pagesAround(page, pageCount);
  return (
    <nav
      aria-label={copy.label}
      className="flex items-center justify-between gap-3 border-t border-slate-200 pt-5"
    >
      {page > 1 ? (
        <Link
          className="inline-flex min-h-11 items-center rounded-pill border border-slate-300 bg-paper px-4 type-small font-semibold text-ink hover:border-ink"
          href={hrefForPage(page - 1)}
          rel="prev"
        >
          {copy.previous}
        </Link>
      ) : (
        <span className="inline-flex min-h-11 items-center rounded-pill border border-slate-200 px-4 type-small text-slate-600">
          {copy.previous}
        </span>
      )}
      <span className="type-small text-slate-600 sm:hidden">
        {copy.page} <strong className="text-ink">{page}</strong> {copy.of}{" "}
        {pageCount}
      </span>
      <div className="hidden items-center gap-1 sm:flex">
        {pages.map((item, index) => {
          const previous = pages[index - 1];
          return (
            <span className="contents" key={item}>
              {previous !== undefined && item - previous > 1 ? (
                <span className="px-2 text-slate-500" aria-hidden="true">
                  …
                </span>
              ) : null}
              <Link
                aria-current={item === page ? "page" : undefined}
                aria-label={`${copy.page} ${item}`}
                className={`grid size-11 place-items-center rounded-sm type-small font-semibold ${item === page ? "bg-signal text-paper" : "text-slate-700 hover:bg-slate-100"}`}
                href={hrefForPage(item)}
              >
                {item}
              </Link>
            </span>
          );
        })}
      </div>
      {page < pageCount ? (
        <Link
          className="inline-flex min-h-11 items-center rounded-pill border border-slate-300 bg-paper px-4 type-small font-semibold text-ink hover:border-ink"
          href={hrefForPage(page + 1)}
          rel="next"
        >
          {copy.next}
        </Link>
      ) : (
        <span className="inline-flex min-h-11 items-center rounded-pill border border-slate-200 px-4 type-small text-slate-600">
          {copy.next}
        </span>
      )}
    </nav>
  );
}
