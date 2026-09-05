"use client";

import {
  useOptimistic,
  useRef,
  useState,
  useTransition,
  type ReactNode,
} from "react";
import { usePathname, useRouter } from "next/navigation";
import { Icon } from "@/src/modules/design-system";
import {
  PRODUCT_TYPE_GROUPS,
  PRODUCT_TYPES,
  type ProductTypeValue,
} from "../domain/product-taxonomy";

export interface DiscoveryFilters {
  q: string;
  category: string;
  type: string;
  commission: string;
  brand: string;
  sort: string;
}

export function DiscoveryControls({
  filters,
  counts,
  brands,
  copy,
  productTypes,
  total,
  children,
}: {
  filters: DiscoveryFilters;
  counts: {
    productType: ProductTypeValue;
    brandId: string;
    commissionType: string;
    count: number;
  }[];
  brands: { id: string; name: string }[];
  copy: Record<string, string>;
  productTypes: Record<ProductTypeValue, string>;
  total: number;
  children: ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const dialog = useRef<HTMLDialogElement>(null);
  const [draft, setDraft] = useState(filters);
  const [pending, startTransition] = useTransition();
  const [selectedFilters, setSelectedFilters] = useOptimistic(filters);
  const activeCount = (value: DiscoveryFilters) =>
    [value.category, value.type, value.commission, value.brand].filter(Boolean)
      .length;
  const empty = {
    ...filters,
    category: "",
    type: "",
    commission: "",
    brand: "",
  };
  function navigate(value: DiscoveryFilters) {
    if (pending) return;
    const params = new URLSearchParams();
    Object.entries(value).forEach(([key, v]) => {
      if (v && !(key === "sort" && v === "newest")) params.set(key, v);
    });
    startTransition(() => {
      setSelectedFilters(value);
      router.push(`${pathname}${params.size ? `?${params}` : ""}`, {
        scroll: false,
      });
    });
  }
  function matchesType(type: string, category: string) {
    const group = PRODUCT_TYPE_GROUPS.find((group) => group.key === category);
    return !group || (group.values as readonly string[]).includes(type);
  }
  const previewCount = counts
    .filter(
      (row) =>
        matchesType(row.productType, draft.category) &&
        (!draft.type || row.productType === draft.type) &&
        (!draft.commission || row.commissionType === draft.commission) &&
        (!draft.brand || row.brandId === draft.brand),
    )
    .reduce((sum, row) => sum + row.count, 0);
  function filterFields(mobile: boolean) {
    const current = mobile ? draft : selectedFilters;
    const update = (values: Partial<DiscoveryFilters>) => {
      const next = { ...current, ...values };
      if (mobile) setDraft(next);
      else navigate(next);
    };
    const categoryOptions = [
      { key: "", label: copy.all },
      ...PRODUCT_TYPE_GROUPS.map((group) => ({
        key: group.key,
        label: copy[group.key],
      })),
    ];
    return (
      <div className="discovery-filter-fields">
        <details className="discovery-filter-group" open>
          <summary>
            {copy.category}
            <Chevron />
          </summary>
          <fieldset
            className="discovery-categories"
            aria-disabled={!mobile && pending}
          >
            <legend className="sr-only">{copy.category}</legend>
            {categoryOptions.map((option) => (
              <label key={option.key}>
                <input
                  type="radio"
                  name={`category-${mobile ? "mobile" : "desktop"}`}
                  value={option.key}
                  checked={current.category === option.key}
                  onChange={() => update({ category: option.key, type: "" })}
                />
                <span>{option.label}</span>
                <small>
                  {counts
                    .filter((row) => matchesType(row.productType, option.key))
                    .reduce((sum, row) => sum + row.count, 0)}
                </small>
              </label>
            ))}
          </fieldset>
        </details>
        {(
          [
            {
              key: "type",
              label: copy.productType,
              options: PRODUCT_TYPES.filter((type) =>
                matchesType(type, current.category),
              ).map((type) => ({ value: type, label: productTypes[type] })),
            },
            {
              key: "commission",
              label: copy.commissionType,
              options: [
                { value: "PERCENT", label: copy.percent },
                { value: "FIXED", label: copy.fixed },
              ],
            },
            {
              key: "brand",
              label: copy.brand,
              options: brands.map((brand) => ({
                value: brand.id,
                label: brand.name,
              })),
            },
          ] as const
        ).map((field) => (
          <details
            className="discovery-filter-group"
            key={field.key}
            open={Boolean(current[field.key])}
          >
            <summary>
              <span>{field.label}</span>
              <span className="discovery-filter-value">
                {field.options.find(
                  (option) => option.value === current[field.key],
                )?.label ?? copy.any}
              </span>
              <Chevron />
            </summary>
            <label className="discovery-select-field">
              <span className="sr-only">{field.label}</span>
              <select
                aria-disabled={!mobile && pending}
                value={current[field.key]}
                onChange={(event) =>
                  update({ [field.key]: event.target.value })
                }
              >
                <option value="">{copy.any}</option>
                {field.options.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
          </details>
        ))}
      </div>
    );
  }
  return (
    <div className="discovery-workspace" aria-busy={pending}>
      <header className="discovery-heading">
        <h1>{copy.title}</h1>
        <p>{copy.intro}</p>
        <form
          className="discovery-search"
          onSubmit={(event) => {
            event.preventDefault();
            if (pending) return;
            const form = new FormData(event.currentTarget);
            navigate({ ...filters, q: String(form.get("q") ?? "").trim() });
          }}
          role="search"
        >
          <Icon name="search" />
          <input
            key={filters.q}
            aria-disabled={pending}
            aria-label={copy.search}
            name="q"
            defaultValue={filters.q}
            placeholder={copy.searchPlaceholder}
            type="search"
          />
          <button
            type="submit"
            aria-label={copy.search}
            aria-disabled={pending}
          >
            <Icon name="search" />
          </button>
        </form>
      </header>
      <aside className="discovery-sidebar" aria-label={copy.filters}>
        <div className="discovery-filter-heading">
          <h2>{copy.filters}</h2>
          <button
            type="button"
            aria-disabled={pending}
            onClick={() => navigate(empty)}
          >
            {copy.clear}
          </button>
        </div>
        {filterFields(false)}
      </aside>
      <section className="discovery-results" aria-label={copy.products}>
        <div className="discovery-toolbar">
          <p className="discovery-result-count" role="status">
            {copy.results?.replace("{count}", String(total))}
          </p>
          <button
            className="discovery-filter-trigger"
            aria-disabled={pending}
            type="button"
            aria-haspopup="dialog"
            onClick={() => {
              if (pending) return;
              setDraft(filters);
              dialog.current?.showModal();
            }}
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.7"
              aria-hidden="true"
            >
              <path d="M3 6h18M3 12h18M3 18h18M7 3v6M16 9v6M9 15v6" />
            </svg>
            {copy.filters}
            {activeCount(filters) ? ` (${activeCount(filters)})` : ""}
          </button>
          <label className="discovery-sort">
            <span>{copy.sort}</span>
            <select
              aria-disabled={pending}
              aria-label={copy.sort}
              value={selectedFilters.sort}
              onChange={(event) =>
                navigate({ ...filters, sort: event.target.value })
              }
            >
              {["newest", "title", "price_low", "commission_high"].map(
                (value) => (
                  <option key={value} value={value}>
                    {copy[value === "title" ? "titleSort" : value]}
                  </option>
                ),
              )}
            </select>
          </label>
        </div>
        {children}
      </section>
      <dialog
        ref={dialog}
        className="discovery-filter-sheet"
        aria-labelledby="discovery-sheet-title"
        onClick={(event) => {
          if (event.target === event.currentTarget) {
            const rect = event.currentTarget.getBoundingClientRect();
            if (
              event.clientY < rect.top ||
              event.clientX < rect.left ||
              event.clientX > rect.right
            )
              dialog.current?.close();
          }
        }}
      >
        <div className="discovery-sheet-handle" aria-hidden="true" />
        <header className="discovery-sheet-heading">
          <div>
            <h2 id="discovery-sheet-title">
              {copy.filters}
              {activeCount(draft) > 0 ? (
                <span>{activeCount(draft)}</span>
              ) : null}
            </h2>
            <button
              className="discovery-clear"
              type="button"
              onClick={() => setDraft(empty)}
            >
              {copy.clear}
            </button>
          </div>
          <button
            className="icon-button"
            autoFocus
            aria-label={copy.close}
            type="button"
            onClick={() => dialog.current?.close()}
          >
            <Icon name="close" />
          </button>
        </header>
        <div className="discovery-sheet-body">{filterFields(true)}</div>
        <footer>
          <button
            className="discovery-primary"
            type="button"
            onClick={() => {
              navigate(draft);
              dialog.current?.close();
            }}
          >
            {copy.showProducts?.replace("{count}", String(previewCount))}
          </button>
        </footer>
      </dialog>
    </div>
  );
}

function Chevron() {
  return (
    <svg
      className="discovery-chevron"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      aria-hidden="true"
    >
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}
