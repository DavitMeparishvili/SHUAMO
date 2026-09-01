import "dotenv/config";

Object.assign(process.env, { NODE_ENV: process.env.NODE_ENV ?? "development" });
const { prisma } = await import("@/src/infrastructure/db/client");

const [email, status] = process.argv.slice(2);
if (
  email === undefined ||
  !["PENDING", "APPROVED", "SUSPENDED"].includes(status ?? "")
) {
  throw new Error("Usage: pnpm approve <email> <PENDING|APPROVED|SUSPENDED>");
}

const user = await prisma.appUser.findUnique({
  where: { email },
  include: { brand: true, creator: true },
});
if (user === null) throw new Error(`No account found for ${email}`);
if (user.brand !== null)
  await prisma.brand.update({
    where: { id: user.brand.id },
    data: { status: status as "PENDING" | "APPROVED" | "SUSPENDED" },
  });
else if (user.creator !== null)
  await prisma.creator.update({
    where: { id: user.creator.id },
    data: { status: status as "PENDING" | "APPROVED" | "SUSPENDED" },
  });
else throw new Error(`Account ${email} has no brand or creator role`);

console.log(
  JSON.stringify({
    event: "account_approval_changed",
    email,
    status,
    occurredAt: new Date().toISOString(),
  }),
);
await prisma.$disconnect();
