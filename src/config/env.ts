import { z } from "zod";

const postgresUrl = z
  .string()
  .refine(
    (value) =>
      value.startsWith("postgresql://") || value.startsWith("postgres://"),
    { message: "must be a postgresql:// connection string" },
  );

// Secrets that exist in this repository's own files: the .env.example template
// and the CI workflow. Each is long enough to satisfy min(40), so without an
// explicit refusal `cp .env.example .env` produces a working application signed
// with a published key.
const PUBLISHED_PLACEHOLDER_SECRETS = new Set([
  "replace-with-40-plus-characters-of-random-hex",
  "ci-only-auth-secret-000000000000000000000000",
  "ci-only-fingerprint-secret-00000000000000",
]);

const SECRET_KEYS = ["AUTH_SECRET", "FINGERPRINT_SECRET"] as const;

const serverEnvSchema = z.object({
  DATABASE_URL: postgresUrl,
  DATABASE_URL_TEST: postgresUrl,
  APP_URL: z.url(),
  // 40 characters is not arbitrary: it is the shortest length at which a
  // hex-encoded secret carries 160 bits, and a shorter value here would
  // silently weaken the fingerprint salt in §6.1.
  AUTH_SECRET: z.string().min(40),
  FINGERPRINT_SECRET: z.string().min(40),
  NODE_ENV: z.enum(["development", "test", "production"]),
});

const serverEnv$ = serverEnvSchema.superRefine((env, ctx) => {
  // Under NODE_ENV=test nothing real is being protected, and fixtures should
  // not have to invent entropy to run.
  if (env.NODE_ENV === "test") return;

  for (const key of SECRET_KEYS) {
    if (PUBLISHED_PLACEHOLDER_SECRETS.has(env[key])) {
      ctx.addIssue({
        code: "custom",
        path: [key],
        message:
          "is a placeholder published in this repository; generate a real secret",
      });
    }
  }
});

export type ServerEnv = z.infer<typeof serverEnvSchema>;

export class EnvironmentError extends Error {
  constructor(issues: readonly string[]) {
    super(`Invalid server environment:\n  ${issues.join("\n  ")}`);
    this.name = "EnvironmentError";
  }
}

export function parseServerEnv(
  source: Record<string, string | undefined>,
): ServerEnv {
  const parsed = serverEnv$.safeParse(source);

  if (!parsed.success) {
    throw new EnvironmentError(
      parsed.error.issues.map(
        (issue) => `${issue.path.join(".")}: ${issue.message}`,
      ),
    );
  }

  return parsed.data;
}

let cached: ServerEnv | undefined;

export function serverEnv(): ServerEnv {
  cached ??= parseServerEnv(process.env);
  return cached;
}
