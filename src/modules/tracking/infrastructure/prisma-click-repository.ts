import { prisma } from "@/src/infrastructure/db/client";
import type { ClickRepository } from "../ports/click-repository";

export const prismaClickRepository: ClickRepository = {
  async findPriorByVisitor(trackingLinkId, visitorId, since) {
    const prior = await prisma.click.findFirst({
      where: { trackingLinkId, visitorId, occurredAt: { gt: since } },
      orderBy: { occurredAt: "desc" },
      select: { occurredAt: true },
    });
    return prior?.occurredAt;
  },

  async findPriorByFingerprint(trackingLinkId, fpHash, since) {
    const prior = await prisma.click.findFirst({
      where: { trackingLinkId, fpHash, occurredAt: { gt: since } },
      orderBy: { occurredAt: "desc" },
      select: { occurredAt: true },
    });
    return prior?.occurredAt;
  },

  async insert(click) {
    await prisma.click.create({
      data: {
        ...click,
        visitorId: click.visitorId ?? null,
      },
    });
  },

  async insertDeduplicated(click, signal) {
    const visitorId = click.visitorId ?? null;
    await prisma.$queryRaw`
      SELECT insert_deduplicated_click(
        ${click.id},
        CAST(${click.trackingLinkId} AS uuid),
        CAST(${click.brandId} AS uuid),
        CAST(${visitorId} AS uuid),
        ${click.fpHash},
        ${click.occurredAt},
        ${signal.kind},
        ${signal.value},
        ${signal.since}
      )
    `;
  },
};
