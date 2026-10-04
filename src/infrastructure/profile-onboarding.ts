import { cache } from "react";
import { prisma } from "@/src/infrastructure/db/client";
import type { Viewer } from "@/src/modules/identity";

const readPublication = cache(async (role: "brand" | "creator", id: string) => {
  const profile =
    role === "brand"
      ? await prisma.brandProfile.findUnique({
          where: { brandId: id },
          select: { status: true },
        })
      : await prisma.creatorProfile.findUnique({
          where: { creatorId: id },
          select: { status: true },
        });
  return profile?.status === "PUBLISHED";
});

export function profileIsPublished(viewer: Viewer): Promise<boolean> {
  if (viewer.kind === "brand") return readPublication("brand", viewer.brandId);
  if (viewer.kind === "creator")
    return readPublication("creator", viewer.creatorId);
  return Promise.resolve(true);
}
