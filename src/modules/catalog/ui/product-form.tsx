"use client";

import Decimal from "decimal.js";
import Image from "next/image";
import { useMemo, useRef, useState } from "react";
import {
  Banner,
  Button,
  Field,
  MoneyAmount,
  Select,
} from "@/src/modules/design-system";
import { Money } from "@/src/modules/shared";
import {
  AFFILIATE_CHANNELS,
  PAYOUT_TIMINGS,
  PROHIBITED_PROMOTION_METHODS,
} from "../domain/affiliate-terms";
import {
  PRODUCT_TYPES,
  type ProductTypeValue,
} from "../domain/product-taxonomy";

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

export interface ProductFormCopy {
  sku: string;
  title: string;
  description: string;
  sectionProduct: string;
  sectionProductIntro: string;
  sectionOffer: string;
  sectionTerms: string;
  sectionTermsIntro: string;
  productType: string;
  productTypes: Record<ProductTypeValue, string>;
  price: string;
  backlink: string;
  rateType: string;
  percent: string;
  fixed: string;
  commission: string;
  cookieWindow: string;
  days: string;
  payoutTiming: string;
  payoutTimings: Record<(typeof PAYOUT_TIMINGS)[number], string>;
  allowedChannels: string;
  channelLabels: Record<(typeof AFFILIATE_CHANNELS)[number], string>;
  prohibitedMethods: string;
  prohibitedLabels: Record<
    (typeof PROHIBITED_PROMOTION_METHODS)[number],
    string
  >;
  regions: string;
  regionsHint: string;
  couponPolicy: string;
  returnPolicy: string;
  contentRequirements: string;
  specialTerms: string;
  offerStartsAt: string;
  offerEndsAt: string;
  optional: string;
  storedFraction: string;
  estimateSale: string;
  estimateEarnings: string;
  addImage: string;
  primaryImage: string;
  moveEarlier: string;
  moveLater: string;
  removeImage: string;
  imageTypes: string;
  imageAfterPublishTitle: string;
  imageAfterPublishBody: string;
  uploadFailed: string;
  fileTooLarge: string;
  retry: string;
  uploading: string;
  publish: string;
  save: string;
  archive: string;
  warningTitle: string;
  warningBody: string;
}

export interface ProductFormValue {
  id?: string;
  sku: string;
  title: string;
  description: string;
  productType: ProductTypeValue;
  priceGel: string;
  imageUrls: readonly string[];
  backlinkUrl: string;
  commissionType: "PERCENT" | "FIXED";
  commissionValue: string;
  cookieWindowDays: number;
  payoutTiming: (typeof PAYOUT_TIMINGS)[number];
  allowedChannels: readonly string[];
  prohibitedPromotionMethods: readonly string[];
  availableRegions: readonly string[];
  couponPolicy: string;
  returnPolicy: string;
  contentRequirements: string;
  specialTerms: string;
  offerStartsAt: Date | string | null;
  offerEndsAt: Date | string | null;
}

interface PendingUpload {
  file: File;
  error: string;
  retryable: boolean;
}

function TextAreaField({
  id,
  name,
  label,
  defaultValue,
  rows = 4,
}: {
  id: string;
  name: string;
  label: string;
  defaultValue?: string | undefined;
  rows?: number | undefined;
}) {
  return (
    <div className="grid gap-2">
      <label className="type-small font-semibold text-ink" htmlFor={id}>
        {label}
      </label>
      <textarea
        className="rounded-sm border border-slate-300 bg-paper px-3 py-2 text-ink hover:border-slate-600"
        defaultValue={defaultValue}
        id={id}
        name={name}
        rows={rows}
      />
    </div>
  );
}

function percentDisplay(fraction: string): string {
  try {
    return new Decimal(fraction).times(100).toString();
  } catch {
    return "";
  }
}

