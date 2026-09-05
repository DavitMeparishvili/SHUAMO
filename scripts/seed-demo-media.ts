import "dotenv/config";
import { seedDemoMedia } from "./lib/demo-media";

Object.assign(process.env, { NODE_ENV: process.env.NODE_ENV ?? "development" });
const { prisma } = await import("@/src/infrastructure/db/client");
try {
  await seedDemoMedia(prisma);
} finally {
  await prisma.$disconnect();
}
