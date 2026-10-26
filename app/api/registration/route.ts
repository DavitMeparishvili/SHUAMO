import { headers } from "next/headers";
import {
  auth,
  mintApiKey,
  webCryptoRandom,
  registrationSchema,
} from "@/src/modules/identity";
import { prisma } from "@/src/infrastructure/db/client";
import { serverEnv } from "@/src/config/env";
export async function POST(request: Request) {
  if (request.headers.get("origin") !== new URL(serverEnv().APP_URL).origin)
    return Response.json({ error: "origin" }, { status: 403 });
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session)
    return Response.json({ error: "unauthorized" }, { status: 401 });
  const raw = await request.text();
  if (raw.length > 15000)
    return Response.json({ error: "too_large" }, { status: 413 });
  let json: unknown;
  try {
    json = JSON.parse(raw);
  } catch {
    return Response.json({ error: "invalid_input" }, { status: 400 });
  }
  const parsed = registrationSchema.safeParse(json);
  if (!parsed.success)
    return Response.json(
      { error: "invalid_input", fields: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  const data = parsed.data;
  const location = [data.city, data.country].join(", ");
  const socialLinks = (
    ["instagram", "tiktok", "youtube", "facebook", "website"] as const
  )
    .filter((k) => data[k])
    .map((platform) => ({ platform, url: data[platform] }));
  try {
    await prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT "id" FROM "user" WHERE "id" = ${session.user.id}::uuid FOR UPDATE`;
      const existing = await tx.appUser.findUnique({
        where: { id: session.user.id },
        include: { brand: true, creator: true },
      });
      if (existing?.brand || existing?.creator || existing?.isAdmin)
        throw new Error("already_registered");
      await tx.appUser.upsert({
        where: { id: session.user.id },
        create: {
          id: session.user.id,
          email: session.user.email,
          locale: data.locale,
          onboarding: data,
        },
        update: { locale: data.locale, onboarding: data },
      });
      const profile = {
        descriptionKa: data.locale === "ka" ? data.description : "",
        descriptionEn: data.locale === "en" ? data.description : "",
        locationKa: location,
        locationEn: location,
        categories: [data.category],
        socialLinks,
      };
      // TODO: Revert demo auto-activation to PENDING for both roles and return
      // "pending" below when administrator approval is restored after the demo.
      if (data.role === "brand") {
        const key = mintApiKey(webCryptoRandom);
        await tx.brand.create({
          data: {
            userId: session.user.id,
            name: data.name,
            keyPrefix: key.prefix,
            keyHash: key.hash,
            status: "APPROVED",
            profile: { create: profile },
          },
        });
      } else {
        // The lead must still be one a creator could have picked: flagged,
        // approved and not access-disabled. The share lock waits out an admin
        // changing that lead's team settings at the same moment.
        if (data.teamLeadId)
          await tx.$queryRaw`SELECT id FROM creator WHERE id=${data.teamLeadId}::uuid FOR SHARE`;
        if (
          data.teamLeadId &&
          !(await tx.creator.findFirst({
            where: {
              id: data.teamLeadId,
              isTeamLead: true,
              status: "APPROVED",
              user: { accessDisabled: false },
            },
            select: { id: true },
          }))
        )
          throw new Error("invalid_team_lead");
        await tx.creator.create({
          data: {
            userId: session.user.id,
            displayName: data.alias || data.name,
            bio: data.description,
            status: "APPROVED",
            teamLeadId: data.teamLeadId || null,
            profile: {
              create: {
                ...profile,
                languages:
                  data.language === "both" ? ["ka", "en"] : [data.language],
              },
            },
          },
        });
      }
    });
  } catch (error) {
    if (error instanceof Error && error.message === "invalid_team_lead")
      return Response.json(
        {
          error: "invalid_input",
          fields: { teamLeadId: ["invalid_team_lead"] },
        },
        { status: 400 },
      );
    if (
      (error instanceof Error && error.message === "already_registered") ||
      (error &&
        typeof error === "object" &&
        "code" in error &&
        error.code === "P2002")
    )
      return Response.json({ error: "already_registered" }, { status: 409 });
    throw error;
  }
  return Response.json({ status: "approved" }, { status: 201 });
}
