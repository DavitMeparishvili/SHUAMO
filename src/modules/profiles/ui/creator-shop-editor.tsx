"use client";
/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  useCallback,
  useEffect,
  useId,
  useOptimistic,
  useRef,
  useState,
  useSyncExternalStore,
  useTransition,
} from "react";
import { EmptyState, Icon } from "@/src/modules/design-system";
import type { Locale } from "@/src/modules/localization";
import type { ShopActionResult } from "../application/creator-shop-input";
import {
  isPubliclyShown,
  moveShopItem,
  type ShopMove,
} from "../domain/creator-shop";
import type {
  CreatorShopEditorItem,
  PublicShopItem,
  ShopCandidate,
} from "../infrastructure/prisma-creator-shop-repository";
import { ShopCard } from "./creator-shop";
import {
  creatorShopCopy,
  fillShopCopy,
  type CreatorShopCopy,
} from "./creator-shop-copy";
import { CreatorShopPicker } from "./creator-shop-picker";
import { useSortableList } from "./use-sortable-list";

export interface CreatorShopActions {
  add(ids: string[]): Promise<ShopActionResult>;
  remove(id: string): Promise<ShopActionResult>;
  setVisible(id: string, visible: boolean): Promise<ShopActionResult>;
  reorder(ids: string[]): Promise<ShopActionResult>;
}

type Filter = "all" | "shown" | "hidden";
type Status = "idle" | "saving" | "saved" | "failed";

const PHONE_QUERY = "(max-width: 639px)";
const PREVIEW_ITEMS = 4;

/** True on phones. Without matchMedia (tests, old browsers) assume a phone. */
function usePhone() {
  return useSyncExternalStore(
    (notify) => {
      if (typeof window === "undefined" || !window.matchMedia) return () => {};
      const query = window.matchMedia(PHONE_QUERY);
      query.addEventListener("change", notify);
      return () => query.removeEventListener("change", notify);
    },
    () => (window.matchMedia ? window.matchMedia(PHONE_QUERY).matches : true),
    () => false,
  );
}

function asPublic(item: CreatorShopEditorItem): PublicShopItem | null {
  return isPubliclyShown(item.visible, item.availability) &&
    item.code !== null &&
    item.imageUrl !== null
    ? {
        productId: item.productId,
        code: item.code,
        title: item.title,
        brandName: item.brandName,
        imageUrl: item.imageUrl,
      }
    : null;
}

function withPositions(items: CreatorShopEditorItem[]) {
  return items.map((item, position) => ({ ...item, position }));
}

/**
 * The creator's Shop tab. Every change saves immediately through its own
 * server actions (never the profile draft), shown optimistically and rolled
 * back when a save fails or throws.
 */
