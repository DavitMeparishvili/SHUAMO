import { prisma } from "@/src/infrastructure/db/client";
import type { LinkLookup, LinkSnapshot } from "../ports/link-lookup";

interface LinkSnapshotRow {
  linkId: string;
  brandId: string;
  backlinkUrl: string;
  brandStatus: "PENDING" | "APPROVED" | "SUSPENDED";
  partnershipStatus: "PENDING" | "APPROVED" | "REJECTED" | null;
  productStatus: "ACTIVE" | "ARCHIVED";
  linkStatus: "ACTIVE" | "DISABLED";
}

function toSnapshot(row: LinkSnapshotRow): LinkSnapshot {
  return {
    linkId: row.linkId,
    brandId: row.brandId,
    backlinkUrl: row.backlinkUrl,
    state: {
      brandStatus: row.brandStatus,
      partnershipStatus: row.partnershipStatus ?? undefined,
      productStatus: row.productStatus,
      linkStatus: row.linkStatus,
    },
  };
}

export const prismaLinkLookup: LinkLookup = {
  async byCode(code) {
    const rows = await prisma.$queryRaw<LinkSnapshotRow[]>`
      SELECT l.id            AS "linkId",
             p.brand_id      AS "brandId",
             p.backlink_url  AS "backlinkUrl",
             b.status        AS "brandStatus",
             pt.status       AS "partnershipStatus",
             p.status        AS "productStatus",
             l.status        AS "linkStatus"
      FROM tracking_link l
      JOIN product p ON p.id = l.product_id
      JOIN brand b ON b.id = p.brand_id
      LEFT JOIN partnership pt
        ON pt.brand_id = p.brand_id AND pt.creator_id = l.creator_id
      WHERE l.code = ${code}
      LIMIT 1
    `;
    return rows[0] === undefined ? undefined : toSnapshot(rows[0]);
  },
};
