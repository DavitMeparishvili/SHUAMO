import { describe, expect, it } from "vitest";
import { registrationSchema } from "./registration-input";
const input = {
  role: "creator",
  locale: "ka",
  name: "ნინო",
  phone: "+995 555 12 34 56",
  country: "საქართველო",
  city: "თბილისი",
  category: "beauty",
  language: "both",
  description: "",
  audienceSize: "",
};
describe("registration input", () => {
  it("accepts Georgian names without optional socials", () =>
    expect(registrationSchema.safeParse(input).success).toBe(true));
  it("requires a brand contact person", () =>
    expect(
      registrationSchema.safeParse({ ...input, role: "brand" }).success,
    ).toBe(false));
  it("rejects impersonating social domains and unsafe protocols", () => {
    for (const instagram of [
      "https://instagram.com.evil.test/a",
      "javascript:alert(1)",
      "http://instagram.com/a",
    ])
      expect(
        registrationSchema.safeParse({ ...input, instagram }).success,
      ).toBe(false);
  });
  it("accepts an empty or UUID team lead for a creator", () => {
    expect(registrationSchema.parse(input).teamLeadId).toBe("");
    for (const teamLeadId of ["", "00000000-0000-4000-8000-000000000001"])
      expect(
        registrationSchema.safeParse({ ...input, teamLeadId }).success,
      ).toBe(true);
  });
  it("rejects a malformed team lead or one sent with a brand role", () => {
    expect(
      registrationSchema.safeParse({ ...input, teamLeadId: "lead-1" }).success,
    ).toBe(false);
    const brand = registrationSchema.safeParse({
      ...input,
      role: "brand",
      contactName: "Contact",
      teamLeadId: "00000000-0000-4000-8000-000000000001",
    });
    expect(brand.success).toBe(false);
    expect(brand.error?.issues.map((issue) => issue.path)).toEqual([
      ["teamLeadId"],
    ]);
  });
  it("does not accept a privileged role or copy approval into parsed data", () => {
    expect(
      registrationSchema.safeParse({ ...input, role: "admin" }).success,
    ).toBe(false);
    expect(
      registrationSchema.parse({ ...input, status: "APPROVED", isAdmin: true }),
    ).not.toHaveProperty("isAdmin");
  });
});
