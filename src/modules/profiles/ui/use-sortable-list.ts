"use client";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type HTMLAttributes,
  type KeyboardEvent,
  type PointerEvent,
} from "react";

/** Distance from the viewport edge, in px, that scrolls the page mid-drag. */
const EDGE = 48;
const SCROLL_STEP = 12;

export interface SortableAnnouncements<T> {
  picked(item: T): string;
  moved(item: T, position: number): string;
  dropped(item: T, position: number): string;
  cancelled(item: T): string;
}

type RefProps = { ref: (node: HTMLElement | null) => void };

/**
 * A dependency-free sortable list for mouse, touch and keyboard.
 *
 * - Pointer: press the handle and move; the order follows the pointer's Y
 *   against the other rows' midpoints, and the page scrolls near the edges.
 * - Keyboard on the handle: Space/Enter picks up, ArrowUp/ArrowDown move,
 *   Space/Enter drops, Escape restores the original order.
 *
 * `items` in the result is the order to render: the live drag order while
 * dragging, otherwise the input. `onReorder` runs once, on drop, and only
 * when the order actually changed.
 */
export function useSortableList<T>(
  items: T[],
  getId: (item: T) => string,
  onReorder: (next: T[]) => void,
  options: {
    disabled?: boolean;
    announcements?: SortableAnnouncements<T>;
  } = {},
) {
  const [draft, setDraft] = useState<T[] | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [mode, setMode] = useState<"pointer" | "keyboard" | null>(null);
  const [announcement, setAnnouncement] = useState("");
  const rows = useRef(new Map<string, HTMLElement>());
  const handles = useRef(new Map<string, HTMLElement>());
  const pointerY = useRef<number | null>(null);
  const frame = useRef<number | null>(null);
  const live = useRef<T[] | null>(null);
  const ordered = draft ?? items;
  live.current = draft;

  const announce = options.announcements;
  const find = (list: T[], id: string) =>
    list.find((item) => getId(item) === id);

  const sameOrder = (a: T[], b: T[]) =>
    a.length === b.length && a.every((item, i) => getId(item) === getId(b[i]!));

  const finish = useCallback(
    (commit: boolean, id: string) => {
      const next = live.current;
      setDraft(null);
      setDraggingId(null);
      setMode(null);
      pointerY.current = null;
      if (frame.current !== null) cancelAnimationFrame(frame.current);
      frame.current = null;
      if (!next) return;
      const item = find(next, id);
      if (!commit) {
        if (item && announce) setAnnouncement(announce.cancelled(item));
        return;
      }
      const position = next.findIndex((entry) => getId(entry) === id) + 1;
      if (item && announce) setAnnouncement(announce.dropped(item, position));
      if (!sameOrder(next, items)) onReorder(next);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [items, onReorder, announce],
  );

  // React moves the focused handle's row when the order changes; keep focus
  // on the handle so keyboard dragging can continue.
  useLayoutEffect(() => {
    if (mode === "keyboard" && draggingId) {
      const handle = handles.current.get(draggingId);
      if (handle && document.activeElement !== handle) handle.focus();
    }
  }, [draft, draggingId, mode]);

  useEffect(
    () => () => {
      if (frame.current !== null) cancelAnimationFrame(frame.current);
    },
    [],
  );

  function start(id: string, how: "pointer" | "keyboard") {
    setDraft(items);
    live.current = items;
    setDraggingId(id);
    setMode(how);
    const item = find(items, id);
    if (item && announce) setAnnouncement(announce.picked(item));
  }

  function moveTo(id: string, index: number) {
    const current = live.current;
    if (!current) return;
    const from = current.findIndex((item) => getId(item) === id);
    if (from < 0 || index === from || index < 0 || index >= current.length)
      return;
    const next = [...current];
    const [item] = next.splice(from, 1) as [T];
    next.splice(index, 0, item);
    live.current = next;
    setDraft(next);
    if (announce) setAnnouncement(announce.moved(item, index + 1));
  }

  function followPointer(id: string, y: number) {
    const current = live.current;
    if (!current) return;
    let index = 0;
    for (const item of current) {
      const otherId = getId(item);
      if (otherId === id) continue;
      const rect = rows.current.get(otherId)?.getBoundingClientRect();
      if (rect && rect.top + rect.height / 2 < y) index += 1;
    }
    moveTo(id, index);
  }

  function autoScroll(id: string) {
    const y = pointerY.current;
    if (y === null) {
      frame.current = null;
      return;
    }
    const delta =
      y < EDGE ? -SCROLL_STEP : y > window.innerHeight - EDGE ? SCROLL_STEP : 0;
    if (delta !== 0) {
      window.scrollBy(0, delta);
      followPointer(id, y);
    }
    frame.current = requestAnimationFrame(() => autoScroll(id));
  }

  function handleProps(id: string): HTMLAttributes<HTMLElement> & RefProps {
    return {
      ref: (node) => {
        if (node) handles.current.set(id, node);
        else handles.current.delete(id);
      },
      onPointerDown: (event: PointerEvent<HTMLElement>) => {
        if (options.disabled || draggingId) return;
        if (event.pointerType === "mouse" && event.button !== 0) return;
        event.preventDefault();
        event.currentTarget.setPointerCapture?.(event.pointerId);
        start(id, "pointer");
        pointerY.current = event.clientY;
        frame.current = requestAnimationFrame(() => autoScroll(id));
      },
      onPointerMove: (event: PointerEvent<HTMLElement>) => {
        if (mode !== "pointer" || draggingId !== id) return;
        pointerY.current = event.clientY;
        followPointer(id, event.clientY);
      },
      onPointerUp: (event: PointerEvent<HTMLElement>) => {
        if (mode !== "pointer" || draggingId !== id) return;
        event.currentTarget.releasePointerCapture?.(event.pointerId);
        finish(true, id);
      },
      onPointerCancel: () => {
        if (mode === "pointer" && draggingId === id) finish(false, id);
      },
      onKeyDown: (event: KeyboardEvent<HTMLElement>) => {
        if (options.disabled) return;
        const pick = event.key === " " || event.key === "Enter";
        if (draggingId === null) {
          if (!pick) return;
          event.preventDefault();
          start(id, "keyboard");
          return;
        }
        if (draggingId !== id || mode !== "keyboard") return;
        const current = live.current ?? items;
        const index = current.findIndex((item) => getId(item) === id);
        if (pick) {
          event.preventDefault();
          finish(true, id);
        } else if (event.key === "ArrowUp") {
          event.preventDefault();
          moveTo(id, index - 1);
        } else if (event.key === "ArrowDown") {
          event.preventDefault();
          moveTo(id, index + 1);
        } else if (event.key === "Escape") {
          event.preventDefault();
          finish(false, id);
        }
      },
      onBlur: () => {
        if (mode === "keyboard" && draggingId === id) {
          // Focus can briefly leave while React moves the row; only cancel
          // when it has really gone somewhere else.
          requestAnimationFrame(() => {
            const handle = handles.current.get(id);
            if (handle && document.activeElement !== handle && live.current)
              finish(false, id);
          });
        }
      },
    };
  }

  function itemProps(id: string): HTMLAttributes<HTMLElement> & RefProps {
    return {
      ref: (node) => {
        if (node) rows.current.set(id, node);
        else rows.current.delete(id);
      },
      ...(draggingId === id ? { "data-dragging": "true" } : {}),
    } as HTMLAttributes<HTMLElement> & RefProps;
  }

  return { items: ordered, handleProps, itemProps, draggingId, announcement };
}
