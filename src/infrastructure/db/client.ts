import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/src/generated/prisma/client";
import { serverEnv } from "@/src/config/env";

// One client per process. Next's dev server re-evaluates modules on every
// change, which without this global would open a new pool each time.
const globalForPrisma = globalThis as unknown as {
  shuamoPrisma?: PrismaClient;
};

function createClient(): PrismaClient {
  const env = serverEnv();
  const connectionString =
    env.NODE_ENV === "test" ? env.DATABASE_URL_TEST : env.DATABASE_URL;

  return new PrismaClient({ adapter: new PrismaPg({ connectionString }) });
}

export const prisma: PrismaClient =
  globalForPrisma.shuamoPrisma ?? createClient();

if (serverEnv().NODE_ENV !== "production") {
  globalForPrisma.shuamoPrisma = prisma;
}
