"use client";
import { useEffect, useId, useRef, useState, type ReactNode } from "react";

/**
 * The creator bio. On phones CSS clamps it to three lines; when the clamp
 * actually hides text, a toggle reveals the rest. Wider screens show the
 * whole bio, so the toggle never appears there.
 */
export function CreatorDescription({
  children,
  readMore,
  showLess,
}: {
  children: ReactNode;
  readMore: string;
  showLess: string;
}) {
  const id = useId();
  const textRef = useRef<HTMLParagraphElement>(null);
  const [expanded, setExpanded] = useState(false);
  const [clamped, setClamped] = useState(false);
  useEffect(() => {
    const text = textRef.current;
    if (!text || expanded) return;
    const measure = () => setClamped(text.scrollHeight > text.clientHeight + 1);
    measure();
    if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(measure);
    observer.observe(text);
    return () => observer.disconnect();
  }, [expanded]);
  return (
    <div className="creator-description-block">
      <p
        className="creator-description"
        id={id}
        data-expanded={expanded || undefined}
        ref={textRef}
      >
        {children}
      </p>
      {clamped || expanded ? (
        <button
          type="button"
          className="creator-description-toggle"
          aria-expanded={expanded}
          aria-controls={id}
          onClick={() => setExpanded((value) => !value)}
        >
          {expanded ? showLess : readMore}
        </button>
      ) : null}
    </div>
  );
}
