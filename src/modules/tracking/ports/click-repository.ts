export interface ClickWrite {
  id: string;
  trackingLinkId: string;
  brandId: string;
  visitorId: string | undefined;
  fpHash: string;
  occurredAt: Date;
  creditable: boolean;
}

export type ClickDraft = Omit<ClickWrite, "creditable">;

export type DedupSignal =
  | { kind: "visitor"; value: string; since: Date }
  | { kind: "fingerprint"; value: string; since: Date };

export interface ClickRepository {
  findPriorByVisitor(
    trackingLinkId: string,
    visitorId: string,
    since: Date,
  ): Promise<Date | undefined>;
  findPriorByFingerprint(
    trackingLinkId: string,
    fpHash: string,
    since: Date,
  ): Promise<Date | undefined>;
  insert(click: ClickWrite): Promise<void>;
  /** Production fast path: dedup and insert in one PostgreSQL statement. */
  insertDeduplicated?: (
    click: ClickDraft,
    signal: DedupSignal,
  ) => Promise<void>;
}
