import { afterEach, describe, expect, it, vi } from "vitest";
import {
  createProductReservation,
  verifyProductReservation,
} from "./product-upload-reservation";
vi.mock("@/src/config/env", () => ({
  serverEnv: () => ({
    AUTH_SECRET: "reservation-test-secret-with-more-than-forty-characters",
  }),
}));
afterEach(() => vi.useRealTimers());
describe("product upload reservations", () => {
  it("binds an unpublished upload namespace to its brand", () => {
    const token = createProductReservation("brand-a");
    expect(verifyProductReservation(token, "brand-a")).toMatch(
      /^[a-f0-9-]{36}$/,
    );
    expect(verifyProductReservation(token, "brand-b")).toBeUndefined();
    expect(
      verifyProductReservation(token.replace("brand-a", "brand-b"), "brand-b"),
    ).toBeUndefined();
    expect(
      verifyProductReservation(`${token}:extra`, "brand-a"),
    ).toBeUndefined();
  });
  it("rejects expired and modified reservations", () => {
    vi.useFakeTimers();
    const token = createProductReservation("brand-a");
    expect(
      verifyProductReservation(token.slice(0, -1) + "x", "brand-a"),
    ).toBeUndefined();
    vi.advanceTimersByTime(8 * 86400000);
    expect(verifyProductReservation(token, "brand-a")).toBeUndefined();
  });
});
