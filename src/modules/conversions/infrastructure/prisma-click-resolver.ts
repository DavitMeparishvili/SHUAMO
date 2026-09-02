import { Rate } from "@/src/modules/shared";
import { prisma } from "@/src/infrastructure/db/client";
import type { ClickResolver } from "../ports/click-resolver";

const ATTRIBUTION_WINDOW_MS = 30 * 24 * 60 * 60 * 1000;

export const prismaClickResolver: ClickResolver = {
  async resolve(brandId, clickId, orderOccurredAt) {
    const click = await prisma.click.findUnique({
      where: { id: clickId },
      select: {
        id: true,
        brandId: true,
        occurredAt: true,
        trackingLink: {
          select: {
            creatorId: true,
            productId: true,
            commissionType: true,
            commissionValue: true,
            product: { select: { sku: true } },
          },
        },
      },
    });
    if (click === null || click.brandId !== brandId) return undefined;

    const age = orderOccurredAt.getTime() - click.occurredAt.getTime();
    if (age < 0 || age > ATTRIBUTION_WINDOW_MS) return undefined;

    const link = click.trackingLink;
    return {
      clickId: click.id,
      brandId: click.brandId,
      creatorId: link.creatorId,
      productId: link.productId,
      sku: link.product.sku,
      rate:
        link.commissionType === "PERCENT"
          ? Rate.percent(link.commissionValue.toFixed(4))
          : Rate.fixed(link.commissionValue.toFixed(4)),
    };
  },
};
