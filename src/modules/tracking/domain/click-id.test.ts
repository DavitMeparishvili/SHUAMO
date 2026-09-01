import { describe, expect, it } from "vitest";
import { newClickId, newVisitorId } from "./click-id";

describe("tracking identifiers", () => {
  it("mints a ck_ token with twelve lowercase hex characters", () => {
    expect(
      newClickId({ bytes: () => Uint8Array.from([0, 1, 2, 10, 254, 255]) }),
    ).toBe("ck_0001020afeff");
  });

  it("refuses a short random response", () => {
    expect(() => newClickId({ bytes: () => new Uint8Array(5) })).toThrow(
      RangeError,
    );
  });

  it("mints an RFC 4122 version 4 visitor UUID", () => {
    const id = newVisitorId({
      bytes: (count) => new Uint8Array(count).fill(1),
    });
    expect(id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
    );
  });
});