export function CreatorShopEditor({
  locale,
  items,
  candidates,
  profileUrl,
  published,
  hasAnyLinks,
  actions,
}: {
  locale: Locale;
  items: CreatorShopEditorItem[];
  candidates: ShopCandidate[];
  profileUrl: string | null;
  published: boolean;
  hasAnyLinks: boolean;
  actions: CreatorShopActions;
}) {
  const copy = creatorShopCopy(locale);
  const router = useRouter();
  const phone = usePhone();
  const [, startTransition] = useTransition();
  // `saved` is the last list the server accepted. It follows the `items`
  // prop whenever the page re-renders with fresh data.
  const [saved, setSaved] = useState(items);
  const [previousItems, setPreviousItems] = useState(items);
  if (items !== previousItems) {
    setPreviousItems(items);
    setSaved(items);
  }
  const [list, setOptimistic] = useOptimistic(
    saved,
    (_current: CreatorShopEditorItem[], next: CreatorShopEditorItem[]) => next,
  );
  const [status, setStatus] = useState<Status>("idle");
  const [retry, setRetry] = useState<(() => void) | null>(null);
  const [filter, setFilter] = useState<Filter>("all");
  const [pickerOpen, setPickerOpen] = useState(false);
  const [menuFor, setMenuFor] = useState<string | null>(null);

  const run = useCallback(
    function run(
      next: CreatorShopEditorItem[],
      call: () => Promise<ShopActionResult>,
    ) {
      setStatus("saving");
      setRetry(null);
      startTransition(async () => {
        setOptimistic(next);
        let result: ShopActionResult | { ok: false };
        try {
          result = await call();
        } catch {
          result = { ok: false };
        }
        if (result.ok) {
          startTransition(() => setSaved(next));
          setStatus("saved");
          return;
        }
        // Dropping the optimistic state rolls the list back; the refresh
        // brings in the server's truth (always needed after invalid_order).
        setStatus("failed");
        setRetry(() => () => run(next, call));
        router.refresh();
      });
    },
    [router, setOptimistic],
  );

  const effectiveFilter: Filter = phone ? filter : "all";
  const dragEnabled = effectiveFilter === "all";
  const reorder = useCallback(
    (next: CreatorShopEditorItem[]) => {
      const ordered = withPositions(next);
      run(ordered, () => actions.reorder(ordered.map((i) => i.productId)));
    },
    [actions, run],
  );
  const sortable = useSortableList(list, (item) => item.productId, reorder, {
    disabled: !dragEnabled,
    announcements: {
      picked: (item) => fillShopCopy(copy.picked, { title: item.title }),
      moved: (_item, n) => fillShopCopy(copy.moved, { n }),
      dropped: (item, n) =>
        fillShopCopy(copy.dropped, { title: item.title, n }),
      cancelled: () => copy.cancelled,
    },
  });

  function setVisible(item: CreatorShopEditorItem) {
    const visible = !item.visible;
    run(
      list.map((entry) =>
        entry.productId === item.productId ? { ...entry, visible } : entry,
      ),
      () => actions.setVisible(item.productId, visible),
    );
  }

  function move(productId: string, how: ShopMove) {
    const index = list.findIndex((entry) => entry.productId === productId);
    reorder(moveShopItem(list, index, how));
  }

  function remove(productId: string) {
    run(
      withPositions(list.filter((entry) => entry.productId !== productId)),
      () => actions.remove(productId),
    );
  }

  function add(ids: string[]) {
    const added: CreatorShopEditorItem[] = ids.flatMap((id) => {
      const candidate = candidates.find((entry) => entry.productId === id);
      return candidate
        ? [
            {
              productId: candidate.productId,
              position: 0,
              visible: true,
              availability: candidate.imageUrl ? "available" : "no-photo",
              title: candidate.title,
              brandName: candidate.brandName,
              imageUrl: candidate.imageUrl,
              code: null,
            },
          ]
        : [];
    });
    run(withPositions([...added, ...list]), () => actions.add(ids));
  }

  const inShop = new Set(list.map((item) => item.productId));
  const pickable = candidates.filter((entry) => !inShop.has(entry.productId));
  const shownCount = list.filter((item) =>
    isPubliclyShown(item.visible, item.availability),
  ).length;
  const hiddenCount = list.filter((item) => !item.visible).length;
  const rows = sortable.items.filter((item) =>
    effectiveFilter === "shown"
      ? item.visible
      : effectiveFilter === "hidden"
        ? !item.visible
        : true,
  );
  const preview = list
    .map(asPublic)
    .filter((item): item is PublicShopItem => item !== null)
    .slice(0, PREVIEW_ITEMS);
  const menuItem = list.find((item) => item.productId === menuFor) ?? null;
  const menuIndex = menuItem ? list.indexOf(menuItem) : -1;

  const addButton = (
    <button
      type="button"
      className="profile-button primary"
      onClick={() => setPickerOpen(true)}
    >
      <span aria-hidden="true">+</span>
      {copy.add}
    </button>
  );

  return (
    <section className="shop-editor" aria-labelledby="shop-editor-title">
      <header className="shop-editor-header">
        <div>
          <h2 id="shop-editor-title">{copy.title}</h2>
          {list.length ? (
            <p className="shop-editor-summary">
              {fillShopCopy(copy.summary, {
                shown: shownCount,
                hidden: hiddenCount,
              })}
            </p>
          ) : null}
        </div>
        <div className="shop-editor-actions">
          {profileUrl ? (
            <a
              className="profile-button"
              href={profileUrl}
              target="_blank"
              rel="noopener"
            >
              {copy.viewProfile} <span aria-hidden="true">{"↗"}</span>
            </a>
          ) : null}
          {list.length ? addButton : null}
        </div>
      </header>
      {!published ? (
        <div className="profile-owner-banner private shop-editor-banner">
          <Icon name="lock" />
          <div>
            <strong>{copy.unpublished}</strong>
          </div>
        </div>
      ) : null}
      <div className="shop-editor-status">
        <p role="status" aria-live="polite">
          {status === "saving" ? (
            copy.saving
          ) : status === "saved" ? (
            <>
              <span aria-hidden="true">{"✓ "}</span>
              <span>{copy.saved}</span>
            </>
          ) : status === "failed" ? (
            <span>{copy.failed}</span>
          ) : null}
        </p>
        {status === "failed" && retry ? (
          <button type="button" className="shop-text-button" onClick={retry}>
            {copy.retry}
          </button>
        ) : null}
      </div>
      {list.length === 0 ? (
        <EmptyState
          title={copy.emptyTitle}
          body={copy.emptyBody}
          action={
            hasAnyLinks ? (
              addButton
            ) : (
              <Link
                className="profile-button primary"
                href={`/${locale}/creator/links`}
              >
                {copy.noLinks}
              </Link>
            )
          }
        />
      ) : (
        <div className="shop-editor-layout">
          <div className="shop-editor-main">
            {phone ? (
              <div
                className="shop-editor-filters"
                role="radiogroup"
                aria-label={copy.filterLabel}
              >
                {(
                  [
                    ["all", copy.filterAll],
                    ["shown", copy.filterShown],
                    ["hidden", copy.filterHidden],
                  ] as const
                ).map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    role="radio"
                    aria-checked={filter === value}
                    onClick={() => setFilter(value)}
                  >
                    {label}
                  </button>
                ))}
              </div>
            ) : null}
            <ul className="shop-editor-list">
              {rows.map((item) => (
                <ShopEditorRow
                  key={item.productId}
                  item={item}
                  copy={copy}
                  dragEnabled={dragEnabled}
                  rowProps={sortable.itemProps(item.productId)}
                  handleProps={sortable.handleProps(item.productId)}
                  onToggle={() => setVisible(item)}
                  onMore={() => setMenuFor(item.productId)}
                />
              ))}
            </ul>
            <p className="sr-only" aria-live="polite">
              {sortable.announcement}
            </p>
          </div>
          <aside className="shop-editor-preview" aria-label={copy.preview}>
            <p className="shop-editor-preview-label">{copy.preview}</p>
            <div className="shop-phone">
              <p className="shop-phone-heading">{copy.heading}</p>
              <ul className="shop-phone-grid">
                {preview.map((item) => (
                  <li key={item.productId}>
                    <ShopCard item={item} copy={copy} />
                  </li>
                ))}
              </ul>
            </div>
          </aside>
        </div>
      )}
      <ShopItemMenu
        item={menuItem}
        index={menuIndex}
        count={list.length}
        copy={copy}
        phone={phone}
        onClose={() => setMenuFor(null)}
        onMove={(how) => menuItem && move(menuItem.productId, how)}
        onRemove={() => menuItem && remove(menuItem.productId)}
      />
      <CreatorShopPicker
        open={pickerOpen}
        candidates={pickable}
        copy={copy}
        onClose={() => setPickerOpen(false)}
        onAdd={add}
      />
    </section>
  );
}

