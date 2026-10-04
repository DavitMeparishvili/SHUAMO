import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({ role: "brand", published: false }));
vi.mock("next/navigation", () => ({
  redirect: (url: string) => {
    throw new Error("redirect:" + url);
  },
  notFound: () => {
    throw new Error("not-found");
  },
}));
vi.mock("@/src/modules/identity", async (importOriginal) => {
  const original =
    await importOriginal<typeof import("@/src/modules/identity")>();
  return {
    currentViewer: async () => ({ kind: state.role }),
    auth: {},
    safeProfileReturnTo: original.safeProfileReturnTo,
  };
});
vi.mock("@/src/infrastructure/profile-onboarding", () => ({
  profileIsPublished: async () => state.published,
}));
import WorkspaceRouter from "./page";

describe("profile setup entry guard", () => {
  beforeEach(() => {
    state.role = "brand";
    state.published = false;
  });
  it.each(["brand", "creator"])(
    "sends a private %s to the editor before a return link",
    async (role) => {
      state.role = role;
      await expect(
        WorkspaceRouter({
          params: Promise.resolve({ locale: "ka" }),
          searchParams: Promise.resolve({ returnTo: "/ka/brands/example" }),
        }),
      ).rejects.toThrow(`redirect:/ka/${role}/profile`);
    },
  );
  it.each(["brand", "creator"])(
    "sends a published %s to its workspace",
    async (role) => {
      state.role = role;
      state.published = true;
      await expect(
        WorkspaceRouter({
          params: Promise.resolve({ locale: "en" }),
          searchParams: Promise.resolve({}),
        }),
      ).rejects.toThrow(`redirect:/en/${role}`);
    },
  );
  it("preserves a safe return link after publication", async () => {
    state.published = true;
    await expect(
      WorkspaceRouter({
        params: Promise.resolve({ locale: "en" }),
        searchParams: Promise.resolve({ returnTo: "/en/brands/example" }),
      }),
    ).rejects.toThrow("redirect:/en/brands/example");
  });
  it("does not accept an external return link", async () => {
    state.published = true;
    await expect(
      WorkspaceRouter({
        params: Promise.resolve({ locale: "en" }),
        searchParams: Promise.resolve({ returnTo: "https://example.test" }),
      }),
    ).rejects.toThrow("redirect:/en/brand");
  });
  it("keeps administrators out of profile onboarding", async () => {
    state.role = "admin";
    await expect(
      WorkspaceRouter({
        params: Promise.resolve({ locale: "en" }),
        searchParams: Promise.resolve({}),
      }),
    ).rejects.toThrow("redirect:/en/admin/finance");
  });
});
