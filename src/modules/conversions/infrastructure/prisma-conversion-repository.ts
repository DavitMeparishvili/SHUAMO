import { Prisma } from "@/src/generated/prisma/client";
import { prisma } from "@/src/infrastructure/db/client";
import { Money } from "@/src/modules/shared";
import { nextStatus } from "../domain/order-transitions";
import type {
  ConversionRepository,
  ConversionView,
  ExistingConversion,
} from "../ports/conversion-repository";

const UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const conversionInclude = {
  items: {
    include: {
      attribution: {
        include: { creator: { select: { displayName: true } } },
      },
    },
  },
} satisfies Prisma.ConversionInclude;

type ConversionRecord = Prisma.ConversionGetPayload<{
  include: typeof conversionInclude;
}>;

function viewOf(record: ConversionRecord): ConversionView {
  const items = [...record.items]
    .sort((a, b) => a.id.localeCompare(b.id))
    .map((item) => ({
      id: item.id,
      sku: item.sku,
      qty: item.qty,
      unitPrice: item.unitPrice.toFixed(2),
      lineDiscount: item.lineDiscount.toFixed(2),
      lineVat: item.lineVat.toFixed(2),
      commissionableNet: item.commissionableNet.toFixed(2),
      attribution:
        item.attribution === null
          ? undefined
          : {
              clickId: item.attribution.clickId,
              creatorId: item.attribution.creatorId,
              creatorName: item.attribution.creator.displayName,
              productId: item.attribution.productId,
              commissionAmount: item.attribution.commissionAmount.toFixed(2),
            },
    }));
  const commissionAmount = items
    .reduce(
      (sum, item) =>
        item.attribution === undefined
          ? sum
          : sum.plus(Money.of(item.attribution.commissionAmount)),
      Money.ZERO,
    )
    .toStorageString();
  return {
    id: record.id,
    orderId: record.orderId,
    occurredAt: record.occurredAt.toISOString(),
    status: record.status,
    confirmedAt: record.confirmedAt?.toISOString(),
    commissionAmount,
    items,
  };
}

function existingOf(record: ConversionRecord): ExistingConversion {
  return {
    requestFingerprint: record.requestFingerprint,
    view: viewOf(record),
  };
}

