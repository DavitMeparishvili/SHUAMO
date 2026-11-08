/**
 * Motion for reorderable lists. Durations follow the design system's control
 * transitions (150–300ms); the tokens define no motion values of their own.
 */
export const LIST_MOTION = {
  duration: 200,
  easing: "cubic-bezier(0.2, 0, 0, 1)",
} as const;

export function prefersReducedMotion(): boolean {
  return (
    typeof window !== "undefined" &&
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

/** Web Animations are missing in jsdom and very old browsers. */
export function canAnimate(node: Element): node is HTMLElement {
  return (
    node instanceof HTMLElement &&
    typeof node.animate === "function" &&
    !prefersReducedMotion()
  );
}
