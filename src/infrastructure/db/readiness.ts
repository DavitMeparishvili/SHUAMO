import { prisma } from "./client";

export type Readiness = { ok: true } | { ok: false; reason: string };

export async function checkDatabaseReadiness(): Promise<Readiness> {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      // The message is deliberately not echoed: a connection string with
      // credentials in it must never reach an unauthenticated endpoint.
      reason: error instanceof Error ? "database_unavailable" : "unknown",
    };
  }
}
