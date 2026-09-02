import type {
  BrandProfileInput,
  CreatorProfileInput,
  ProfileStatus,
} from "../domain/profile-content";

export interface ProfileDirectoryFilters {
  query?: string;
  category?: string;
  location?: string;
}
export interface ProfileRepository {
  getBrandForOwner(brandId: string): Promise<unknown>;
  getCreatorForOwner(creatorId: string): Promise<unknown>;
  saveBrand(brandId: string, input: BrandProfileInput): Promise<unknown>;
  saveCreator(creatorId: string, input: CreatorProfileInput): Promise<unknown>;
  setBrandStatus(brandId: string, status: ProfileStatus): Promise<void>;
  setCreatorStatus(creatorId: string, status: ProfileStatus): Promise<void>;
}
