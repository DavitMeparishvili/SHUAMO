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
 *   Move/up/cancel are tracked on window for the whole drag, because React
 *   moving the dragged row can drop the handle's pointer capture. Escape
 *   cancels.
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
  const detachPointer = useRef<(() => void) | null>(null);
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
      const viaPointer = detachPointer.current !== null;
      detachPointer.current?.();
      detachPointer.current = null;
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
      const changed = !sameOrder(next, items);
      const position = next.findIndex((entry) => getId(entry) === id) + 1;
      // A plain click on the handle is not a drop worth announcing.
      if (item && announce && (changed || !viaPointer))
        setAnnouncement(announce.dropped(item, position));
      if (changed) onReorder(next);
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

  // Window listeners call the latest render's callbacks.
  const latest = useRef({ finish, followPointer });
  useLayoutEffect(() => {
    latest.current = { finish, followPointer };
  });

  useEffect(
    () => () => {
      if (frame.current !== null) cancelAnimationFrame(frame.current);
      detachPointer.current?.();
    },
    [],
  );

  function attachPointer(id: string, pointerId: number) {
    const move = (event: globalThis.PointerEvent) => {
      if (event.pointerId !== pointerId) return;
      pointerY.current = event.clientY;
      latest.current.followPointer(id, event.clientY);
    };
    const up = (event: globalThis.PointerEvent) => {
      if (event.pointerId === pointerId) latest.current.finish(true, id);
    };
    const cancel = (event: globalThis.PointerEvent) => {
      if (event.pointerId === pointerId) latest.current.finish(false, id);
    };
    const key = (event: globalThis.KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      latest.current.finish(false, id);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", cancel);
    window.addEventListener("keydown", key);
    detachPointer.current = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", cancel);
      window.removeEventListener("keydown", key);
    };
  }

  function start(id: string, how: "pointer" | "keyboard") {
    setDraft(items);
    live.current = items;
    setDraggingId(id);
    setMode(how);
    const item = find(items, id);
    if (item && announce && how === "keyboard")
      setAnnouncement(announce.picked(item));
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
        // Capture keeps touch from turning into a scroll; window listeners
        // carry the drag if React's row move drops the capture.
        event.currentTarget.setPointerCapture?.(event.pointerId);
        start(id, "pointer");
        attachPointer(id, event.pointerId);
        pointerY.current = event.clientY;
        frame.current = requestAnimationFrame(() => autoScroll(id));
      },
      // Losing capture is expected when the row moves; the window listeners
      // attached on pointerdown still see the rest of the gesture.
      onLostPointerCapture: () => undefined,
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
