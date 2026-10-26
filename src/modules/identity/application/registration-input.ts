import { z } from "zod";
const optionalText = z.string().trim().max(160).default("");
const social = (domains: string[]) =>
  z
    .union([
      z.literal(""),
      z
        .url()
        .max(500)
        .refine((value) => {
          const url = new URL(value);
          return (
            url.protocol === "https:" &&
            domains.some(
              (domain) =>
                url.hostname === domain || url.hostname.endsWith("." + domain),
            )
          );
        }, "invalid_social_url"),
    ])
    .default("");
export const registrationSchema = z
  .object({
    role: z.enum(["brand", "creator"]),
    locale: z.enum(["en", "ka"]),
    name: z.string().trim().min(2).max(120),
    contactName: optionalText,
    phone: z
      .string()
      .trim()
      .max(30)
      .regex(/^[+\d\s()-]*$/),
    country: z.string().trim().min(2).max(80),
    city: z.string().trim().min(1).max(100),
    category: z.string().trim().min(1).max(80),
    language: z.enum(["ka", "en", "both"]),
    alias: optionalText,
    website: z
      .union([
        z.literal(""),
        z
          .url()
          .max(500)
          .refine((v) => new URL(v).protocol === "https:"),
      ])
      .default(""),
    description: z.string().trim().max(500),
    audienceSize: z.enum([
      "",
      "under-1000",
      "1000-10000",
      "10000-50000",
      "50000-100000",
      "100000-plus",
    ]),
    audienceCountry: optionalText,
    instagram: social(["instagram.com"]),
    tiktok: social(["tiktok.com"]),
    youtube: social(["youtube.com", "youtu.be"]),
    facebook: social(["facebook.com"]),
    // Only shape is checked here; the route confirms it names a current lead.
    teamLeadId: z.union([z.literal(""), z.uuid()]).default(""),
  })
  .superRefine((v, ctx) => {
    if (v.role === "brand" && !v.contactName)
      ctx.addIssue({
        code: "custom",
        path: ["contactName"],
        message: "required",
      });
    if (v.role === "brand" && v.teamLeadId)
      ctx.addIssue({
        code: "custom",
        path: ["teamLeadId"],
        message: "creator_only",
      });
  });
