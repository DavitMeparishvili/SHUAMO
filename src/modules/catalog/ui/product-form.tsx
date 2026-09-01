"use client";

import Decimal from "decimal.js";
import Image from "next/image";
import { useMemo, useRef, useState } from "react";
import {
  Banner,
  Button,
  Field,
  MoneyAmount,
} from "@/src/modules/design-system";
import { Money } from "@/src/modules/shared";

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

export interface ProductFormCopy {
  sku: string;
  title: string;
  description: string;
  price: string;
  backlink: string;
  rateType: string;
  percent: string;
  fixed: string;
  commission: string;
  storedFraction: string;
  estimateSale: string;
  estimateEarnings: string;
  addImage: string;
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
  priceGel: string;
  imageUrls: readonly string[];
  backlinkUrl: string;
  commissionType: "PERCENT" | "FIXED";
  commissionValue: string;
}

interface PendingUpload {
  file: File;
  error: string;
  retryable: boolean;
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
    <form action={action} className="grid max-w-3xl gap-8">
      {editing ? (
        <Banner
          tone="warning"
          title={copy.warningTitle}
          body={copy.warningBody}
        />
      ) : null}
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
      <div className="grid gap-2">
        <label
          className="type-small font-semibold text-ink"
          htmlFor="description"
        >
          {copy.description}
        </label>
        <textarea
          className="min-h-28 rounded-sm border border-slate-300 bg-paper px-3 py-2 text-ink hover:border-slate-600"
          defaultValue={initial?.description}
          id="description"
          name="description"
        />
      </div>
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

      <fieldset className="grid gap-4 rounded-md border border-slate-200 p-5">
        <legend className="px-2 type-small font-semibold text-ink">
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
        <input name="commissionValue" type="hidden" value={storedRate} />
        {type === "PERCENT" ? (
          <p className="m-0 type-small text-slate-600">
            {copy.storedFraction}:{" "}
            <code className="type-mono text-ink">{storedRate || "0"}</code>
          </p>
        ) : null}
        <dl className="m-0 grid gap-2 rounded-sm bg-slate-50 px-4 py-3 type-small text-slate-700 sm:grid-cols-2">
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
      </fieldset>

      {editing ? (
        <section className="grid gap-4">
          <h2 className="m-0 type-h3 text-ink" id="product-images-title">
            {copy.addImage}
          </h2>
          <p className="m-0 type-small text-slate-600">{copy.imageTypes}</p>
          {images.length > 0 ? (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {images.map((image) => (
                <div
                  className="relative aspect-square overflow-hidden rounded-sm bg-slate-100"
                  key={image.url}
                >
                  <Image
                    alt={image.alt}
                    fill
                    sizes="180px"
                    src={image.url}
                    unoptimized
                    className="object-cover"
                  />
                  <input name="imageUrls" type="hidden" value={image.url} />
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
        </section>
      ) : (
        <Banner
          tone="info"
          title={copy.imageAfterPublishTitle}
          body={copy.imageAfterPublishBody}
        />
      )}

      <div className="flex flex-wrap gap-3">
        <Button type="submit">{editing ? copy.save : copy.publish}</Button>
        {archiveAction ? (
          <Button formAction={archiveAction} type="submit" variant="danger">
            {copy.archive}
          </Button>
        ) : null}
      </div>
    </form>
  );
}
