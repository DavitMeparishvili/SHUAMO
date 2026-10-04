"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { Locale } from "@/src/modules/localization";
import { profileSetupCopy } from "./profile-setup-copy";

export function ProfileLeaveGuard({
  locale,
  role,
  privateProfile,
  dirty,
  busy = false,
}: {
  locale: Locale;
  role: "brand" | "creator";
  privateProfile: boolean;
  dirty: boolean;
  busy?: boolean;
}) {
  const router = useRouter();
  const dialog = useRef<HTMLDialogElement>(null);
  const destination = useRef("");
  const historyGuard = useRef(false);
  const restoring = useRef(false);
  const navigating = useRef(false);
  const backIntent = useRef(false);
  const [open, setOpen] = useState(false);
  const copy = profileSetupCopy(locale, role);
  useEffect(() => {
    const leave = (event: MouseEvent) => {
      if (!privateProfile && !dirty && !busy) return;
      if (
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey
      )
        return;
      const link = (event.target as Element).closest<HTMLAnchorElement>(
        "a[href]",
      );
      if (!link || link.target === "_blank" || link.hasAttribute("download"))
        return;
      const url = new URL(link.href, window.location.href);
      if (
        url.origin !== window.location.origin ||
        (url.pathname === window.location.pathname &&
          url.search === window.location.search)
      )
        return;
      event.preventDefault();
      event.stopPropagation();
      destination.current = url.pathname + url.search + url.hash;
      backIntent.current = false;
      setOpen(true);
    };
    const back = (event: PopStateEvent) => {
      if (restoring.current) {
        restoring.current = false;
        event.stopImmediatePropagation();
        return;
      }
      if (!historyGuard.current || navigating.current) return;
      event.stopImmediatePropagation();
      // Restore the same-URL sentinel while the user decides, before Next
      // handles the history event and unmounts the editable form.
      restoring.current = true;
      history.go(1);
      backIntent.current = true;
      setOpen(true);
    };
    const unload = (event: BeforeUnloadEvent) => {
      if ((dirty || busy) && !navigating.current) {
        event.preventDefault();
        event.returnValue = "";
      }
    };
    document.addEventListener("click", leave, true);
    window.addEventListener("popstate", back, true);
    window.addEventListener("beforeunload", unload);
    return () => {
      document.removeEventListener("click", leave, true);
      window.removeEventListener("popstate", back, true);
      window.removeEventListener("beforeunload", unload);
    };
  }, [privateProfile, dirty, busy]);
  const guardNeeded = privateProfile || dirty || busy;
  useEffect(() => {
    if (guardNeeded && !historyGuard.current) {
      history.pushState(
        { ...history.state, profileEditorGuard: true },
        "",
        location.href,
      );
      historyGuard.current = true;
    } else if (!guardNeeded && historyGuard.current && !navigating.current) {
      historyGuard.current = false;
      restoring.current = true;
      history.back();
    }
  }, [guardNeeded]);
  useEffect(() => {
    if (open) dialog.current?.showModal();
    else dialog.current?.close();
  }, [open]);
  return (
    <dialog
      ref={dialog}
      className="profile-leave-dialog"
      aria-labelledby="profile-leave-title"
      aria-describedby="profile-leave-description"
      onCancel={() => setOpen(false)}
      onClose={() => setOpen(false)}
    >
      <h2 id="profile-leave-title">
        {privateProfile ? copy.leave : copy.leaveDirty}
      </h2>
      <div id="profile-leave-description">
        {privateProfile ? <p>{copy.leaveBody}</p> : null}
        {dirty ? <p>{copy.leaveDirty}</p> : null}
        {busy ? <p role="status">{copy.wait}</p> : null}
      </div>
      <div className="profile-leave-actions">
        <button
          type="button"
          className="profile-button primary"
          autoFocus
          onClick={() => setOpen(false)}
        >
          {copy.stay}
        </button>
        <button
          type="button"
          className="profile-button"
          disabled={busy}
          onClick={() => {
            setOpen(false);
            navigating.current = true;
            const hadSentinel = historyGuard.current;
            historyGuard.current = false;
            if (backIntent.current) history.go(hadSentinel ? -2 : -1);
            else {
              const target = new URL(destination.current, location.origin);
              if (privateProfile && target.pathname === `/${locale}/${role}`) {
                target.searchParams.set("setup", "later");
              }
              const href = target.pathname + target.search + target.hash;
              if (hadSentinel) router.replace(href);
              else router.push(href);
            }
          }}
        >
          {copy.later}
        </button>
      </div>
    </dialog>
  );
}
