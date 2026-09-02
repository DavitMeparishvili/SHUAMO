const PROFILE_RETURN_PATH =
  /^\/(ka|en)\/(brands|creators)\/[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function safeProfileReturnTo(
  locale: "ka" | "en",
  value: string | string[] | undefined,
): string | undefined {
  if (typeof value !== "string" || !PROFILE_RETURN_PATH.test(value))
    return undefined;
  return value.startsWith(`/${locale}/`) ? value : undefined;
}
