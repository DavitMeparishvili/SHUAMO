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
  };
}) {
  const [selected, setSelected] = useState(0);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const current = images[selected];
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
  const alt = `${title} — ${copy.image} ${selected + 1} ${copy.of} ${images.length}`;
  return (
    <div className="grid gap-3">
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
      {images.length > 1 ? (
        <div
          className="flex gap-3 overflow-x-auto pb-1"
          aria-label={`${title} ${copy.image}`}
        >
          {images.map((image, index) => (
            <button
              aria-label={`${copy.image} ${index + 1} ${copy.of} ${images.length}`}
              aria-pressed={selected === index}
              className={`relative aspect-square w-20 shrink-0 overflow-hidden rounded-sm border-2 ${selected === index ? "border-signal" : "border-transparent hover:border-slate-300"}`}
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
          </div>
        </div>
      </dialog>
    </div>
  );
}
