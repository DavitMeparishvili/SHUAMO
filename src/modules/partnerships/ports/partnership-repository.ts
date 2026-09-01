export type PartnershipStatusValue = "PENDING" | "APPROVED" | "REJECTED";

export interface PartnershipRecord {
  id: string;
  brandId: string;
  creatorId: string;
  status: PartnershipStatusValue;
}

export interface PartnershipRepository {
  find(
    brandId: string,
    creatorId: string,
  ): Promise<PartnershipRecord | undefined>;
  findForBrand(
    brandId: string,
    id: string,
  ): Promise<PartnershipRecord | undefined>;
  create(input: {
    brandId: string;
    creatorId: string;
    status: PartnershipStatusValue;
  }): Promise<PartnershipRecord>;
  setStatus(id: string, status: PartnershipStatusValue): Promise<void>;
  listApprovedCreatorIds(brandId: string): Promise<string[]>;
}
