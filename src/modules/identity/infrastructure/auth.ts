import { betterAuth } from "better-auth";
import { prismaAdapter } from "@better-auth/prisma-adapter";
import { headers } from "next/headers";
import { z } from "zod";
import { prisma } from "@/src/infrastructure/db/client";
import { serverEnv } from "@/src/config/env";
import { resolveViewer } from "../application/resolve-viewer";
import { prismaAccountRepository } from "./prisma-account-repository";

const env = serverEnv();

export const auth = betterAuth({
  database: prismaAdapter(prisma, {
    provider: "postgresql",
    transaction: true,
  }),
  secret: env.AUTH_SECRET,
  baseURL: env.APP_URL,
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: false,
  },
  user: {
    additionalFields: {
      locale: {
        type: "string",
        required: false,
        defaultValue: "ka",
        returned: false,
        fieldName: "signupLocale",
        validator: { input: z.enum(["ka", "en"]) },
      },
    },
  },
  session: {
    expiresIn: 60 * 60 * 24 * 30,
    cookieCache: { enabled: true, maxAge: 60 * 5 },
  },
  // Browser verification signs several seeded users in from one worker IP.
  // Production retains Better Auth's stricter built-in limits.
  rateLimit: { enabled: process.env.E2E_TEST !== "1" },
  advanced: {
    useSecureCookies: env.NODE_ENV === "production",
    defaultCookieAttributes: { sameSite: "lax", httpOnly: true },
    database: { generateId: "uuid" },
  },
});

export async function currentViewer() {
  const session = await auth.api.getSession({ headers: await headers() });
  return resolveViewer({ accounts: prismaAccountRepository })(session?.user.id);
}
