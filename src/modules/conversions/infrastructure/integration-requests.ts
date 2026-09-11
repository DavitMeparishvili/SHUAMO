import { prisma } from "@/src/infrastructure/db/client";
import type {
  IntegrationRequest,
  IntegrationRequestView,
} from "../ports/integration-request";

export async function recordIntegrationRequest(request: IntegrationRequest) {
  // Keep only metadata, never keys, order IDs, payloads or customer information.
  // Serialize per brand so concurrent requests also respect the 100-row cap.
  await prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${`integration:${request.brandId}`}, 0))`;
    await tx.integrationRequest.create({ data: request });
    const expired = await tx.integrationRequest.findMany({
      where: { brandId: request.brandId },
      orderBy: [{ at: "desc" }, { id: "desc" }],
      skip: 100,
      select: { id: true },
    });
    if (expired.length)
      await tx.integrationRequest.deleteMany({
        where: { id: { in: expired.map((row) => row.id) } },
      });
  });
}

export async function recentIntegrationRequests(
  brandId: string,
): Promise<IntegrationRequestView[]> {
  const rows = await prisma.integrationRequest.findMany({
    where: { brandId },
    orderBy: [{ at: "desc" }, { id: "desc" }],
    take: 20,
  });
  return rows.map((row) => ({
    ...row,
    mode: row.mode === "live" ? "live" : "validation",
    at: row.at.toISOString(),
  }));
}

export async function isClickAttributed(clickId: string) {
  return (
    (await prisma.attribution.findUnique({
      where: { clickId },
      select: { id: true },
    })) !== null
  );
}
