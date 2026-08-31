import { Money } from "@/src/modules/shared";

const TONE_CLASS = {
  neutral: "text-ink",
  accrued: "text-accrued",
  settled: "text-settled",
  reversed: "text-reversed",
} as const;

const SIZE_CLASS = {
  sm: "type-mono",
  md: "type-figure",
  lg: "type-figure-lg",
} as const;

export function MoneyAmount({
  value,
  tone = "neutral",
  size = "md",
}: {
  value: Money;
  tone?: keyof typeof TONE_CLASS;
  size?: keyof typeof SIZE_CLASS;
}) {
  if (!(value instanceof Money)) {
    throw new TypeError("MoneyAmount requires an exact Money value");
  }

  const amount = value.toStorageString();

  return (
    <span
      className={`${SIZE_CLASS[size]} ${TONE_CLASS[tone]}`}
      data-amount={amount}
    >
      {amount} ₾
    </span>
  );
}
