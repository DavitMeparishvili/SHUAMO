"use client";

import Decimal from "decimal.js";
import Image from "next/image";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import {
  Banner,
  Button,
  Field,
  Icon,
  MoneyAmount,
  Select,
} from "@/src/modules/design-system";
import { Money } from "@/src/modules/shared";
import {
  AFFILIATE_CHANNELS,
  PAYOUT_TIMINGS,
  PROHIBITED_PROMOTION_METHODS,
} from "../domain/affiliate-terms";
import { PRODUCT_TYPES } from "../domain/product-taxonomy";
import { parseProductRate } from "../domain/product-rate";
import { validateProductInput } from "../application/product-input";
import { productFormInput } from "../application/product-form-input";
import { ProductImageGallery } from "./product-image-gallery";
import { ProductTermGroup } from "./product-term-group";
import { editorCopy } from "./product-editor-copy";
import type { ProductFormCopy, ProductFormValue } from "./product-form-types";
export type { ProductFormCopy, ProductFormValue } from "./product-form-types";

type ActionResult = {
  error?: string;
  redirect?: string;
  saved?: boolean;
} | void;
type Fields = Record<string, string>;
const dateValue = (value: Date | string | null | undefined) =>
  value
    ? (value instanceof Date ? value.toISOString() : value).slice(0, 10)
    : "";
function initialFields(initial?: ProductFormValue): Fields {
  return {
    sku: initial?.sku ?? "",
    title: initial?.title ?? "",
    description: initial?.description ?? "",
    productType: initial?.productType ?? "OTHER",
    priceGel: initial?.priceGel ?? "",
    backlinkUrl: initial?.backlinkUrl ?? "",
    commissionType: initial?.commissionType ?? "PERCENT",
    commissionDisplay: initial
      ? initial.commissionType === "PERCENT"
        ? new Decimal(initial.commissionValue).times(100).toString()
        : initial.commissionValue
      : "",
    cookieWindowDays: String(initial?.cookieWindowDays ?? 30),
    payoutTiming: initial?.payoutTiming ?? "AFTER_CONFIRMED_CONVERSION",
    availableRegions: initial?.availableRegions.join(", ") ?? "",
    couponPolicy: initial?.couponPolicy ?? "",
    returnPolicy: initial?.returnPolicy ?? "",
    contentRequirements: initial?.contentRequirements ?? "",
    specialTerms: initial?.specialTerms ?? "",
    offerStartsAt: dateValue(initial?.offerStartsAt),
    offerEndsAt: dateValue(initial?.offerEndsAt),
  };
}

