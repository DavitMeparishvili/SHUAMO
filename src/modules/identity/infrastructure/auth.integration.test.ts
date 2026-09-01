import { describe, expect, it } from "vitest";
import { prisma } from "@/src/infrastructure/db/client";
import { auth } from "./auth";

describe("Better Auth account link", () => {
  it("atomically creates a UUID-linked app_user with the requested locale", async () => {
    const signedUp = await auth.api.signUpEmail({
      body: {
        email: "new@example.ge",
        password: "correct horse battery staple",
        name: "Nino",
        locale: "en",
      },
    });
    expect(signedUp.user.id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    );
    const appUser = await prisma.appUser.findUnique({
      where: { id: signedUp.user.id },
    });
    expect(appUser).toMatchObject({
      id: signedUp.user.id,
      email: "new@example.ge",
      locale: "en",
    });
    const authUser = await prisma.user.findUnique({
      where: { id: signedUp.user.id },
    });
    expect(authUser?.signupLocale).toBeNull();
  });

  it("rolls back every auth row when product identity creation fails", async () => {
    const owner = await prisma.user.create({
      data: {
        email: "owner@example.ge",
        name: "Existing owner",
        emailVerified: true,
      },
    });
    await prisma.appUser.update({
      where: { id: owner.id },
      data: { email: "collision@example.ge" },
    });
    const productAccountCount = await prisma.appUser.count();

    await expect(
      auth.api.signUpEmail({
        body: {
          email: "collision@example.ge",
          password: "correct horse battery staple",
          name: "Collision",
          locale: "ka",
        },
      }),
    ).rejects.toThrow();

    expect(
      await prisma.user.count({ where: { email: "collision@example.ge" } }),
    ).toBe(0);
    expect(
      await prisma.account.count({
        where: { user: { email: "collision@example.ge" } },
      }),
    ).toBe(0);
    expect(
      await prisma.session.count({
        where: { user: { email: "collision@example.ge" } },
      }),
    ).toBe(0);
    expect(await prisma.appUser.count()).toBe(productAccountCount);
  });
});
