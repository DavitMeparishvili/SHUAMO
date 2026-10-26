import { beforeEach, describe, expect, it, vi } from "vitest";
import { prisma } from "@/src/infrastructure/db/client";
import { seedCreator } from "@/src/test/fixtures/accounts";
const state = vi.hoisted(() => ({ userId: "", email: "", session: true }));
vi.mock("next/headers", () => ({ headers: async () => new Headers() }));
vi.mock("../infrastructure/auth", () => ({
  auth: {
    api: {
      getSession: async () =>
        state.session
          ? { user: { id: state.userId, email: state.email } }
          : null,
    },
  },
  currentViewer: async () => ({ kind: "anonymous" }),
}));
const { POST } = await import("@/app/api/registration/route");
const input = {
  role: "creator",
  locale: "ka",
  name: "Private Name",
  alias: "Public Alias",
  contactName: "Contact",
  phone: "+995 555 12 34 56",
  country: "Georgia",
  city: "Tbilisi",
  category: "beauty",
  language: "both",
  description: "A creator",
  audienceSize: "1000-10000",
  instagram: "https://instagram.com/xurjin_demo",
};
function request(
  payload: unknown,
  origin = process.env.APP_URL ?? "http://localhost:3000",
) {
  return new Request(origin + "/api/registration", {
    method: "POST",
    headers: { origin, "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}
beforeEach(async () => {
  state.session = true;
  state.email = crypto.randomUUID() + "@example.test";
  const user = await prisma.user.create({
    data: { email: state.email, name: "Registration test" },
  });
  state.userId = user.id;
});
describe("registration persistence", () => {
  it("activates demo creators immediately while keeping their profile a draft", async () => {
    const response = await POST(request(input));
    expect(response.status).toBe(201);
    expect(await response.json()).toEqual({ status: "approved" });
    const creator = await prisma.creator.findUniqueOrThrow({
      where: { userId: state.userId },
      include: { profile: true, user: true },
    });
    expect(creator.status).toBe("APPROVED");
    expect(creator.displayName).toBe("Public Alias");
    expect(creator.profile?.status).toBe("DRAFT");
    expect(creator.profile?.languages).toEqual(["ka", "en"]);
    expect(creator.user.isAdmin).toBe(false);
    expect(creator.user.onboarding).toMatchObject({
      phone: input.phone,
      alias: "Public Alias",
    });
  });
  it("activates demo brands immediately while keeping their profile a draft", async () => {
    const response = await POST(request({ ...input, role: "brand" }));
    expect(response.status).toBe(201);
    expect(await response.json()).toEqual({ status: "approved" });
    const brand = await prisma.brand.findUniqueOrThrow({
      where: { userId: state.userId },
      include: { profile: true },
    });
    expect(brand.status).toBe("APPROVED");
    expect(brand.profile?.status).toBe("DRAFT");
  });
  it("serializes conflicting submissions to prevent two roles", async () => {
    const results = await Promise.all([
      POST(request(input)),
      POST(request({ ...input, role: "brand" })),
    ]);
    expect(results.map((r) => r.status).sort()).toEqual([201, 409]);
    const [brands, creators] = await Promise.all([
      prisma.brand.count({ where: { userId: state.userId } }),
      prisma.creator.count({ where: { userId: state.userId } }),
    ]);
    expect(brands + creators).toBe(1);
  });
  it("rejects foreign origins and unauthenticated writes", async () => {
    expect((await POST(request(input, "https://evil.example"))).status).toBe(
      403,
    );
    state.session = false;
    expect((await POST(request(input))).status).toBe(401);
  });
  it("does not overwrite an existing application", async () => {
    await POST(request(input));
    expect(
      (await POST(request({ ...input, alias: "Replacement" }))).status,
    ).toBe(409);
    expect(
      (
        await prisma.creator.findUniqueOrThrow({
          where: { userId: state.userId },
        })
      ).displayName,
    ).toBe("Public Alias");
  });
  it("stores a chosen team lead on the new creator", async () => {
    const lead = await seedCreator({ isTeamLead: true });
    const response = await POST(request({ ...input, teamLeadId: lead.id }));
    expect(response.status).toBe(201);
    const creator = await prisma.creator.findUniqueOrThrow({
      where: { userId: state.userId },
    });
    expect(creator.teamLeadId).toBe(lead.id);
    expect(creator.status).toBe("APPROVED");
  });
  it("leaves the team lead empty when none is chosen", async () => {
    expect((await POST(request(input))).status).toBe(201);
    expect(
      (
        await prisma.creator.findUniqueOrThrow({
          where: { userId: state.userId },
        })
      ).teamLeadId,
    ).toBeNull();
  });
  it.each(["not_a_lead", "suspended", "access_disabled"] as const)(
    "rejects a team lead that is %s and creates nothing",
    async (variant) => {
      const lead = await seedCreator({
        isTeamLead: variant !== "not_a_lead",
        status: variant === "suspended" ? "SUSPENDED" : "APPROVED",
      });
      if (variant === "access_disabled")
        await prisma.appUser.update({
          where: { id: lead.userId },
          data: { accessDisabled: true },
        });
      const response = await POST(request({ ...input, teamLeadId: lead.id }));
      expect(response.status).toBe(400);
      expect(await response.json()).toEqual({
        error: "invalid_input",
        fields: { teamLeadId: ["invalid_team_lead"] },
      });
      expect(
        await prisma.creator.count({ where: { userId: state.userId } }),
      ).toBe(0);
    },
  );
  it("rejects a team lead sent with a brand role", async () => {
    const lead = await seedCreator({ isTeamLead: true });
    const response = await POST(
      request({ ...input, role: "brand", teamLeadId: lead.id }),
    );
    expect(response.status).toBe(400);
    expect(await prisma.brand.count({ where: { userId: state.userId } })).toBe(
      0,
    );
  });
});
