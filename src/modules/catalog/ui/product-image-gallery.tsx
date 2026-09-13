"use client";

import Image from "next/image";
import { useRef, useState } from "react";

export function ProductImageGallery({
  images,
  title,
  copy,
}: {
  images: readonly string[];
  title: string;
  copy: {
    image: string;
    of: string;
    enlarge: string;
    close: string;
    empty: string;
    previous?: string;
    next?: string;
  };
}) {
  const [selected, setSelected] = useState(0);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const active = Math.min(selected, Math.max(images.length - 1, 0));
  const current = images[active];
  if (!current) {
    return (
      <div className="product-gallery-image grid aspect-[4/3] place-items-center rounded-md bg-slate-100 text-center text-slate-500">
        <div>
          <svg
            aria-hidden="true"
            className="mx-auto size-10"
            fill="none"
            viewBox="0 0 24 24"
          >
            <path
              d="M4 7.5A2.5 2.5 0 0 1 6.5 5h11A2.5 2.5 0 0 1 20 7.5v9a2.5 2.5 0 0 1-2.5 2.5h-11A2.5 2.5 0 0 1 4 16.5v-9Z"
              stroke="currentColor"
              strokeWidth="1.5"
            />
            <path
              d="m5 16 4-4 3 3 2-2 5 5"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="1.5"
            />
          </svg>
          <p className="mb-0 mt-3 type-small">{copy.empty}</p>
        </div>
      </div>
    );
  }
  const alt = `${title} — ${copy.image} ${active + 1} ${copy.of} ${images.length}`;
  const arrows =
    images.length > 1
      ? ([-1, 1] as const).map((direction) => (
          <button
            key={direction}
            type="button"
            className={`product-gallery-arrow ${direction < 0 ? "is-previous" : "is-next"}`}
            aria-label={
              direction < 0
                ? (copy.previous ??
                  `${copy.image} ${((active - 1 + images.length) % images.length) + 1}`)
                : (copy.next ??
                  `${copy.image} ${((active + 1) % images.length) + 1}`)
            }
            onClick={() =>
              setSelected((active + direction + images.length) % images.length)
            }
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              aria-hidden="true"
            >
              <path d={direction < 0 ? "m14 6-6 6 6 6" : "m10 6 6 6-6 6"} />
            </svg>
          </button>
        ))
      : null;
  return (
    <div className="grid gap-3">
      <div className="product-gallery-stage">
        <button
          aria-label={copy.enlarge}
          className="product-gallery-image relative aspect-[4/3] cursor-zoom-in overflow-hidden rounded-md bg-slate-100"
          onClick={() => dialogRef.current?.showModal()}
          type="button"
        >
          <Image
            alt={alt}
            className="object-cover"
            fill
            priority
            sizes="(max-width: 1023px) 100vw, 62vw"
            src={current}
            unoptimized
          />
        </button>
        {arrows}
      </div>
      {images.length > 1 ? (
        <div
          className="flex gap-3 overflow-x-auto pb-1"
          aria-label={`${title} ${copy.image}`}
        >
          {images.map((image, index) => (
            <button
              aria-label={`${copy.image} ${index + 1} ${copy.of} ${images.length}`}
              aria-pressed={active === index}
              className={`relative aspect-square w-20 shrink-0 overflow-hidden rounded-sm border-2 ${active === index ? "border-signal" : "border-transparent hover:border-slate-300"}`}
              key={image}
              onClick={() => setSelected(index)}
              type="button"
            >
              <Image
                alt=""
                className="object-cover"
                fill
                sizes="80px"
                src={image}
                unoptimized
              />
            </button>
          ))}
        </div>
      ) : null}
      <dialog
        aria-label={alt}
        className="m-auto max-h-[92dvh] max-w-[92vw] border-0 bg-transparent p-0 backdrop:bg-ink/80"
        ref={dialogRef}
      >
        <div className="grid gap-3">
          <button
            className="justify-self-end rounded-pill bg-paper px-5 py-3 type-small font-semibold text-ink"
            onClick={() => dialogRef.current?.close()}
            type="button"
          >
            {copy.close}
          </button>
          <div className="relative h-[78dvh] w-[88vw]">
            <Image
              alt={alt}
              className="object-contain"
              fill
              sizes="88vw"
              src={current}
              unoptimized
            />
            {arrows}
          </div>
        </div>
      </dialog>
    </div>
  );
}
