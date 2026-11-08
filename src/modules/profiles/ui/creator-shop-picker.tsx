"use client";
/* eslint-disable @next/next/no-img-element */
import { useEffect, useId, useMemo, useRef, useState } from "react";
import type { ShopCandidate } from "../infrastructure/prisma-creator-shop-repository";
import { fillShopCopy, type CreatorShopCopy } from "./creator-shop-copy";

/**
 * Pick products to add to the shop: a native modal dialog (a bottom sheet on
 * phones) with search, thumbnails and multi-select.
 */
export function CreatorShopPicker({
  open,
  candidates,
  copy,
  onClose,
  onAdd,
}: {
  open: boolean;
  candidates: ShopCandidate[];
  copy: CreatorShopCopy;
  onClose(): void;
  onAdd(ids: string[]): void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<string[]>([]);

  useEffect(() => {
    const node = dialog.current;
    if (!node) return;
    if (open && !node.open) node.showModal();
    if (!open && node.open) node.close();
  }, [open]);

  const shown = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase();
    if (!needle) return candidates;
    return candidates.filter((candidate) =>
      `${candidate.title} ${candidate.brandName}`
        .toLocaleLowerCase()
        .includes(needle),
    );
  }, [candidates, query]);

  function toggle(id: string) {
    setSelected((current) =>
      current.includes(id)
        ? current.filter((entry) => entry !== id)
        : [...current, id],
    );
  }

  function reset() {
    setQuery("");
    setSelected([]);
  }

  function add() {
    // Keep the catalog order, so the newest link lands on top as listed.
    const ids = candidates
      .map((candidate) => candidate.productId)
      .filter((id) => selected.includes(id));
    if (ids.length === 0) return;
    onAdd(ids);
    reset();
    onClose();
  }

  return (
    <dialog
      ref={dialog}
      className="shop-sheet shop-picker"
      aria-labelledby={titleId}
      onClose={() => {
        reset();
        onClose();
      }}
      onClick={(event) => {
        // A click on the backdrop lands on the dialog element itself.
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="shop-sheet-header">
        <h2 id={titleId}>{copy.add}</h2>
        <button
          type="button"
          className="shop-icon-button"
          aria-label={copy.close}
          onClick={onClose}
        >
          <span aria-hidden="true">{"✕"}</span>
        </button>
      </div>
      {candidates.length === 0 ? (
        <p className="shop-picker-empty">{copy.allAdded}</p>
      ) : (
        <>
          <label className="shop-picker-search">
            <span className="sr-only">{copy.search}</span>
            <input
              type="search"
              placeholder={copy.search}
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </label>
          <ul className="shop-picker-list">
            {shown.map((candidate) => (
              <li key={candidate.productId}>
                <label>
                  <input
                    type="checkbox"
                    checked={selected.includes(candidate.productId)}
                    onChange={() => toggle(candidate.productId)}
                  />
                  <span className="shop-thumb">
                    {candidate.imageUrl ? (
                      <img
                        src={candidate.imageUrl}
                        alt=""
                        width={48}
                        height={48}
                        loading="lazy"
                      />
                    ) : null}
                  </span>
                  <span className="shop-editor-text">
                    <span className="shop-editor-brand">
                      {candidate.brandName}
                    </span>
                    <span className="shop-editor-name">{candidate.title}</span>
                  </span>
                </label>
              </li>
            ))}
          </ul>
        </>
      )}
      <div className="shop-sheet-footer">
        <button
          type="button"
          className="profile-button primary"
          disabled={selected.length === 0}
          onClick={add}
        >
          {fillShopCopy(copy.addCount, { count: selected.length })}
        </button>
      </div>
    </dialog>
  );
}
