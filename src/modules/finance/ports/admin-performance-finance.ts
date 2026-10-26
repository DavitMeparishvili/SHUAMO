export interface AdminPerformanceFinance {
  period: {
    from: string;
    to: string;
    brandReceipts: string;
    creatorPayouts: string;
  };
  current: {
    brandOutstanding: string;
    brandCredits: string;
    creatorUnpaid: string;
    creatorOverpayments: string;
  };
  brands: { id: string; periodReceipts: string; outstanding: string }[];
  creators: { id: string; periodPayouts: string; unpaid: string }[];
}
export interface PerformanceFinanceQuery {
  from: string;
  to: string;
  brandIds: string[];
  creatorIds: string[];
}
// What a team lead may see about their members: no platform totals and no
// brand figures.
export interface TeamPerformanceFinance {
  creators: { id: string; periodPayouts: string; unpaid: string }[];
}
