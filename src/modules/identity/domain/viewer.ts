export type Viewer =
  | { kind: "anonymous" }
  | {
      kind: "brand";
      userId: string;
      brandId: string;
      brandName: string;
      isAdmin: boolean;
    }
  | {
      kind: "creator";
      userId: string;
      creatorId: string;
      displayName: string;
      isAdmin: boolean;
      // Present only when true, so a plain creator viewer keeps its shape.
      isTeamLead?: true;
    }
  | { kind: "admin"; userId: string };
