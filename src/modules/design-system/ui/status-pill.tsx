export const PILL_STATES = [
  "pending",
  "confirmed",
  "cancelled",
  "unattributed",
  "active",
  "disabled",
  "accrued",
  "available",
  "in-transit",
  "paid",
] as const;

export type PillState = (typeof PILL_STATES)[number];

const STATE_CLASS: Record<PillState, string> = {
  pending: "bg-accrued-soft text-accrued",
  confirmed: "bg-settled-soft text-settled",
  cancelled: "bg-reversed-soft text-reversed",
  unattributed: "bg-slate-100 text-slate-700",
  active: "bg-settled-soft text-settled",
  disabled: "bg-slate-100 text-slate-700",
  accrued: "bg-accrued-soft text-accrued",
  available: "bg-settled-soft text-settled",
  "in-transit": "bg-accrued-soft text-accrued",
  paid: "bg-settled-soft text-settled",
};

export function StatusPill({
  state,
  label,
}: {
  state: PillState;
  label: string;
}) {
  return (
    <span
      className={`inline-flex min-h-6 items-center rounded-pill px-3 py-1 type-caption ${STATE_CLASS[state]}`}
      data-state={state}
    >
      {label}
    </span>
  );
}
