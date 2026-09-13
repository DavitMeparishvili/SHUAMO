import Decimal from "decimal.js";
import Image from "next/image";
import { Icon } from "@/src/modules/design-system";
import type { ProductWorkspaceCopy } from "./product-workspace-copy";

// Pin separators: ka-GE's ICU data differs between Node and browser versions.
// Decimal also preserves stored monetary precision before rounding for display.
export function productMoney(amount: string | number, locale: string) {
  const [whole, fraction] = new Decimal(amount).toFixed(2).split(".");
  const group = locale === "ka" ? "\u00a0" : ",";
  const separator = locale === "ka" ? "," : ".";
  return `${whole!.replace(/\B(?=(\d{3})+(?!\d))/g, group)}${separator}${fraction} ₾`;
}

export function offerRate(type: string, value: string, locale: string) {
  return type === "PERCENT"
    ? new Decimal(value).times(100).toString() + "%"
    : productMoney(value, locale);
}
export function ProductThumb({ src }: { src: string | null }) {
  return (
    <span className="pl-thumb">
      {src ? (
        <Image src={src} width={72} height={80} alt="" unoptimized />
      ) : (
        <Icon name="image" />
      )}
    </span>
  );
}
export function ProductStatus({
  status,
  copy,
}: {
  status: string;
  copy: ProductWorkspaceCopy;
}) {
  return (
    <span
      className={
        "pl-status " + (status === "ACTIVE" ? "pl-active" : "pl-disabled")
      }
    >
      {status === "ACTIVE"
        ? copy.active
        : status === "ARCHIVED"
          ? copy.archived
          : copy.disabled}
    </span>
  );
}
export function MoreIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 20 20"
      aria-hidden="true"
      fill="currentColor"
    >
      <circle cx="4" cy="10" r="1.5" />
      <circle cx="10" cy="10" r="1.5" />
      <circle cx="16" cy="10" r="1.5" />
    </svg>
  );
}