function ShopEditorRow({
  item,
  copy,
  dragEnabled,
  rowProps,
  handleProps,
  onToggle,
  onMore,
}: {
  item: CreatorShopEditorItem;
  copy: CreatorShopCopy;
  dragEnabled: boolean;
  rowProps: ReturnType<ReturnType<typeof useSortableList>["itemProps"]>;
  handleProps: ReturnType<ReturnType<typeof useSortableList>["handleProps"]>;
  onToggle(): void;
  onMore(): void;
}) {
  const nameId = useId();
  return (
    <li
      {...rowProps}
      className="shop-editor-row"
      data-hidden={item.visible ? undefined : "true"}
    >
      {dragEnabled ? (
        <button
          type="button"
          className="shop-editor-handle"
          aria-label={fillShopCopy(copy.reorder, { title: item.title })}
          {...handleProps}
        >
          <span aria-hidden="true">{"⋮⋮"}</span>
        </button>
      ) : null}
      <span className="shop-thumb">
        {item.imageUrl ? (
          <img
            src={item.imageUrl}
            alt=""
            width={48}
            height={48}
            loading="lazy"
          />
        ) : null}
      </span>
      <span className="shop-editor-text">
        <span className="shop-editor-brand">{item.brandName}</span>
        <span className="shop-editor-name" id={nameId}>
          {item.title}
        </span>
        {item.availability !== "available" ? (
          <span className="shop-editor-reason">
            {copy.reason[item.availability]}
          </span>
        ) : null}
      </span>
      <button
        type="button"
        role="switch"
        className="shop-switch"
        aria-checked={item.visible}
        aria-label={copy.show}
        aria-describedby={nameId}
        onClick={onToggle}
      >
        <span aria-hidden="true" />
      </button>
      <button
        type="button"
        className="shop-icon-button shop-editor-more"
        aria-label={fillShopCopy(copy.more, { title: item.title })}
        aria-haspopup="dialog"
        onClick={onMore}
      >
        <span aria-hidden="true">{"⋯"}</span>
      </button>
    </li>
  );
}

