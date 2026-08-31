import { describe, expect, it } from "vitest";
import { requireTestDatabaseUrl } from "./test-database-url";

describe("requireTestDatabaseUrl", () => {
  it("accepts a database whose name ends _test", () => {
    expect(
      requireTestDatabaseUrl({
        DATABASE_URL_TEST: "postgresql://u:p@localhost:5433/shuamo_test",
      }),
    ).toBe("postgresql://u:p@localhost:5433/shuamo_test");
  });

  it("refuses the development database", () => {
    expect(() =>
      requireTestDatabaseUrl({
        DATABASE_URL_TEST: "postgresql://u:p@localhost:5432/shuamo_dev",
      }),
    ).toThrowError(/_test/);
  });

  it("refuses a name that merely contains test", () => {
    expect(() =>
      requireTestDatabaseUrl({
        DATABASE_URL_TEST: "postgresql://u:p@localhost:5432/test_shuamo",
      }),
    ).toThrowError(/_test/);
  });

  it("refuses an absent value", () => {
    expect(() => requireTestDatabaseUrl({})).toThrowError(/DATABASE_URL_TEST/);
  });
});
