export interface AuditEventInput {
  readonly actorId: string;
  readonly action: "conversion.confirmed" | "conversion.cancelled";
  readonly entityType: "conversion";
  readonly entityId: string;
  readonly changes: {
    readonly from: string;
    readonly to: string;
  };
  readonly at: Date;
}
