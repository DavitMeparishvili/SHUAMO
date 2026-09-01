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
    }
  | { kind: "admin"; userId: string };