export function ProductForm({
  copy,
  action,
  initial,
  archiveAction,
}: {
  copy: ProductFormCopy;
  action: (formData: FormData) => void | Promise<void>;
  initial?: ProductFormValue;
  archiveAction?: () => void | Promise<void>;
}) {
  const editing = initial !== undefined;
  const [type, setType] = useState<"PERCENT" | "FIXED">(
    initial?.commissionType ?? "PERCENT",
  );
  const [price, setPrice] = useState(initial?.priceGel ?? "");
  const [rateDisplay, setRateDisplay] = useState(
    initial
      ? initial.commissionType === "PERCENT"
        ? percentDisplay(initial.commissionValue)
        : initial.commissionValue
      : "",
  );
  const [images, setImages] = useState<{ url: string; alt: string }[]>(
    (initial?.imageUrls ?? []).map((url, index) => ({
      url,
      alt: `${copy.addImage} ${index + 1}`,
    })),
  );
  const [progress, setProgress] = useState<number>();
  const [failed, setFailed] = useState<PendingUpload>();
  const inputRef = useRef<HTMLInputElement>(null);

  function moveImage(index: number, offset: number) {
    setImages((current) => {
      const destination = index + offset;
      if (destination < 0 || destination >= current.length) return current;
      const next = [...current];
      [next[index], next[destination]] = [next[destination]!, next[index]!];
      return next;
    });
  }

  function dateValue(value: Date | string | null | undefined) {
    if (!value) return "";
    return (value instanceof Date ? value.toISOString() : value).slice(0, 10);
  }

  const storedRate = useMemo(() => {
    try {
      return type === "PERCENT"
        ? new Decimal(rateDisplay || 0).div(100).toString()
        : new Decimal(rateDisplay || 0).toString();
    } catch {
      return "";
    }
  }, [rateDisplay, type]);

  const earnings = useMemo(() => {
    try {
      const value =
        type === "PERCENT"
          ? new Decimal(price || 0).times(storedRate || 0)
          : new Decimal(storedRate || 0);
      return value.toDecimalPlaces(2).toFixed(2);
    } catch {
      return "0.00";
    }
  }, [price, storedRate, type]);

  const previewPrice = useMemo(() => {
    try {
      return Money.of(price || "0");
    } catch {
      return Money.ZERO;
    }
  }, [price]);

  async function upload(file: File) {
    setFailed(undefined);
    setProgress(0);
    if (file.size > MAX_IMAGE_BYTES) {
      setProgress(undefined);
      setFailed({ file, error: copy.fileTooLarge, retryable: false });
      return;
    }
    try {
      const productId = initial?.id;
      if (!productId) throw new Error(copy.imageAfterPublishBody);
      const response = await fetch(
        `/api/brand/products/${encodeURIComponent(productId)}/images/presign`,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ contentType: file.type }),
        },
      );
      if (!response.ok) {
        const body = (await response.json()) as { error?: string };
        throw new Error(
          body.error === "unsupported_content_type"
            ? copy.imageTypes
            : copy.uploadFailed,
        );
      }
      const urls = (await response.json()) as {
        uploadUrl: string;
        publicUrl: string;
      };
      await new Promise<void>((resolve, reject) => {
        const request = new XMLHttpRequest();
        request.open("PUT", urls.uploadUrl);
        request.setRequestHeader("Content-Type", file.type);
        request.upload.onprogress = (event) => {
          if (event.lengthComputable)
            setProgress(Math.round((event.loaded / event.total) * 100));
        };
        request.onload = () =>
          request.status >= 200 && request.status < 300
            ? resolve()
            : reject(new Error(copy.uploadFailed));
        request.onerror = () => reject(new Error(copy.uploadFailed));
        request.send(file);
      });
      setImages((current) =>
        [...current, { url: urls.publicUrl, alt: file.name }].slice(0, 8),
      );
      setProgress(undefined);
      if (inputRef.current) inputRef.current.value = "";
    } catch (error) {
      setProgress(undefined);
      setFailed({
        file,
        error: error instanceof Error ? error.message : copy.uploadFailed,
        retryable: true,
      });
    }
  }

  return (
    <form action={action} className="product-editor grid gap-10">
      {editing ? (
        <Banner
          tone="warning"
          title={copy.warningTitle}
          body={copy.warningBody}
        />
      ) : null}
      <div className="sticky top-20 z-10 -my-2 flex flex-wrap gap-3 rounded-md border border-slate-200 bg-paper/95 p-3 shadow-sm backdrop-blur-sm">
        <Button type="submit">{editing ? copy.save : copy.publish}</Button>
        {archiveAction ? (
          <Button formAction={archiveAction} type="submit" variant="danger">
            {copy.archive}
          </Button>
        ) : null}
      </div>
      <section
        className="grid gap-6"
        aria-labelledby="product-information-title"
      >
        <div className="max-w-[70ch]">
          <h2 className="m-0 type-h2 text-ink" id="product-information-title">
            {copy.sectionProduct}
          </h2>
          <p className="mb-0 mt-2 text-slate-600">{copy.sectionProductIntro}</p>
        </div>
        <div className="grid gap-5 sm:grid-cols-2">
          <Field
            id="sku"
            label={copy.sku}
            name="sku"
            defaultValue={initial?.sku}
            required
          />
          <Field
            id="title"
            label={copy.title}
            name="title"
            defaultValue={initial?.title}
            required
          />
        </div>
        <Select
          defaultValue={initial?.productType ?? "OTHER"}
          id="productType"
          label={copy.productType}
          name="productType"
          required
        >
          {PRODUCT_TYPES.map((value) => (
            <option key={value} value={value}>
              {copy.productTypes[value]}
            </option>
          ))}
        </Select>
        <TextAreaField
          defaultValue={initial?.description}
          id="description"
          label={copy.description}
          name="description"
          rows={5}
        />
        <div className="grid gap-5 sm:grid-cols-2">
          <Field
            id="priceGel"
            inputMode="decimal"
            label={copy.price}
            name="priceGel"
            onChange={(event) => setPrice(event.currentTarget.value)}
            required
            step="0.01"
            type="number"
            value={price}
          />
          <Field
            id="backlinkUrl"
            label={copy.backlink}
            name="backlinkUrl"
            defaultValue={initial?.backlinkUrl}
            required
            type="url"
          />
        </div>
      </section>

      <section className="grid gap-5 border-t border-slate-200 pt-8">
        <div>
          <h2 className="m-0 type-h2 text-ink" id="product-images-title">
            {copy.addImage}
          </h2>
          <p className="mb-0 mt-2 type-small text-slate-600">
            {copy.imageTypes}
          </p>
        </div>
        {editing ? (
          <>
            {images.length > 0 ? (
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
                {images.map((image, index) => (
                  <div className="grid gap-2" key={image.url}>
                    <div className="relative aspect-square overflow-hidden rounded-sm bg-slate-100">
                      <Image
                        alt={image.alt}
                        fill
                        sizes="180px"
                        src={image.url}
                        unoptimized
                        className="object-cover"
                      />
                      <input name="imageUrls" type="hidden" value={image.url} />
                      {index === 0 ? (
                        <span className="absolute left-2 top-2 rounded-pill bg-ink px-3 py-1 type-caption font-semibold text-paper">
                          {copy.primaryImage}
                        </span>
                      ) : null}
                    </div>
                    <div className="flex flex-wrap gap-1">
                      <button
                        aria-label={`${copy.moveEarlier}: ${image.alt}`}
                        className="min-h-11 rounded-pill px-3 type-caption font-semibold text-slate-600 hover:bg-slate-100 disabled:opacity-40"
                        disabled={index === 0}
                        onClick={() => moveImage(index, -1)}
                        type="button"
                      >
                        ←
                      </button>
                      <button
                        aria-label={`${copy.moveLater}: ${image.alt}`}
                        className="min-h-11 rounded-pill px-3 type-caption font-semibold text-slate-600 hover:bg-slate-100 disabled:opacity-40"
                        disabled={index === images.length - 1}
                        onClick={() => moveImage(index, 1)}
                        type="button"
                      >
                        →
                      </button>
                      <button
                        className="min-h-11 rounded-pill px-3 type-caption font-semibold text-reversed hover:bg-reversed-soft"
                        onClick={() =>
                          setImages((current) =>
                            current.filter(
                              (_, itemIndex) => itemIndex !== index,
                            ),
                          )
                        }
                        type="button"
                      >
                        {copy.removeImage}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : null}
            <label className="inline-flex min-h-11 w-fit cursor-pointer items-center rounded-pill border border-slate-300 bg-paper px-5 type-small font-semibold text-ink hover:border-ink focus-within:border-signal focus-within:ring-4 focus-within:ring-focus-ring">
              {copy.addImage}
              <input
                accept="image/jpeg,image/png,image/webp"
                className="sr-only"
                disabled={images.length >= 8 || progress !== undefined}
                onChange={(event) => {
                  const file = event.currentTarget.files?.[0];
                  if (file) void upload(file);
                }}
                ref={inputRef}
                type="file"
              />
            </label>
            {progress !== undefined ? (
              <div className="grid gap-2" role="status">
                <span className="type-caption text-slate-600">
                  {copy.uploading} {progress}%
                </span>
                <progress
                  className="h-2 w-full accent-signal"
                  max="100"
                  value={progress}
                />
              </div>
            ) : null}
            {failed ? (
              <Banner
                tone="danger"
                title={copy.uploadFailed}
                body={failed.error}
                action={
                  failed.retryable ? (
                    <Button
                      onClick={() => void upload(failed.file)}
                      type="button"
                      variant="outline"
                    >
                      {copy.retry}
                    </Button>
                  ) : undefined
                }
              />
            ) : null}
          </>
        ) : (
          <Banner
            tone="info"
            title={copy.imageAfterPublishTitle}
            body={copy.imageAfterPublishBody}
          />
        )}
      </section>

      <section
        className="grid gap-6 border-t border-slate-200 pt-8"
        aria-labelledby="product-offer-title"
      >
        <h2 className="m-0 type-h2 text-ink" id="product-offer-title">
          {copy.sectionOffer}
        </h2>
        <fieldset className="grid gap-4">
          <legend className="mb-3 type-small font-semibold text-ink">
            {copy.rateType}
          </legend>
          <div
            className="inline-flex w-fit rounded-pill bg-slate-100 p-1"
            role="radiogroup"
          >
            {(["PERCENT", "FIXED"] as const).map((value) => (
              <label
                className={`cursor-pointer rounded-pill px-5 py-2 type-small font-semibold ${type === value ? "bg-paper text-ink shadow-xs" : "text-slate-600"}`}
                key={value}
              >
                <input
                  checked={type === value}
                  className="sr-only"
                  name="commissionType"
                  onChange={() => {
                    setType(value);
                    setRateDisplay("");
                  }}
                  type="radio"
                  value={value}
                />
                {value === "PERCENT" ? copy.percent : copy.fixed}
              </label>
            ))}
          </div>
        </fieldset>
        <div className="grid gap-5 sm:grid-cols-2">
          <Field
            id="commission"
            inputMode="decimal"
            label={copy.commission}
            onChange={(event) => setRateDisplay(event.currentTarget.value)}
            required
            step="0.0001"
            type="number"
            value={rateDisplay}
          />
          <Field
            defaultValue={initial?.cookieWindowDays ?? 30}
            id="cookieWindowDays"
            label={`${copy.cookieWindow} (${copy.days})`}
            max="3650"
            min="1"
            name="cookieWindowDays"
            required
            type="number"
          />
        </div>
        <input name="commissionValue" type="hidden" value={storedRate} />
        {type === "PERCENT" ? (
          <p className="m-0 type-small text-slate-600">
            {copy.storedFraction}:{" "}
            <code className="type-mono text-ink">{storedRate || "0"}</code>
          </p>
        ) : null}
        <dl className="m-0 grid gap-3 rounded-sm bg-slate-50 px-4 py-3 type-small text-slate-700 sm:grid-cols-2">
          <div className="grid gap-1">
            <dt>{copy.estimateSale}</dt>
            <dd className="m-0">
              <MoneyAmount size="sm" value={previewPrice} />
            </dd>
          </div>
          <div className="grid gap-1">
            <dt>{copy.estimateEarnings}</dt>
            <dd className="m-0">
              <MoneyAmount size="sm" value={Money.of(earnings)} />
            </dd>
          </div>
        </dl>
      </section>

      <section
        className="grid gap-6 border-t border-slate-200 pt-8"
        aria-labelledby="affiliate-terms-title"
      >
        <div className="max-w-[70ch]">
          <h2 className="m-0 type-h2 text-ink" id="affiliate-terms-title">
            {copy.sectionTerms}
          </h2>
          <p className="mb-0 mt-2 text-slate-600">{copy.sectionTermsIntro}</p>
        </div>
        <Select
          defaultValue={initial?.payoutTiming ?? "AFTER_CONFIRMED_CONVERSION"}
          id="payoutTiming"
          label={copy.payoutTiming}
          name="payoutTiming"
          required
        >
          {PAYOUT_TIMINGS.map((value) => (
            <option key={value} value={value}>
              {copy.payoutTimings[value]}
            </option>
          ))}
        </Select>
        <fieldset className="grid gap-3">
          <legend className="type-small font-semibold text-ink">
            {copy.allowedChannels}
          </legend>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            {AFFILIATE_CHANNELS.map((value) => (
              <label
                className="flex min-h-11 cursor-pointer items-center gap-3 rounded-sm bg-paper px-3 type-small text-slate-700"
                key={value}
              >
                <input
                  className="size-4 accent-signal"
                  defaultChecked={initial?.allowedChannels.includes(value)}
                  name="allowedChannels"
                  type="checkbox"
                  value={value}
                />
                {copy.channelLabels[value]}
              </label>
            ))}
          </div>
        </fieldset>
        <fieldset className="grid gap-3">
          <legend className="type-small font-semibold text-ink">
            {copy.prohibitedMethods}
          </legend>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {PROHIBITED_PROMOTION_METHODS.map((value) => (
              <label
                className="flex min-h-11 cursor-pointer items-center gap-3 rounded-sm bg-paper px-3 type-small text-slate-700"
                key={value}
              >
                <input
                  className="size-4 accent-signal"
                  defaultChecked={initial?.prohibitedPromotionMethods.includes(
                    value,
                  )}
                  name="prohibitedPromotionMethods"
                  type="checkbox"
                  value={value}
                />
                {copy.prohibitedLabels[value]}
              </label>
            ))}
          </div>
        </fieldset>
        <Field
          defaultValue={initial?.availableRegions.join(", ")}
          hint={copy.regionsHint}
          id="availableRegions"
          label={copy.regions}
          name="availableRegions"
          placeholder="GE, AM, AZ"
        />
        <div className="grid gap-5 md:grid-cols-2">
          <TextAreaField
            defaultValue={initial?.couponPolicy}
            id="couponPolicy"
            label={copy.couponPolicy}
            name="couponPolicy"
          />
          <TextAreaField
            defaultValue={initial?.returnPolicy}
            id="returnPolicy"
            label={copy.returnPolicy}
            name="returnPolicy"
          />
          <TextAreaField
            defaultValue={initial?.contentRequirements}
            id="contentRequirements"
            label={copy.contentRequirements}
            name="contentRequirements"
          />
          <TextAreaField
            defaultValue={initial?.specialTerms}
            id="specialTerms"
            label={copy.specialTerms}
            name="specialTerms"
          />
        </div>
        <div className="grid gap-5 sm:grid-cols-2">
          <Field
            defaultValue={dateValue(initial?.offerStartsAt)}
            id="offerStartsAt"
            label={`${copy.offerStartsAt} (${copy.optional})`}
            name="offerStartsAt"
            type="date"
          />
          <Field
            defaultValue={dateValue(initial?.offerEndsAt)}
            id="offerEndsAt"
            label={`${copy.offerEndsAt} (${copy.optional})`}
            name="offerEndsAt"
            type="date"
          />
        </div>
      </section>
    </form>
  );
}
