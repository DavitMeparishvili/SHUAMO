import {
  buildProfileMediaKey,
  profileMediaContentType,
  profilePublicUrl,
  type ProfileMediaKind,
} from "../domain/profile-media";
import type { ProfileMediaStorage } from "../ports/profile-media-storage";

export function createProfileUploadUrl(deps: {
  storage: ProfileMediaStorage;
  uuid(): string;
  publicEndpoint: string;
  bucket: string;
}) {
  return async (
    context: { role: "brands" | "creators"; ownerId: string },
    input: { kind: ProfileMediaKind; contentType: string },
  ) => {
    if (
      (context.role === "brands" && !input.kind.startsWith("brand-")) ||
      (context.role === "creators" && !input.kind.startsWith("creator-"))
    )
      return { ok: false as const, error: "wrong_kind" as const };
    const contentType = profileMediaContentType(input.contentType);
    if (!contentType.ok) return contentType;
    const key = buildProfileMediaKey({
      ...context,
      kind: input.kind,
      contentType: contentType.value,
      uuid: deps.uuid(),
    });
    return {
      ok: true as const,
      value: {
        uploadUrl: await deps.storage.presignPut({
          key,
          contentType: contentType.value,
        }),
        publicUrl: profilePublicUrl(deps.publicEndpoint, deps.bucket, key),
      },
    };
  };
}
