import "dotenv/config";
Object.assign(process.env, { NODE_ENV: process.env.NODE_ENV ?? "development" });
const { prisma } = await import("@/src/infrastructure/db/client");
const [email] = process.argv.slice(2);
if (!email)
  throw new Error("Usage: pnpm exec tsx scripts/grant-admin.ts <email>");
try {
  const user = await prisma.appUser.findUnique({ where: { email } });
  if (!user) throw new Error("Create the authentication account first.");
  if (!user.isAdmin)
    await prisma.$transaction(async (tx) => {
      await tx.appUser.update({
        where: { id: user.id },
        data: { isAdmin: true },
      });
      await tx.auditEvent.create({
        data: {
          action: "identity.admin_granted",
          entityType: "app_user",
          entityId: user.id,
          changes: { source: "operator_script" },
        },
      });
    });
  console.log(`Admin access enabled for ${email}.`);
} finally {
  await prisma.$disconnect();
}
