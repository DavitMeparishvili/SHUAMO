export interface AdminPerformanceQuery {
  tab: "overview" | "brands" | "creators" | "products";
  from: string;
  to: string;
  brandId?: string | undefined;
  creatorId?: string | undefined;
  // Set only by the team-lead use cases, never parsed from a URL: limits the
  // report to creators whose team_lead_id is this creator.
  teamLeadId?: string | undefined;
  productStatus: "ALL" | "ACTIVE" | "ARCHIVED";
  q: string;
  sort: "sales_count" | "sales_value" | "clicks" | "commission" | "name";
  direction: "asc" | "desc";
  page: number;
}
export interface AdminPerformanceMetrics {
  clicks: number;
  salesCount: number;
  salesValue: string;
  commission: string;
}
export interface AdminPerformanceRow extends AdminPerformanceMetrics {
  id: string;
  name: string;
  kind: "brand" | "creator" | "product";
  brandId?: string;
  brandName?: string;
  sku?: string;
  status?: "ACTIVE" | "ARCHIVED";
}
export interface AdminPerformanceReport {
  query: AdminPerformanceQuery;
  totals: AdminPerformanceMetrics;
  trend: Array<{
    from: string;
    to: string;
    salesValue: string;
    commission: string;
  }>;
  rows: {
    items: AdminPerformanceRow[];
    page: number;
    pageSize: 25;
    total: number;
  };
}
export interface AdminProductPerformanceReport extends AdminPerformanceReport {
  product: {
    id: string;
    title: string;
    sku: string;
    brandId: string;
    brandName: string;
    status: "ACTIVE" | "ARCHIVED";
  };
}
export type AdminExportScope =
  "overview" | "brands" | "creators" | "products" | "product_creators";
export interface AdminPerformanceRepository {
  report(query: AdminPerformanceQuery): Promise<AdminPerformanceReport>;
  productReport(
    id: string,
    query: AdminPerformanceQuery,
  ): Promise<AdminProductPerformanceReport | undefined>;
  exportRows(
    scope: Exclude<AdminExportScope, "overview">,
    query: AdminPerformanceQuery,
    productId?: string,
  ): Promise<{ rows: AdminPerformanceRow[]; total: number; limit: 10000 }>;
  options(): Promise<{
    brands: { id: string; name: string }[];
    creators: { id: string; name: string }[];
  }>;
}
