import { describe, expect, it } from "vitest";
import { parseServerEnv } from "./env";

const valid = {
  DATABASE_URL: "postgresql://shuamo:pw@localhost:5432/shuamo_dev",
  DATABASE_URL_TEST: "postgresql://shuamo:pw@localhost:5433/shuamo_test",
  APP_URL: "https://xu.ge",
  AUTH_SECRET: "0123456789012345678901234567890123456789",
  FINGERPRINT_SECRET: "9876543210987654321098765432109876543210",
  NODE_ENV: "test",
};

describe("parseServerEnv", () => {
  it("accepts a complete environment", () => {
    expect(parseServerEnv(valid).APP_URL).toBe("https://xu.ge");
  });

  it("reports every missing key in one error, not just the first", () => {
    const call = () =>
      parseServerEnv({ NODE_ENV: "test" } as Record<string, string>);

    expect(call).toThrowError(/DATABASE_URL/);
    expect(call).toThrowError(/AUTH_SECRET/);
    expect(call).toThrowError(/FINGERPRINT_SECRET/);
  });

  it("rejects a short secret rather than padding it", () => {
    expect(() =>
      parseServerEnv({ ...valid, AUTH_SECRET: "tooshort" }),
    ).toThrowError(/AUTH_SECRET/);
  });

  it("rejects a non-postgres database url", () => {
    expect(() =>
      parseServerEnv({ ...valid, DATABASE_URL: "mysql://x/y" }),
    ).toThrowError(/DATABASE_URL/);
  });

  // .env.example ships a 45-character placeholder, which satisfies min(40).
  // Without this check `cp .env.example .env` boots a working application on a
  // secret that is published in the repository, which is the outcome the "no
  // secret defaults" rule exists to prevent.
  const published = [
    "replace-with-40-plus-characters-of-random-hex",
    "ci-only-auth-secret-000000000000000000000000",
    "ci-only-fingerprint-secret-00000000000000",
  ];

  it("refuses a published placeholder secret outside the test environment", () => {
    for (const placeholder of published) {
      expect(
        () =>
          parseServerEnv({
            ...valid,
            NODE_ENV: "production",
            AUTH_SECRET: placeholder,
          }),
        placeholder,
      ).toThrowError(/AUTH_SECRET/);

      expect(
        () =>
          parseServerEnv({
            ...valid,
            NODE_ENV: "development",
            FINGERPRINT_SECRET: placeholder,
          }),
        placeholder,
      ).toThrowError(/FINGERPRINT_SECRET/);
    }
  });

  it("allows a placeholder under NODE_ENV=test, where nothing is protected", () => {
    expect(
      parseServerEnv({
        ...valid,
        NODE_ENV: "test",
        AUTH_SECRET: published[0] as string,
      }).NODE_ENV,
    ).toBe("test");
  });

  it("supplies no default for any secret", () => {
    for (const key of ["AUTH_SECRET", "FINGERPRINT_SECRET", "DATABASE_URL"]) {
      const incomplete = { ...valid };
      delete (incomplete as Record<string, unknown>)[key];
      expect(() => parseServerEnv(incomplete)).toThrowError(new RegExp(key));
    }
  });
});
