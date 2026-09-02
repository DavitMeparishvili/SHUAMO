import type { LocalizedText } from "../domain/localized-profile-text";
import type { SocialLink } from "../domain/profile-content";

export type ProfileActionState = {
  status: "idle" | "success" | "error";
  message?: string;
  fieldErrors?: Record<string, string>;
};

export const INITIAL_PROFILE_ACTION_STATE: ProfileActionState = {
  status: "idle",
};

export function commaSeparated(value: FormDataEntryValue | null) {
  return typeof value === "string"
    ? value
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean)
    : [];
}

function values(data: FormData, name: string) {
  return data
    .getAll(name)
    .map((value) => (typeof value === "string" ? value.trim() : ""));
}

export function explicitSocialLinks(data: FormData): SocialLink[] {
  const platforms = values(data, "socialPlatform");
  const urls = values(data, "socialUrl");
  return Array.from({ length: Math.max(platforms.length, urls.length) })
    .map((_, index) => ({
      platform: platforms[index] as SocialLink["platform"],
      url: urls[index] ?? "",
    }))
    .filter((link) => link.platform || link.url);
}

export function pairedLocalizedLines(
  kaValue: FormDataEntryValue | null,
  enValue: FormDataEntryValue | null,
): LocalizedText[] {
  const split = (value: FormDataEntryValue | null) =>
    typeof value === "string"
      ? value.split(/\r?\n/).map((line) => line.trim())
      : [];
  const ka = split(kaValue);
  const en = split(enValue);
  return Array.from({ length: Math.max(ka.length, en.length) })
    .map((_, index) => ({ ka: ka[index] ?? "", en: en[index] ?? "" }))
    .filter((item) => item.ka || item.en);
}

export function creatorWorkRows(data: FormData) {
  const titleKa = values(data, "workTitleKa");
  const titleEn = values(data, "workTitleEn");
  const urls = values(data, "workUrl");
  const imageUrls = values(data, "workImageUrl");
  return Array.from({
    length: Math.max(
      titleKa.length,
      titleEn.length,
      urls.length,
      imageUrls.length,
    ),
  })
    .map((_, index) => ({
      title: { ka: titleKa[index] ?? "", en: titleEn[index] ?? "" },
      url: urls[index] ?? "",
      imageUrl: imageUrls[index] ?? "",
    }))
    .filter(
      (work) => work.title.ka || work.title.en || work.url || work.imageUrl,
    );
}