export function ProductForm({
  copy,
  action,
  initial,
  archiveAction,
  locale = "en",
  brandName = "",
  uploadReservation = "",
  status = "ACTIVE",
}: {
  copy: ProductFormCopy;
  action: (formData: FormData) => ActionResult | Promise<ActionResult>;
  initial?: ProductFormValue;
  archiveAction?: () => ActionResult | Promise<ActionResult>;
  locale?: "en" | "ka";
  brandName?: string;
  uploadReservation?: string;
  status?: "ACTIVE" | "ARCHIVED";
}) {
  const ui = editorCopy[locale];
  const router = useRouter();
  const editing = !!initial;
  const [fields, setFields] = useState(() => initialFields(initial));
  const [images, setImages] = useState<string[]>([
    ...(initial?.imageUrls ?? []),
  ]);
  const [channels, setChannels] = useState<string[]>([
    ...(initial?.allowedChannels ?? []),
  ]);
  const [restrictions, setRestrictions] = useState<string[]>([
    ...(initial?.prohibitedPromotionMethods ?? []),
  ]);
  const stateKey = JSON.stringify({ fields, images, channels, restrictions });
  const [baseline, setBaseline] = useState(stateKey);
  const [busy, setBusy] = useState(false);
  const savingRef = useRef(false);
  const [progress, setProgress] = useState<number>();
  const uploadingRef = useRef(false);
  const [failed, setFailed] = useState<{
    files: File[];
    message: string;
    retryable: boolean;
  }>();
  const [errors, setErrors] = useState<Fields>({});
  const [serverError, setServerError] = useState("");
  const [section, setSection] = useState("product-details");
  const formRef = useRef<HTMLFormElement>(null);
  const previewRef = useRef<HTMLDialogElement>(null);
  const archiveRef = useRef<HTMLDialogElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const dragRef = useRef<number | null>(null);
  const dirty = baseline !== stateKey || progress !== undefined || !!failed;
  const dirtyRef = useRef(dirty);
  dirtyRef.current = dirty;
  const navigating = useRef(false);
  const historyGuard = useRef(false);
  const restoringHistory = useRef(false);
  useEffect(() => {
    const leave = (event: Event) => {
      if (
        savingRef.current ||
        (dirtyRef.current && !window.confirm(ui.discard))
      )
        event.preventDefault();
      else navigating.current = true;
    };
    const unload = (event: BeforeUnloadEvent) => {
      if ((dirtyRef.current || savingRef.current) && !navigating.current) {
        event.preventDefault();
        event.returnValue = "";
      }
    };
    const click = (event: MouseEvent) => {
      const link = (event.target as Element).closest?.(
        "a[href]",
      ) as HTMLAnchorElement | null;
      if (
        !link ||
        link.target === "_blank" ||
        link.hasAttribute("download") ||
        event.ctrlKey ||
        event.metaKey ||
        event.shiftKey
      )
        return;
      const destination = new URL(link.href);
      if (
        destination.pathname === location.pathname &&
        destination.search === location.search &&
        destination.hash
      )
        return;
      if (
        savingRef.current ||
        (dirtyRef.current && !window.confirm(ui.discard))
      ) {
        event.preventDefault();
        event.stopPropagation();
      } else navigating.current = true;
    };
    // A same-URL history entry catches Back before Next changes the route.
    // This also protects browsers without the Navigation API.
    const pop = (event: PopStateEvent) => {
      if (restoringHistory.current) {
        restoringHistory.current = false;
        event.stopImmediatePropagation();
        return;
      }
      if (!historyGuard.current || navigating.current) return;
      event.stopImmediatePropagation();
      if (previewRef.current?.open) {
        previewRef.current.close();
        restoringHistory.current = true;
        history.go(1);
      } else if (
        savingRef.current ||
        (dirtyRef.current && !window.confirm(ui.discard))
      ) {
        restoringHistory.current = true;
        history.go(1);
      } else {
        historyGuard.current = false;
        navigating.current = true;
        history.back();
      }
    };
    window.addEventListener("beforeunload", unload);
    window.addEventListener("workspace:before-leave", leave);
    document.addEventListener("click", click, true);
    window.addEventListener("popstate", pop, true);
    return () => {
      window.removeEventListener("beforeunload", unload);
      window.removeEventListener("workspace:before-leave", leave);
      document.body.style.overflow = "";
      document.removeEventListener("click", click, true);
      window.removeEventListener("popstate", pop, true);
    };
  }, [ui.discard]);
  useEffect(() => {
    if (dirty && !historyGuard.current) {
      history.pushState(
        { ...history.state, productEditorGuard: true },
        "",
        location.href,
      );
      historyGuard.current = true;
    } else if (!dirty && historyGuard.current && !navigating.current) {
      historyGuard.current = false;
      restoringHistory.current = true;
      history.back();
    }
  }, [dirty]);
  useEffect(() => {
    if (serverError) document.getElementById("editor-save-error")?.focus();
  }, [serverError]);
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries)
          if (entry.isIntersecting) setSection(entry.target.id);
      },
      { rootMargin: "-15% 0px -65% 0px" },
    );
    formRef.current
      ?.querySelectorAll("[data-editor-section]")
      .forEach((node) => observer.observe(node));
    return () => observer.disconnect();
  }, []);
  function change(name: string, value: string) {
    setFields((current) => ({ ...current, [name]: value }));
    setErrors((current) => ({ ...current, [name]: "" }));
  }
  let storedRate = "";
  try {
    if (fields.commissionDisplay?.trim())
      storedRate = new Decimal(fields.commissionDisplay)
        .div(fields.commissionType === "PERCENT" ? 100 : 1)
        .toString();
  } catch {
    /* Invalid input stays visible. */
  }
  const rate = parseProductRate({
    type: fields.commissionType === "FIXED" ? "FIXED" : "PERCENT",
    value: storedRate,
  });
  let price: Money | undefined;
  try {
    const parsed = Money.of(fields.priceGel ?? "");
    parsed.toStorageString();
    if (!parsed.isNegative()) price = parsed;
  } catch {
    /* Empty or invalid estimate. */
  }
  const earnings =
    rate.ok && (fields.commissionType === "FIXED" || price)
      ? rate.value.commissionFor(price ?? Money.ZERO, 1).roundToTetri()
      : undefined;
  function jump(id: string) {
    setSection(id);
    const target = document.getElementById(id);
    if (target instanceof HTMLDetailsElement) target.open = true;
    target?.scrollIntoView({ behavior: "smooth", block: "start" });
  }
  function reveal(next: Fields) {
    setErrors(next);
    const names = Object.keys(next);
    for (const name of names) {
      let element: HTMLElement | null = document.getElementById(name);
      while (element) {
        if (element instanceof HTMLDetailsElement) element.open = true;
        element = element.parentElement;
      }
    }
    requestAnimationFrame(() =>
      document.getElementById(names[0] ?? "")?.focus(),
    );
  }
  function validate(data: FormData) {
    const next: Fields = {};
    formRef.current
      ?.querySelectorAll<
        HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
      >("input:not([type=hidden]), select, textarea")
      .forEach((input) => {
        if (!input.validity.valid)
          next[input.id] = input.validity.valueMissing
            ? ui.required
            : ui.invalid;
      });
    if (!fields.title?.trim()) next.title = ui.required;
    if (!fields.sku?.trim()) next.sku = ui.required;
    if (!price) next.priceGel = ui.invalid;
    if (!rate.ok) next.commissionDisplay = ui.invalid;
    try {
      const url = new URL(fields.backlinkUrl ?? "");
      if (url.protocol !== "https:" && url.hostname !== "localhost")
        next.backlinkUrl = ui.url;
    } catch {
      next.backlinkUrl = ui.url;
    }
    if (
      fields.offerStartsAt &&
      fields.offerEndsAt &&
      fields.offerEndsAt <= fields.offerStartsAt
    )
      next.offerEndsAt = ui.dates;
    if (
      (fields.availableRegions ?? "")
        .split(",")
        .some((value) => value.trim() && !/^[a-z]{2}$/i.test(value.trim()))
    )
      next.availableRegions = ui.regions;
    const parsed = validateProductInput("preview", productFormInput(data));
    if (!parsed.ok && !Object.keys(next).length)
      next[
        (
          {
            invalid_sku: "sku",
            invalid_title: "title",
            invalid_price: "priceGel",
            invalid_backlink_url: "backlinkUrl",
            invalid_rate: "commissionDisplay",
            invalid_images: "image-upload",
            invalid_product_type: "productType",
            invalid_affiliate_terms: "cookieWindowDays",
          } as const
        )[parsed.error]
      ] = ui.invalid;
    if (Object.keys(next).length) {
      reveal(next);
      return false;
    }
    setErrors({});
    return true;
  }
  async function save(data: FormData) {
    if (savingRef.current || uploadingRef.current || failed || !validate(data))
      return;
    savingRef.current = true;
    setBusy(true);
    setServerError("");
    try {
      const result = await action(data);
      if (result?.error) {
        if (result.error === "duplicate_sku") reveal({ sku: ui.duplicate });
        else setServerError(ui.saveError);
        return;
      }
      setBaseline(stateKey);
      dirtyRef.current = false;
      if (result?.redirect) {
        navigating.current = true;
        router.replace(result.redirect);
      }
    } catch {
      setServerError(ui.saveError);
    } finally {
      savingRef.current = false;
      setBusy(false);
    }
  }
  async function upload(files: File[]) {
    if (uploadingRef.current || savingRef.current) return;
    if (images.length + files.length > 8) {
      setFailed({ files: [], message: ui.uploadLimit, retryable: false });
      return;
    }
    uploadingRef.current = true;
    setFailed(undefined);
    setProgress(0);
    for (let index = 0; index < files.length; index++) {
      const file = files[index]!;
      try {
        if (file.size > 5 * 1024 * 1024) throw new Error(copy.fileTooLarge);
        if (!["image/jpeg", "image/png", "image/webp"].includes(file.type))
          throw new Error(copy.imageTypes);
        const endpoint = initial?.id
          ? `/api/brand/products/${encodeURIComponent(initial.id)}/images/presign`
          : "/api/brand/products/images/presign";
        const response = await fetch(endpoint, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            contentType: file.type,
            reservation: uploadReservation,
          }),
        });
        if (!response.ok) throw new Error(copy.uploadFailed);
        const urls = (await response.json()) as {
          uploadUrl: string;
          publicUrl: string;
        };
        await new Promise<void>((resolve, reject) => {
          const request = new XMLHttpRequest();
          request.open("PUT", urls.uploadUrl);
          request.setRequestHeader("Content-Type", file.type);
          request.timeout = 120000;
          request.upload.onprogress = (event) => {
            if (event.lengthComputable)
              setProgress(
                Math.round(
                  ((index + event.loaded / event.total) / files.length) * 100,
                ),
              );
          };
          request.onload = () =>
            request.status >= 200 && request.status < 300
              ? resolve()
              : reject(new Error(copy.uploadFailed));
          request.onerror = request.ontimeout = () =>
            reject(new Error(copy.uploadFailed));
          request.send(file);
        });
        setImages((current) => [...current, urls.publicUrl]);
      } catch (error) {
        setFailed({
          files: files.slice(index),
          message: error instanceof Error ? error.message : copy.uploadFailed,
          retryable:
            file.size <= 5 * 1024 * 1024 &&
            ["image/jpeg", "image/png", "image/webp"].includes(file.type),
        });
        break;
      }
    }
    uploadingRef.current = false;
    setProgress(undefined);
    if (fileRef.current) fileRef.current.value = "";
  }
  function moveImage(from: number, to: number) {
    if (to < 0 || to >= images.length) return;
    setImages((current) => {
      const next = [...current];
      const [item] = next.splice(from, 1);
      next.splice(to, 0, item!);
      return next;
    });
  }
  const field = (
    name: string,
    label: string,
    options: {
      required?: boolean;
      type?: string;
      min?: string;
      max?: string;
      step?: string;
      hint?: string;
    } = {},
  ) => (
    <Field
      key={name}
      id={name}
      name={name}
      label={label}
      value={fields[name] ?? ""}
      onChange={(event) => change(name, event.currentTarget.value)}
      {...(errors[name] ? { error: errors[name] } : {})}
      {...options}
    />
  );
  const textarea = (name: string, label: string, limit?: number) => (
    <div className="editor-field" key={name}>
      <label htmlFor={name}>{label}</label>
      <textarea
        id={name}
        name={name}
        value={fields[name] ?? ""}
        rows={name === "description" ? 4 : 3}
        maxLength={limit}
        aria-invalid={!!errors[name]}
        aria-describedby={errors[name] ? `${name}-error` : undefined}
        onChange={(event) => change(name, event.currentTarget.value)}
      />
      {errors[name] && (
        <p id={`${name}-error`} className="editor-error">
          {errors[name]}
        </p>
      )}
    </div>
  );
  const select = (
    name: string,
    label: string,
    values: readonly string[],
    labels: Record<string, string>,
  ) => (
    <Select
      id={name}
      name={name}
      label={label}
      value={fields[name]}
      required
      onChange={(event) => change(name, event.currentTarget.value)}
    >
      {values.map((value) => (
        <option key={value} value={value}>
          {labels[value]}
        </option>
      ))}
    </Select>
  );
  const choices = (
    name: string,
    values: readonly string[],
    labels: Record<string, string>,
    selected: string[],
    set: (values: string[]) => void,
  ) =>
    values.map((value) => (
      <label className="editor-choice" key={value}>
        <input
          type="checkbox"
          name={name}
          value={value}
          checked={selected.includes(value)}
          onChange={(event) =>
            set(
              event.currentTarget.checked
                ? [...selected, value]
                : selected.filter((item) => item !== value),
            )
          }
        />
        {labels[value]}
      </label>
    ));
  const group = (number: number, title: string, children: ReactNode) => (
    <ProductTermGroup initiallyOpen={number === 1}>
      <summary>
        <span className="product-detail-term-number">{number}</span>
        <span className="product-detail-term-title">{title}</span>
        <Icon name="chevron" />
      </summary>
      <div className="editor-term-body">{children}</div>
    </ProductTermGroup>
  );
  const termsChanged =
    (editing &&
      Object.keys(fields).some(
        (name) =>
          ![
            "sku",
            "title",
            "description",
            "productType",
            "priceGel",
            "backlinkUrl",
          ].includes(name) &&
          fields[name] !== JSON.parse(baseline).fields[name],
      )) ||
    (editing &&
      (JSON.stringify(channels) !==
        JSON.stringify(JSON.parse(baseline).channels) ||
        JSON.stringify(restrictions) !==
          JSON.stringify(JSON.parse(baseline).restrictions)));
  const preview = (
    <div className="editor-preview-content">
      <h2>{ui.previewTitle}</h2>
      <p className="editor-muted">{ui.previewIntro}</p>
      <ProductImageGallery
        key={images.join("|")}
        images={images.slice(0, 1)}
        title={fields.title || ui.untitled}
        copy={{
          image: ui.image,
          of: ui.of,
          enlarge: ui.enlarge,
          close: ui.close,
          empty: ui.emptyImage,
        }}
      />
      {brandName && <p className="editor-brand">{brandName}</p>}
      <h3>{fields.title || ui.untitled}</h3>
      <div className="editor-estimate">
        <span>{ui.estimate}</span>
        <strong>
          {earnings ? (
            <MoneyAmount value={earnings} />
          ) : (
            <span aria-label={ui.unspecified}>{"\u2014"}</span>
          )}
        </strong>
        <small>{ui.sale}</small>
      </div>
      <dl className="editor-preview-facts">
        <div>
          <dt>{copy.price}</dt>
          <dd>{price ? <MoneyAmount value={price} size="sm" /> : "\u2014"}</dd>
        </div>
        <div>
          <dt>{ui.attribution}</dt>
          <dd>
            {/^[0-9]+$/.test(fields.cookieWindowDays ?? "") &&
            Number(fields.cookieWindowDays) >= 1 &&
            Number(fields.cookieWindowDays) <= 3650
              ? `${fields.cookieWindowDays} ${copy.days}`
              : "\u2014"}
          </dd>
        </div>
      </dl>
      {fields.cookieWindowDays !== "30" && (
        <p className="editor-impact">{ui.attributionLimit}</p>
      )}
      {fields.description && (
        <p className="editor-preview-description">{fields.description}</p>
      )}
      <details className="editor-preview-terms">
        <summary>{ui.termsSummary}</summary>
        <dl>
          {[
            [
              copy.payoutTiming,
              copy.payoutTimings[
                fields.payoutTiming as keyof typeof copy.payoutTimings
              ],
            ],
            [
              copy.allowedChannels,
              channels
                .map(
                  (value) =>
                    copy.channelLabels[
                      value as keyof typeof copy.channelLabels
                    ],
                )
                .join(", ") || ui.noRestrictions,
            ],
            [
              copy.prohibitedMethods,
              restrictions
                .map(
                  (value) =>
                    copy.prohibitedLabels[
                      value as keyof typeof copy.prohibitedLabels
                    ],
                )
                .join(", ") || ui.noRestrictions,
            ],
            [copy.regions, fields.availableRegions || ui.noRestrictions],
            [copy.contentRequirements, fields.contentRequirements],
            [copy.couponPolicy, fields.couponPolicy],
            [copy.returnPolicy, fields.returnPolicy],
            [copy.specialTerms, fields.specialTerms],
            [copy.offerStartsAt, fields.offerStartsAt],
            [copy.offerEndsAt, fields.offerEndsAt],
          ].map(([label, value]) => (
            <div key={label}>
              <dt>{label}</dt>
              <dd>{value || ui.unspecified}</dd>
            </div>
          ))}
        </dl>
      </details>
    </div>
  );
  return (
    <div className="workspace-content product-editor-page">
      <header className="editor-header">
        <a className="editor-breadcrumb" href={`/${locale}/brand/products`}>
          <Icon name="arrow" />
          {ui.products}
        </a>
        <div className="editor-heading-row">
          <div>
            <div className="editor-title">
              <h1>{editing ? ui.edit : ui.add}</h1>
              {editing && (
                <span
                  className={`editor-status ${status === "ARCHIVED" ? "is-archived" : ""}`}
                >
                  {status === "ACTIVE" ? ui.active : ui.archived}
                </span>
              )}
            </div>
            <p>{editing ? JSON.parse(baseline).fields.title : ui.intro}</p>
          </div>
          {editing && (
            <details className="editor-overflow">
              <summary aria-label={ui.more}>
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <circle cx="12" cy="5" r="1.6" />
                  <circle cx="12" cy="12" r="1.6" />
                  <circle cx="12" cy="19" r="1.6" />
                </svg>
              </summary>
              <div>
                <a href={`/${locale}/brand/products/${initial.id}/creators`}>
                  {ui.creators}
                </a>
                {archiveAction && (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => archiveRef.current?.showModal()}
                  >
                    {copy.archive}
                  </button>
                )}
              </div>
            </details>
          )}
        </div>
      </header>
      <nav className="editor-sections" aria-label={ui.jump}>
        {[
          ["product-details", ui.details],
          ["commission-offer", copy.sectionOffer],
          ["affiliate-terms", copy.sectionTerms],
        ].map(([id, label]) => (
          <button
            type="button"
            key={id}
            aria-current={section === id ? "location" : undefined}
            onClick={() => jump(id!)}
          >
            {label}
          </button>
        ))}
      </nav>
      <div className="editor-jump">
        <Select
          id="editor-jump"
          label={ui.jump}
          value={section}
          onChange={(event) => jump(event.currentTarget.value)}
        >
          <option value="product-details">{ui.details}</option>
          <option value="commission-offer">{copy.sectionOffer}</option>
          <option value="affiliate-terms">{copy.sectionTerms}</option>
        </Select>
      </div>
      <div className="editor-layout">
        <form
          ref={formRef}
          className="product-editor"
          noValidate
          onSubmit={(event) => {
            event.preventDefault();
            void save(new FormData(event.currentTarget));
          }}
          aria-busy={busy}
        >
          <input
            type="hidden"
            name="uploadReservation"
            value={uploadReservation}
          />
          <input type="hidden" name="commissionValue" value={storedRate} />
          <fieldset className="editor-fields" disabled={busy}>
            <section
              className="editor-card"
              id="product-details"
              data-editor-section
            >
              <h2>{ui.details}</h2>
              <p className="editor-muted">{copy.sectionProductIntro}</p>
              <div className="editor-stack">
                {field("title", copy.title, { required: true })}
                <div className="editor-two">
                  {field("sku", copy.sku, { required: true })}
                  {select(
                    "productType",
                    copy.productType,
                    PRODUCT_TYPES,
                    copy.productTypes,
                  )}
                </div>
                {textarea("description", copy.description)}
                {field("priceGel", copy.price, {
                  required: true,
                  type: "number",
                  min: "0",
                  step: "0.01",
                })}
                {field("backlinkUrl", ui.productUrl, {
                  required: true,
                  type: "url",
                })}
                <div className="editor-images">
                  <h3>{ui.images}</h3>
                  <p className="editor-muted">{copy.imageTypes}</p>
                  <div className="editor-gallery">
                    {images.map((url, index) => (
                      <div
                        className="editor-thumbnail"
                        key={url}
                        draggable={!busy && progress === undefined}
                        onDragStart={() => {
                          dragRef.current = index;
                        }}
                        onDragOver={(event) => event.preventDefault()}
                        onDrop={(event) => {
                          event.preventDefault();
                          if (dragRef.current !== null)
                            moveImage(dragRef.current, index);
                          dragRef.current = null;
                        }}
                      >
                        <Image
                          src={url}
                          alt={`${ui.image} ${index + 1}`}
                          fill
                          sizes="140px"
                          unoptimized
                        />
                        {index === 0 && (
                          <span className="editor-primary">
                            {copy.primaryImage}
                          </span>
                        )}
                        <details className="editor-image-menu">
                          <summary
                            aria-label={`${ui.more}: ${ui.image} ${index + 1}`}
                          >
                            <Icon name="menu" />
                          </summary>
                          <div>
                            <button
                              type="button"
                              disabled={index === 0}
                              onClick={() => moveImage(index, 0)}
                            >
                              {ui.primary}
                            </button>
                            <button
                              type="button"
                              disabled={index === 0}
                              onClick={() => moveImage(index, index - 1)}
                            >
                              {copy.moveEarlier}
                            </button>
                            <button
                              type="button"
                              disabled={index === images.length - 1}
                              onClick={() => moveImage(index, index + 1)}
                            >
                              {copy.moveLater}
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                setImages((current) =>
                                  current.filter((_, item) => item !== index),
                                )
                              }
                            >
                              {copy.removeImage}
                            </button>
                          </div>
                        </details>
                        <input type="hidden" name="imageUrls" value={url} />
                      </div>
                    ))}
                    <label
                      className="editor-add-image focus-within:ring-4"
                      aria-disabled={
                        images.length >= 8 || progress !== undefined
                      }
                    >
                      <svg
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.8"
                        aria-hidden="true"
                      >
                        <path d="M12 5v14M5 12h14" />
                      </svg>
                      <span>{copy.addImage}</span>
                      <input
                        className="sr-only"
                        id="image-upload"
                        aria-label={copy.addImage}
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        multiple
                        ref={fileRef}
                        disabled={images.length >= 8 || progress !== undefined}
                        onChange={(event) => {
                          const files = Array.from(
                            event.currentTarget.files ?? [],
                          );
                          if (files.length) void upload(files);
                        }}
                      />
                    </label>
                  </div>
                  {progress !== undefined && (
                    <div role="status" className="editor-upload-progress">
                      {copy.uploading} {progress}%
                      <progress
                        aria-label={copy.uploading}
                        max="100"
                        value={progress}
                      />
                    </div>
                  )}
                  {failed && (
                    <div role="alert" className="editor-upload-error">
                      <p>{failed.message}</p>
                      {failed.retryable && (
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => void upload(failed.files)}
                        >
                          {copy.retry}
                        </Button>
                      )}
                      <Button
                        type="button"
                        variant="ghost"
                        onClick={() => setFailed(undefined)}
                      >
                        {ui.dismiss}
                      </Button>
                    </div>
                  )}
                  {errors["image-upload"] && (
                    <p className="editor-error">{errors["image-upload"]}</p>
                  )}
                </div>
              </div>
            </section>
            <details
              className="editor-card editor-offer"
              id="commission-offer"
              data-editor-section
              open
            >
              <summary>
                <span>
                  <h2>{copy.sectionOffer}</h2>
                  <span className="editor-muted">{ui.offerIntro}</span>
                </span>
                <Icon name="chevron" />
              </summary>
              <div className="editor-stack">
                <fieldset className="editor-rate-switch">
                  <legend className="sr-only">{copy.rateType}</legend>
                  {(["PERCENT", "FIXED"] as const).map((value) => (
                    <label
                      key={value}
                      className={
                        fields.commissionType === value ? "is-selected" : ""
                      }
                    >
                      <input
                        className="sr-only"
                        name="commissionType"
                        type="radio"
                        checked={fields.commissionType === value}
                        value={value}
                        onChange={() => {
                          change("commissionType", value);
                          change("commissionDisplay", "");
                        }}
                      />
                      {value === "PERCENT" ? ui.percent : ui.fixed}
                    </label>
                  ))}
                </fieldset>
                <div className="editor-two">
                  {field(
                    "commissionDisplay",
                    `${copy.commission} (${fields.commissionType === "PERCENT" ? "%" : "GEL"})`,
                    {
                      required: true,
                      type: "number",
                      min: "0",
                      max:
                        fields.commissionType === "PERCENT"
                          ? "100"
                          : "99999.9999",
                      step:
                        fields.commissionType === "PERCENT" ? "0.01" : "0.0001",
                    },
                  )}
                  {field(
                    "cookieWindowDays",
                    `${ui.attribution} (${copy.days})`,
                    {
                      required: true,
                      type: "number",
                      min: "1",
                      max: "3650",
                      step: "1",
                      ...(fields.cookieWindowDays !== "30"
                        ? { hint: ui.attributionLimit }
                        : {}),
                    },
                  )}
                </div>
                <div className="editor-offer-estimate">
                  <Icon name="help" />
                  <span>
                    {ui.estimate}:{" "}
                    <strong>
                      {earnings ? (
                        <MoneyAmount value={earnings} size="sm" />
                      ) : (
                        "\u2014"
                      )}
                    </strong>
                  </span>
                </div>
                {termsChanged && <p className="editor-impact">{ui.impact}</p>}
              </div>
            </details>
            <section
              className="editor-card editor-terms"
              id="affiliate-terms"
              data-editor-section
            >
              <h2>{copy.sectionTerms}</h2>
              <p className="editor-muted">{copy.sectionTermsIntro}</p>
              {group(
                1,
                ui.group1,
                <>
                  {select(
                    "payoutTiming",
                    copy.payoutTiming,
                    PAYOUT_TIMINGS,
                    copy.payoutTimings,
                  )}
                  <div className="editor-two">
                    {field(
                      "offerStartsAt",
                      `${copy.offerStartsAt} (${copy.optional})`,
                      { type: "date" },
                    )}
                    {field(
                      "offerEndsAt",
                      `${copy.offerEndsAt} (${copy.optional})`,
                      { type: "date" },
                    )}
                  </div>
                </>,
              )}
              {group(
                2,
                ui.group2,
                <>
                  <fieldset>
                    <legend>{copy.allowedChannels}</legend>
                    <div className="editor-choices">
                      {choices(
                        "allowedChannels",
                        AFFILIATE_CHANNELS.slice(0, 3),
                        copy.channelLabels,
                        channels,
                        setChannels,
                      )}
                    </div>
                    <details className="editor-options">
                      <summary>
                        {ui.channels}
                        {channels.filter(
                          (value) =>
                            !AFFILIATE_CHANNELS.slice(0, 3).includes(
                              value as (typeof AFFILIATE_CHANNELS)[number],
                            ),
                        ).length > 0
                          ? ` (${channels.filter((value) => !AFFILIATE_CHANNELS.slice(0, 3).includes(value as (typeof AFFILIATE_CHANNELS)[number])).length})`
                          : ""}
                      </summary>
                      <div className="editor-choices">
                        {choices(
                          "allowedChannels",
                          AFFILIATE_CHANNELS.slice(3),
                          copy.channelLabels,
                          channels,
                          setChannels,
                        )}
                      </div>
                    </details>
                  </fieldset>
                  <fieldset>
                    <legend>{copy.prohibitedMethods}</legend>
                    <details className="editor-options">
                      <summary>
                        {restrictions.length
                          ? restrictions
                              .map(
                                (value) =>
                                  copy.prohibitedLabels[
                                    value as keyof typeof copy.prohibitedLabels
                                  ],
                              )
                              .join(", ")
                          : ui.restrictions}
                      </summary>
                      <div className="editor-choices">
                        {choices(
                          "prohibitedPromotionMethods",
                          PROHIBITED_PROMOTION_METHODS,
                          copy.prohibitedLabels,
                          restrictions,
                          setRestrictions,
                        )}
                      </div>
                    </details>
                  </fieldset>
                  <div className="editor-two">
                    {textarea(
                      "contentRequirements",
                      copy.contentRequirements,
                      2000,
                    )}
                    {textarea("couponPolicy", copy.couponPolicy, 2000)}
                  </div>
                </>,
              )}
              {group(
                3,
                ui.group3,
                <>
                  {field("availableRegions", copy.regions, {
                    hint: copy.regionsHint,
                  })}
                  {textarea("returnPolicy", copy.returnPolicy, 2000)}
                  {textarea("specialTerms", copy.specialTerms, 2000)}
                </>,
              )}
            </section>
          </fieldset>
          {serverError && (
            <div role="alert" id="editor-save-error" tabIndex={-1}>
              <Banner tone="danger" title={ui.saveError} body={serverError} />
            </div>
          )}
          <div className="editor-action-bar">
            <div className={dirty ? "is-dirty" : ""} role="status">
              <span className="editor-state-dot" />
              {busy
                ? ui.saving
                : editing
                  ? dirty
                    ? ui.unsaved
                    : ui.saved
                  : ui.notPublished}
            </div>
            <div className="editor-action-buttons">
              <Button
                type="button"
                variant="outline"
                onClick={() => previewRef.current?.showModal()}
              >
                {ui.preview}
              </Button>
              <Button
                type="submit"
                disabled={
                  busy ||
                  progress !== undefined ||
                  !!failed ||
                  (editing && !dirty)
                }
              >
                {busy ? ui.saving : editing ? copy.save : copy.publish}
              </Button>
            </div>
          </div>
        </form>
        <aside className="editor-preview" aria-label={ui.previewTitle}>
          {preview}
        </aside>
      </div>
      <dialog
        className="editor-preview-dialog"
        aria-label={ui.previewTitle}
        ref={previewRef}
        onClose={() => {
          document.body.style.overflow = "";
        }}
        onToggle={(event) => {
          if ((event.currentTarget as HTMLDialogElement).open)
            document.body.style.overflow = "hidden";
        }}
      >
        <header>
          <Button
            type="button"
            variant="outline"
            onClick={() => previewRef.current?.close()}
          >
            <Icon name="arrow" />
            {ui.back}
          </Button>
        </header>
        {preview}
      </dialog>
      <dialog
        className="editor-archive-dialog"
        aria-labelledby="archive-title"
        ref={archiveRef}
      >
        <h2 id="archive-title">{ui.archiveTitle}</h2>
        <p>{ui.archiveBody}</p>
        <div>
          <Button
            type="button"
            variant="outline"
            disabled={busy}
            onClick={() => archiveRef.current?.close()}
          >
            {ui.cancel}
          </Button>
          <Button
            type="button"
            variant="danger"
            disabled={busy}
            onClick={async () => {
              if (!archiveAction || savingRef.current) return;
              savingRef.current = true;
              setBusy(true);
              try {
                const result = await archiveAction();
                if (result?.error) {
                  setServerError(ui.saveError);
                  archiveRef.current?.close();
                } else if (result?.redirect) {
                  navigating.current = true;
                  router.replace(result.redirect);
                }
              } catch {
                setServerError(ui.saveError);
                archiveRef.current?.close();
              } finally {
                savingRef.current = false;
                setBusy(false);
              }
            }}
          >
            {busy ? ui.saving : copy.archive}
          </Button>
        </div>
      </dialog>
    </div>
  );
}
