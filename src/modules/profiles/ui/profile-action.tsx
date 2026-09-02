import { Button } from "@/src/modules/design-system";
export function ProfileAction({
  kind,
  label,
  href,
  action,
}: {
  kind: "link" | "form" | "status";
  label: string;
  href?: string;
  action?: () => Promise<void>;
}) {
  if (kind === "status")
    return (
      <p className="rounded-pill border border-slate-300 px-5 py-3 text-center font-semibold text-ink">
        {label}
      </p>
    );
  if (kind === "link")
    return (
      <a
        className="inline-flex min-h-11 items-center justify-center rounded-pill bg-signal px-5 type-small font-semibold text-paper no-underline hover:bg-signal-hover"
        href={href}
      >
        {label}
      </a>
    );
  return (
    <form action={action}>
      <Button className="w-full" type="submit">
        {label}
      </Button>
    </form>
  );
}