export function createPrismaConversionRepository(
  database: typeof prisma,
): ConversionRepository {
  return {
    async findByOrder(brandId, orderId) {
      const record = await database.conversion.findUnique({
        where: { brandId_orderId: { brandId, orderId } },
        include: conversionInclude,
      });
      return record === null ? undefined : existingOf(record);
    },

    async create(input) {
      return database.$transaction(async (transaction) => {
        await transaction.$executeRaw(
          Prisma.sql`SELECT pg_advisory_xact_lock(hashtextextended(${`${input.brandId}:${input.payload.orderId}`}, 0))`,
        );
        const existing = await transaction.conversion.findUnique({
          where: {
            brandId_orderId: {
              brandId: input.brandId,
              orderId: input.payload.orderId,
            },
          },
          include: conversionInclude,
        });
        if (existing !== null) {
          return { kind: "existing", existing: existingOf(existing) } as const;
        }

        const created = await transaction.conversion.create({
          data: {
            brandId: input.brandId,
            orderId: input.payload.orderId,
            requestFingerprint: input.requestFingerprint,
            occurredAt: input.payload.occurredAt,
            status: input.status,
            items: {
              create: input.lines.map((line) => ({
                sku: line.input.sku,
                qty: line.input.qty,
                unitPrice: line.input.unitPrice.toStorageString(),
                lineDiscount: line.input.lineDiscount.toStorageString(),
                lineVat: line.lineVat.toStorageString(),
                commissionableNet: line.commissionableNet.toStorageString(),
                ...(line.attribution === undefined
                  ? {}
                  : {
                      attribution: {
                        create: {
                          clickId: line.attribution.clickId,
                          creatorId: line.attribution.creatorId,
                          productId: line.attribution.productId,
                          commissionAmount:
                            line.attribution.commissionAmount.toStorageString(),
                        },
                      },
                    }),
              })),
            },
          },
          select: { id: true },
        });

        const earningClickIds = [
          ...new Set(
            input.lines.flatMap((line) =>
              line.attribution === undefined ? [] : [line.attribution.clickId],
            ),
          ),
        ];
        if (earningClickIds.length > 0) {
          await transaction.click.updateMany({
            where: { id: { in: earningClickIds }, convertedAt: null },
            data: { convertedAt: input.payload.occurredAt },
          });
        }

        const record = await transaction.conversion.findUniqueOrThrow({
          where: { id: created.id },
          include: conversionInclude,
        });
        return { kind: "created", view: viewOf(record) } as const;
      });
    },

    async decide(input) {
      if (!UUID.test(input.conversionId)) {
        return { ok: false, error: "not_found" };
      }
      return database.$transaction(async (transaction) => {
        const [record] = await transaction.$queryRaw<
          { status: "PENDING" | "CONFIRMED" | "CANCELLED" | "UNATTRIBUTED" }[]
        >(Prisma.sql`
          SELECT status::text AS status
          FROM conversion
          WHERE id = CAST(${input.conversionId} AS uuid)
            AND brand_id = CAST(${input.brandId} AS uuid)
          FOR UPDATE
        `);
        if (record === undefined) {
          return { ok: false, error: "not_found" } as const;
        }
        const transition = nextStatus(record.status, input.action);
        if (!transition.ok) {
          return { ok: false, error: transition.error } as const;
        }

        await transaction.conversion.update({
          where: { id: input.conversionId },
          data: {
            status: transition.value,
            confirmedAt: transition.value === "CONFIRMED" ? input.now : null,
          },
        });
        await transaction.auditEvent.create({
          data: {
            actorId: input.actorId,
            action:
              transition.value === "CONFIRMED"
                ? "conversion.confirmed"
                : "conversion.cancelled",
            entityType: "conversion",
            entityId: input.conversionId,
            changes: { from: record.status, to: transition.value },
            at: input.now,
          },
        });
        return { ok: true, value: { status: transition.value } } as const;
      });
    },
  };
}

export const prismaConversionRepository =
  createPrismaConversionRepository(prisma);

export async function listOrdersForBrand(
  brandId: string,
): Promise<ConversionView[]> {
  const records = await prisma.conversion.findMany({
    where: { brandId },
    include: conversionInclude,
    orderBy: [{ occurredAt: "desc" }, { id: "desc" }],
  });
  return records.map(viewOf);
}

export async function pendingOrderSummary(brandId: string, now: Date) {
  const [count, oldest] = await Promise.all([
    prisma.conversion.count({ where: { brandId, status: "PENDING" } }),
    prisma.conversion.findFirst({
      where: { brandId, status: "PENDING" },
      orderBy: { occurredAt: "asc" },
      select: { occurredAt: true },
    }),
  ]);
  return {
    count,
    oldestDays:
      oldest === null
        ? 0
        : Math.max(
            0,
            Math.floor(
              (now.getTime() - oldest.occurredAt.getTime()) /
                (24 * 60 * 60 * 1000),
            ),
          ),
  };
}

export async function listEarningsForCreator(creatorId: string) {
  const rows = await prisma.attribution.findMany({
    where: { creatorId },
    select: {
      id: true,
      commissionAmount: true,
      conversionItem: {
        select: {
          sku: true,
          conversion: {
            select: {
              orderId: true,
              occurredAt: true,
              status: true,
              brand: { select: { name: true } },
            },
          },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });
  return rows.map((row) => ({
    id: row.id,
    orderId: row.conversionItem.conversion.orderId,
    brandName: row.conversionItem.conversion.brand.name,
    sku: row.conversionItem.sku,
    occurredAt: row.conversionItem.conversion.occurredAt.toISOString(),
    status: row.conversionItem.conversion.status,
    commissionAmount: row.commissionAmount.toFixed(2),
  }));
}
