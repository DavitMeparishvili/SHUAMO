import { Banner } from "@/src/modules/design-system";

export type PendingEscalation = "none" | "notice" | "warning" | "danger";

export function pendingEscalation(oldestDays: number): PendingEscalation {
  if (oldestDays >= 30) return "danger";
  if (oldestDays >= 14) return "warning";
  if (oldestDays >= 7) return "notice";
  return "none";
}

export function PendingBanner({
  count,
  oldestDays,
  copy,
}: {
  count: number;
  oldestDays: number;
  copy: {
    title: string;
    body: string;
  };
}) {
  const escalation = pendingEscalation(oldestDays);
  if (count === 0 || escalation === "none") return null;
  return (
    <Banner
      tone={
        escalation === "danger"
          ? "danger"
          : escalation === "warning"
            ? "warning"
            : "info"
      }
      title={copy.title
        .replace("{count}", String(count))
        .replace("{days}", String(oldestDays))}
      body={copy.body
        .replace("{count}", String(count))
        .replace("{days}", String(oldestDays))}
    />
  );
}
