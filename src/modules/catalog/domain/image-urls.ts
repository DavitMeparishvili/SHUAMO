import type { Result } from "@/src/modules/shared";

export type ImageUrlError =
  "too_many_images" | "empty_url" | "insecure_url" | "invalid_url";

export function parseImageUrls(
  values: readonly string[],
): Result<string[], ImageUrlError> {
  if (values.length > 8) return { ok: false, error: "too_many_images" };
  const parsed: string[] = [];
  for (const value of values) {
    if (value.length === 0) return { ok: false, error: "empty_url" };
    try {
      const url = new URL(value);
      if (url.protocol !== "https:" && url.hostname !== "localhost") {
        return { ok: false, error: "insecure_url" };
      }
      parsed.push(value);
    } catch {
      return { ok: false, error: "invalid_url" };
    }
  }
  return { ok: true, value: parsed };
}
