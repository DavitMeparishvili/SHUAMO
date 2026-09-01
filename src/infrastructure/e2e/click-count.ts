import { prisma } from "../db/client";

export async function countClicks(): Promise<number> {
  return prisma.click.count();
}
