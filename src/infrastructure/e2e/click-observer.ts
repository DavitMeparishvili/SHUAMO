import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/src/generated/prisma/client";

/** A deliberately fresh connection for the redirect durability browser proof. */
export async function observeClickFromSeparateConnection(
  clickId: string,
): Promise<{ id: string; trackingLinkId: string } | undefined> {
  const connectionString = process.env.DATABASE_URL;
  if (connectionString === undefined) {
    throw new Error("DATABASE_URL is required for the click observer");
  }
  const observer = new PrismaClient({
    adapter: new PrismaPg({ connectionString }),
  });
  try {
    const click = await observer.click.findUnique({
      where: { id: clickId },
      select: { id: true, trackingLinkId: true },
    });
    return click ?? undefined;
  } finally {
    await observer.$disconnect();
  }
}
