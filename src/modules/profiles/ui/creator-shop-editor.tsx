"use client";
/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useOptimistic,
  useRef,
  useState,
  useSyncExternalStore,
  useTransition,
  type MouseEvent,
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
} from "../domain/creator-shop";
import { ShopCard } from "./creator-shop";
import {
  creatorShopCopy,
  fillShopCopy,
  type CreatorShopCopy,
} from "./creator-shop-copy";
import { CreatorShopPicker } from "./creator-shop-picker";
import { canAnimate, LIST_MOTION, prefersReducedMotion } from "./list-motion";
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
  const [menu, setMenu] = useState<{
    id: string;
    anchor: DOMRect | null;
  } | null>(null);
  const sectionRef = useRef<HTMLElement>(null);
  // Where focus goes once a removed row has left the DOM.
  const focusAfterRemove = useRef<string | null>(null);
  const listRef = useRef<HTMLUListElement>(null);
  // Layout tops from the last render, keyed by product, for FLIP.
  const tops = useRef<Map<string, number> | null>(null);
  // The row that just moved: highlight it, show it, keep focus with it.
  const [settle, setSettle] = useState<{
    id: string;
    index: number;
    focusMore: boolean;
  } | null>(null);

  const run = useCallback(
    function run(
      next: CreatorShopEditorItem[],
      call: () => Promise<ShopActionResult>,
      isDone: (result: ShopActionResult | { ok: false }) => boolean = (
        result,
      ) => result.ok,
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
        if (isDone(result)) {
          startTransition(() => setSaved(next));
          setStatus("saved");
          return;
        }
        // Dropping the optimistic state rolls the list back; the refresh
        // brings in the server's truth. A stale order would only fail again,
        // so invalid_order is fixed by the refresh alone, without Retry.
        setStatus("failed");
        const stale = "error" in result && result.error === "invalid_order";
        setRetry(stale ? null : () => () => run(next, call, isDone));
        router.refresh();
      });
    },
    [router, setOptimistic],
  );

  const effectiveFilter: Filter = phone ? filter : "all";
  const dragEnabled = effectiveFilter === "all";
  const reorder = useCallback(
    (next: CreatorShopEditorItem[], movedId?: string, focusMore = false) => {
      const ordered = withPositions(next);
      if (movedId)
        setSettle({
          id: movedId,
          index: ordered.findIndex((item) => item.productId === movedId),
          focusMore,
        });
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
    reorder(moveShopItem(list, index, how), productId, true);
  }

  function remove(productId: string) {
    // Focus the next row's ⋯ button, else the previous one, else "Add".
    const index = rows.findIndex((entry) => entry.productId === productId);
    const neighbour = rows[index + 1] ?? rows[index - 1];
    focusAfterRemove.current = neighbour ? neighbour.productId : "";
    const commit = () =>
      run(
        withPositions(list.filter((entry) => entry.productId !== productId)),
        () => actions.remove(productId),
        // Already gone (e.g. removed in another tab) is the outcome we wanted.
        (result) =>
          result.ok || ("error" in result && result.error === "not_found"),
      );
    // Collapse the row first; the rows below then slide up (FLIP).
    const row = listRef.current?.querySelector(
      `[data-shop-row="${CSS.escape(productId)}"]`,
    );
    if (!row || !canAnimate(row)) return commit();
    row.style.overflow = "hidden";
    row
      .animate(
        [
          { opacity: 1, height: `${row.offsetHeight}px` },
          {
            opacity: 0,
            height: "0px",
            paddingBlock: "0px",
            borderWidth: "0px",
          },
        ],
        {
          duration: LIST_MOTION.duration - 40,
          easing: LIST_MOTION.easing,
          fill: "forwards",
        },
      )
      .finished.then(commit, commit);
  }

  useEffect(() => {
    const target = focusAfterRemove.current;
    if (target === null) return;
    focusAfterRemove.current = null;
    const section = sectionRef.current;
    const next =
      (target &&
        section?.querySelector<HTMLElement>(
          `[data-shop-more="${CSS.escape(target)}"]`,
        )) ||
      section?.querySelector<HTMLElement>("[data-shop-add]");
    next?.focus();
  }, [list]);

  function add(ids: string[]) {
    const added: CreatorShopEditorItem[] = ids.flatMap((id) => {
      const candidate = candidates.find((entry) => entry.productId === id);
      return candidate
        ? [
            {
              productId: candidate.productId,
              position: 0,
              visible: true,
              availability: candidate.availability,
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
  // Three disjoint groups, so the summary and the filters always agree:
  // shown on the profile, hidden by the creator, and switched on but not
  // currently shown (ended, not started, no photo, link unavailable).
  const isShown = (item: CreatorShopEditorItem) =>
    isPubliclyShown(item.visible, item.availability);
  const shownCount = list.filter(isShown).length;
  const hiddenCount = list.filter((item) => !item.visible).length;
  const unavailableCount = list.length - shownCount - hiddenCount;
  const rows = sortable.items.filter((item) =>
    effectiveFilter === "shown"
      ? isShown(item)
      : effectiveFilter === "hidden"
        ? !item.visible
        : true,
  );

  // FLIP: after any order change (drag, keyboard, menu, add, remove, or a
  // rollback) slide each row from where it was to where it is now. New rows
  // fade in from slightly above. The row under the pointer is left alone.
  const orderKey = rows.map((item) => item.productId).join(",");
  useLayoutEffect(() => {
    const list = listRef.current;
    const previous = tops.current;
    const next = new Map<string, number>();
    for (const row of list?.querySelectorAll<HTMLElement>(
      ":scope > [data-shop-row]",
    ) ?? []) {
      const id = row.dataset.shopRow!;
      next.set(id, row.offsetTop);
      if (!previous || row.dataset.dragging || !canAnimate(row)) continue;
      const before = previous.get(id);
      const timing = {
        duration: LIST_MOTION.duration,
        easing: LIST_MOTION.easing,
      };
      if (before === undefined)
        row.animate(
          [
            { opacity: 0, transform: "translateY(-8px)" },
            { opacity: 1, transform: "none" },
          ],
          timing,
        );
      else if (before !== row.offsetTop)
        row.animate(
          [
            { transform: `translateY(${before - row.offsetTop}px)` },
            { transform: "none" },
          ],
          timing,
        );
    }
    tops.current = list ? next : null;
  }, [orderKey]);

  // Once the moved row is in its new place: briefly highlight it, bring it
  // into view, and keep focus with it.
  useLayoutEffect(() => {
    if (!settle) return;
    if (rows[settle.index]?.productId !== settle.id) return;
    setSettle(null);
    const row = listRef.current?.querySelector<HTMLElement>(
      `[data-shop-row="${CSS.escape(settle.id)}"]`,
    );
    if (!row) return;
    row.removeAttribute("data-settled");
    void row.offsetWidth; // restart the highlight if it is still running
    row.setAttribute("data-settled", "");
    row.addEventListener(
      "animationend",
      () => row.removeAttribute("data-settled"),
      { once: true },
    );
    row.scrollIntoView?.({
      block: "nearest",
      behavior: prefersReducedMotion() ? "auto" : "smooth",
    });
    if (settle.focusMore)
      row
        .querySelector<HTMLElement>("[data-shop-more]")
        ?.focus({ preventScroll: true });
    // `orderKey` stands for `rows`, which is a new array every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settle, orderKey]);

  const preview = list
    .map(asPublic)
    .filter((item): item is PublicShopItem => item !== null)
    .slice(0, PREVIEW_ITEMS);
  const menuItem = list.find((item) => item.productId === menu?.id) ?? null;
  const menuIndex = menuItem ? list.indexOf(menuItem) : -1;

  const addButton = (
    <button
      type="button"
      className="profile-button primary"
      data-shop-add=""
      onClick={() => setPickerOpen(true)}
    >
      <span aria-hidden="true">+</span>
      {copy.add}
    </button>
  );

  return (
    <section
      className="shop-editor"
      aria-labelledby="shop-editor-title"
      ref={sectionRef}
    >
      <header className="shop-editor-header">
        <div>
          <h2 id="shop-editor-title">{copy.title}</h2>
          {list.length ? (
            <p className="shop-editor-summary">
              {fillShopCopy(copy.summary, {
                shown: shownCount,
                hidden: hiddenCount,
              })}
              {unavailableCount
                ? ` · ${fillShopCopy(copy.unavailableCount, {
                    count: unavailableCount,
                  })}`
                : null}
            </p>
          ) : null}
          <div
            className="shop-editor-status"
            data-state={status === "idle" ? undefined : status}
          >
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
              <button
                type="button"
                className="shop-text-button"
                onClick={retry}
              >
                {copy.retry}
              </button>
            ) : null}
          </div>
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
            <ul className="shop-editor-list" ref={listRef}>
              {rows.map((item) => (
                <ShopEditorRow
                  key={item.productId}
                  item={item}
                  copy={copy}
                  dragEnabled={dragEnabled}
                  rowProps={sortable.itemProps(item.productId)}
                  handleProps={sortable.handleProps(item.productId)}
                  onToggle={() => setVisible(item)}
                  onMore={(anchor) => setMenu({ id: item.productId, anchor })}
                />
              ))}
            </ul>
            <p className="sr-only" aria-live="polite">
              {sortable.announcement}
            </p>
          </div>
          <aside className="shop-editor-preview" aria-label={copy.preview}>
            <p className="shop-editor-preview-label">{copy.preview}</p>
            {/* A picture of the public grid: not clickable, not focusable. */}
            <div className="shop-phone" inert aria-hidden="true">
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
        anchor={menu?.anchor ?? null}
        canMove={dragEnabled}
        onClose={() => setMenu(null)}
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
  onMore(anchor: DOMRect): void;
}) {
  const nameId = useId();
  return (
    <li
      {...rowProps}
      className="shop-editor-row"
      data-shop-row={item.productId}
      data-hidden={item.visible ? undefined : "true"}
    >
      {dragEnabled ? (
        <button
          type="button"
          className="shop-editor-handle"
          aria-label={fillShopCopy(copy.reorder, { title: item.title })}
          {...handleProps}
        >
          <svg
            aria-hidden="true"
            width="12"
            height="18"
            viewBox="0 0 12 18"
            fill="currentColor"
          >
            {[3, 9, 15].flatMap((cy) =>
              [3, 9].map((cx) => (
                <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r="1.6" />
              )),
            )}
          </svg>
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
        data-shop-more={item.productId}
        onClick={(event) => onMore(event.currentTarget.getBoundingClientRect())}
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
  anchor,
  canMove,
  onClose,
  onMove,
  onRemove,
}: {
  item: CreatorShopEditorItem | null;
  index: number;
  count: number;
  copy: CreatorShopCopy;
  phone: boolean;
  /** The ⋯ button's rect, taken from the click (not from focus). */
  anchor: DOMRect | null;
  /** Moves act on the whole list, so they only make sense unfiltered. */
  canMove: boolean;
  onClose(): void;
  onMove(how: ShopMove): void;
  onRemove(): void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const node = dialog.current;
    if (!node) return;
    if (item && !node.open) {
      node.showModal();
      // On wide screens: a popover under the ⋯ button, flipped above it near
      // the bottom edge and always kept inside the viewport.
      if (!phone && anchor) {
        const margin = 8;
        const { offsetHeight: height, offsetWidth: width } = node;
        let top = anchor.bottom + 4;
        if (top + height > window.innerHeight - margin)
          top = anchor.top - 4 - height;
        top = Math.max(
          margin,
          Math.min(top, window.innerHeight - height - margin),
        );
        const left = Math.max(
          margin,
          Math.min(anchor.right - width, window.innerWidth - width - margin),
        );
        node.style.setProperty("--menu-top", `${top}px`);
        node.style.setProperty("--menu-left", `${left}px`);
      }
    }
    if (!item && node.open) node.close();
  }, [item, phone, anchor]);

  // Close through the clicked button, not the ref, so handlers stay pure.
  function choose(event: MouseEvent<HTMLElement>, action: () => void) {
    event.currentTarget.closest("dialog")?.close();
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
            {canMove
              ? (
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
                    onClick={(event) => choose(event, () => onMove(how))}
                  >
                    {text}
                  </button>
                ))
              : null}
            <button
              type="button"
              className="danger"
              onClick={(event) => choose(event, onRemove)}
            >
              {copy.remove}
            </button>
            {phone ? (
              <button
                type="button"
                className="shop-menu-close"
                onClick={(event) =>
                  event.currentTarget.closest("dialog")?.close()
                }
              >
                {copy.close}
              </button>
            ) : null}
          </div>
        </>
      ) : null}
    </dialog>
  );
}
