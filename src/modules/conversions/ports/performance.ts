import type { ConversionStatus } from "../domain/order-transitions";
import type { PerformancePeriod } from "../domain/performance-period";

export type PerformanceRole = "creator" | "brand";
export type PerformanceBreakdownKind =
  "brands" | "creators" | "products" | "links";

export interface PerformanceFilters {
  period: PerformancePeriod;
  from?: string;
  to?: string;
  brandId?: string;
  creatorId?: string;
  productId?: string;
  linkId?: string;
  status?: ConversionStatus;
  ledgerQuery?: string;
  ledgerPage?: number;
  clickPage?: number;
  breakdownPage?: number;
}

export interface PerformanceTotals {
  clicks: number;
  convertedClicks: number;
  orders: number;
  units: number;
  convertedClickRate: number;
  sales: string;
  confirmed: string;
  cancelled: string;
}

export interface LinkPerformanceRow extends PerformanceTotals {
  id: string;
  code: string;
  status: "ACTIVE" | "DISABLED";
  productId: string;
  productTitle: string;
  productSku: string;
  imageUrl?: string;
  brandId: string;
  brandName: string;
  creatorId: string;
  creatorName: string;
}

export interface PerformanceBreakdownRow extends PerformanceTotals {
  id: string;
  label: string;
  detail?: string;
  imageUrl?: string;
  status?: "ACTIVE" | "DISABLED";
  href: string;
}

export interface PerformanceTrendPoint {
  date: string;
  clicks: number;
  orders: number;
  earnings: string;
}

export interface EarningsLedgerRow {
  id: string;
  orderId: string;
  occurredAt: string;
  status: ConversionStatus;
  brandId: string;
  brandName: string;
  creatorId: string;
  creatorName: string;
  productId: string;
  productTitle: string;
  sku: string;
  linkId: string;
  linkCode: string;
  clickId: string;
  quantity: number;
  commissionableNet: string;
  commissionAmount: string;
}

export interface ClickLedgerRow {
  id: string;
  occurredAt: string;
  creditable: boolean;
  brandName: string;
  creatorName: string;
  productTitle: string;
  linkCode: string;
  orderIds: readonly string[];
}

export interface PerformanceFilterOption {
  id: string;
  label: string;
}

export interface PerformanceReport {
  role: PerformanceRole;
  generatedAt: string;
  period: PerformancePeriod;
  totals: PerformanceTotals;
  comparison?: PerformanceTotals;
  trend: readonly PerformanceTrendPoint[];
  breakdowns: {
    brands: readonly PerformanceBreakdownRow[];
    creators: readonly PerformanceBreakdownRow[];
    products: readonly PerformanceBreakdownRow[];
    links: readonly PerformanceBreakdownRow[];
  };
  ledger: {
    rows: readonly EarningsLedgerRow[];
    page: number;
    pageCount: number;
    total: number;
  };
  clickLedger: {
    rows: readonly ClickLedgerRow[];
    page: number;
    pageCount: number;
    total: number;
  };
  options: {
    brands: readonly PerformanceFilterOption[];
    creators: readonly PerformanceFilterOption[];
  };
  scope: { brands: number; creators: number; products: number; links: number };
}