/**
 * Per-row actions: a native modal dialog that is a bottom sheet on phones and
 * a small popover beside the ⋯ button on wider screens.
 */
function ShopItemMenu({
  item,
  index,
  count,
  copy,
  phone,
  onClose,
  onMove,
  onRemove,
}: {
  item: CreatorShopEditorItem | null;
  index: number;
  count: number;
  copy: CreatorShopCopy;
  phone: boolean;
  onClose(): void;
  onMove(how: ShopMove): void;
  onRemove(): void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const node = dialog.current;
    if (!node) return;
    if (item && !node.open) {
      // On wide screens the menu opens as a popover under its ⋯ button.
      const trigger = document.activeElement;
      if (!phone && trigger instanceof HTMLElement) {
        const rect = trigger.getBoundingClientRect();
        node.style.setProperty("--menu-top", `${rect.bottom + 4}px`);
        node.style.setProperty("--menu-left", `${rect.right}px`);
      }
      node.showModal();
    }
    if (!item && node.open) node.close();
  }, [item, phone]);

  function choose(action: () => void) {
    dialog.current?.close();
    action();
  }

  const label = item ? fillShopCopy(copy.more, { title: item.title }) : "";
  return (
    <dialog
      ref={dialog}
      className={`shop-sheet shop-menu${phone ? "" : " popover"}`}
      aria-label={label}
      onClose={onClose}
      onClick={(event) => {
        if (event.target === event.currentTarget) dialog.current?.close();
      }}
    >
      {item ? (
        <>
          <p className="shop-menu-title">{item.title}</p>
          <div className="shop-menu-actions">
            {(
              [
                ["top", copy.moveTop, index === 0],
                ["up", copy.moveUp, index === 0],
                ["down", copy.moveDown, index === count - 1],
                ["bottom", copy.moveBottom, index === count - 1],
              ] as const
            ).map(([how, text, disabled]) => (
              <button
                key={how}
                type="button"
                disabled={disabled}
                onClick={() => choose(() => onMove(how))}
              >
                {text}
              </button>
            ))}
            <button
              type="button"
              className="danger"
              onClick={() => choose(onRemove)}
            >
              {copy.remove}
            </button>
          </div>
        </>
      ) : null}
    </dialog>
  );
}
