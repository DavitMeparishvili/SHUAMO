import type { LinkState } from "@/src/modules/partnerships";

export interface LinkSnapshot {
  linkId: string;
  brandId: string;
  backlinkUrl: string;
  state: LinkState;
}

export interface LinkLookup {
  byCode(code: string): Promise<LinkSnapshot | undefined>;
}
