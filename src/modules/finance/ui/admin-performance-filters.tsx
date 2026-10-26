"use client";
import { useRef } from "react";
import { useRouter } from "next/navigation";
import type { Locale } from "@/src/modules/localization";
import type { AdminPerformanceQuery } from "@/src/modules/conversions";
import { financeText } from "./finance-copy";
export function AdminPerformanceFilters({
  query,
  locale,
  options,
  basePath,
  product = false,
  datesOnly = false,
  returnState,
}: {
  query: AdminPerformanceQuery;
  locale: Locale;
  options: {
    brands: { id: string; name: string }[];
    creators: { id: string; name: string }[];
  };
  basePath: string;
  product?: boolean;
  // Team views: only the period can change; no account pickers or searches.
  datesOnly?: boolean;
  returnState: Record<string, string>;
}) {
  const t = financeText(locale),
    router = useRouter(),
    dialog = useRef<HTMLDialogElement>(null);
  function fields(prefix: string) {
    return (
      <>
        <label htmlFor={`${prefix}-from`}>
          {t("From", "დასაწყისი")}
          <input
            id={`${prefix}-from`}
            name="from"
            type="date"
            defaultValue={query.from}
            required
          />
        </label>
        <label htmlFor={`${prefix}-to`}>
          {t("To (inclusive)", "დასასრული (ჩათვლით)")}
          <input
            id={`${prefix}-to`}
            name="to"
            type="date"
            defaultValue={query.to}
            required
          />
        </label>
        {!datesOnly && (
          <>
            <label htmlFor={`${prefix}-brand`}>
              {t("Brand", "ბრენდი")}
              <select
                id={`${prefix}-brand`}
                name="brandId"
                defaultValue={query.brandId || ""}
              >
                <option value="">{t("All brands", "ყველა ბრენდი")}</option>
                {options.brands.map((b) => (
                  <option value={b.id} key={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </label>
            <label htmlFor={`${prefix}-creator`}>
              {t("Creator", "კრეატორი")}
              <select
                id={`${prefix}-creator`}
                name="creatorId"
                defaultValue={query.creatorId || ""}
              >
                <option value="">{t("All creators", "ყველა კრეატორი")}</option>
                {options.creators.map((c) => (
                  <option value={c.id} key={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </label>
          </>
        )}
        {query.tab === "products" && !product && !datesOnly && (
          <>
            <label htmlFor={`${prefix}-status`}>
              {t("Product status", "პროდუქტის სტატუსი")}
              <select
                id={`${prefix}-status`}
                name="productStatus"
                defaultValue={query.productStatus}
              >
                <option value="ALL">
                  {t("All statuses", "ყველა სტატუსი")}
                </option>
                <option value="ACTIVE">{t("Active", "აქტიური")}</option>
                <option value="ARCHIVED">
                  {t("Archived", "დაარქივებული")}
                </option>
              </select>
            </label>
            <label htmlFor={`${prefix}-q`}>
              {t("Search products", "პროდუქტების ძიება")}
              <input
                id={`${prefix}-q`}
                name="q"
                type="search"
                maxLength={120}
                defaultValue={query.q}
                placeholder={t("Name or SKU", "სახელი ან SKU")}
              />
            </label>
          </>
        )}
        <label htmlFor={`${prefix}-sort`}>
          {t("Sort by", "დალაგება")}
          <select id={`${prefix}-sort`} name="sort" defaultValue={query.sort}>
            <option value="sales_value">
              {t("Sales value", "გაყიდვების ღირებულება")}
            </option>
            <option value="commission">{t("Commission", "საკომისიო")}</option>
            <option value="sales_count">
              {t("Attributed sales", "მიკუთვნებული გაყიდვები")}
            </option>
            <option value="clicks">{t("Clicks", "დაწკაპუნებები")}</option>
            <option value="name">{t("Name", "სახელი")}</option>
          </select>
        </label>
        <label htmlFor={`${prefix}-direction`}>
          {t("Order", "მიმდევრობა")}
          <select
            id={`${prefix}-direction`}
            name="direction"
            defaultValue={query.direction}
          >
            <option value="desc">{t("Descending", "კლებადობით")}</option>
            <option value="asc">{t("Ascending", "ზრდადობით")}</option>
          </select>
        </label>
      </>
    );
  }
  function submit(form: HTMLFormElement) {
    const data = new FormData(form),
      params = new URLSearchParams();
    for (const [key, value] of Object.entries({ ...query, ...returnState }))
      if (value !== undefined) params.set(key, String(value));
    for (const [key, value] of data) {
      if (value) params.set(key, String(value));
      else params.delete(key);
    }
    params.set("page", "1");
    dialog.current?.close();
    router.push(`${basePath}?${params}`);
  }
  return (
    <>
      <form
        className="finance-report-filters"
        onSubmit={(e) => {
          e.preventDefault();
          submit(e.currentTarget);
        }}
      >
        {fields("desktop")}
        <button className="finance-button">
          {t("Apply filters", "ფილტრების გამოყენება")}
        </button>
      </form>
      <div className="finance-mobile-filter-bar">
        <span>
          {query.from} — {query.to}
        </span>
        <button
          className="finance-button"
          onClick={() => dialog.current?.showModal()}
        >
          {t("Filters", "ფილტრები")}
        </button>
      </div>
      <dialog
        className="finance-filter-dialog"
        ref={dialog}
        aria-labelledby="report-filters-title"
      >
        <form
          className="finance-form"
          onSubmit={(e) => {
            e.preventDefault();
            submit(e.currentTarget);
          }}
        >
          <header className="finance-heading">
            <h2 id="report-filters-title">
              {t("Report filters", "ანგარიშის ფილტრები")}
            </h2>
            <button
              className="finance-button"
              type="button"
              onClick={() => dialog.current?.close()}
            >
              {t("Close", "დახურვა")}
            </button>
          </header>
          {fields("mobile")}
          <button className="finance-button finance-primary">
            {t("Apply filters", "ფილტრების გამოყენება")}
          </button>
        </form>
      </dialog>
    </>
  );
}
