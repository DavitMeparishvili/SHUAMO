import { Prisma } from "@/src/generated/prisma/client";
import { prisma } from "@/src/infrastructure/db/client";

export type BrandLinkStatusResult = { ok: true } | { ok: false; error: string };

/** Restoring a historical link must satisfy the same ownership and pair constraint as creation. */
export async function setOwnedBrandLinkStatus(
  brandId: string,
  linkId: string,
  status: "ACTIVE" | "DISABLED",
): Promise<BrandLinkStatusResult> {
  if (
    !/^[0-9a-f-]{36}$/i.test(linkId) ||
    !["ACTIVE", "DISABLED"].includes(status)
  )
    return { ok: false, error: "not_found" };
  try {
    return await prisma.$transaction(async (tx) => {
      const link = await tx.trackingLink.findFirst({
        where: { id: linkId, product: { brandId } },
      });
      if (!link) return { ok: false, error: "not_found" };
      // Same lock order as product-link creation; prevents a concurrent creation or eligibility change.
      await tx.$queryRaw(
        Prisma.sql`SELECT p.id FROM product p JOIN brand b ON b.id=p.brand_id WHERE p.id=CAST(${link.productId} AS uuid) AND b.id=CAST(${brandId} AS uuid) FOR UPDATE OF p, b`,
      );
      await tx.$queryRaw(
        Prisma.sql`SELECT id FROM creator WHERE id=CAST(${link.creatorId} AS uuid) FOR UPDATE`,
      );
      await tx.$queryRaw(
        Prisma.sql`SELECT id FROM partnership WHERE brand_id=CAST(${brandId} AS uuid) AND creator_id=CAST(${link.creatorId} AS uuid) FOR UPDATE`,
      );
      if (status === "ACTIVE") {
        const product = await tx.product.findFirst({
          where: { id: link.productId, brandId },
          include: { brand: true },
        });
        const creator = await tx.creator.findUnique({
          where: { id: link.creatorId },
        });
        const partnership = await tx.partnership.findUnique({
          where: { brandId_creatorId: { brandId, creatorId: link.creatorId } },
        });
        const error = !product
          ? "not_found"
          : product.brand.status !== "APPROVED"
            ? "brand_not_approved"
            : product.status !== "ACTIVE"
              ? "product_archived"
              : creator?.status !== "APPROVED"
                ? "creator_not_approved"
                : partnership?.status !== "APPROVED"
                  ? "partnership_not_approved"
                  : null;
        if (error) return { ok: false, error };
        const existing = await tx.trackingLink.findFirst({
          where: {
            productId: link.productId,
            creatorId: link.creatorId,
            status: "ACTIVE",
            id: { not: linkId },
          },
        });
        if (existing) return { ok: false, error: "active_link_exists" };
      }
      await tx.trackingLink.update({ where: { id: linkId }, data: { status } });
      return { ok: true };
    });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    )
      return { ok: false, error: "active_link_exists" };
    throw error;
  }
}
