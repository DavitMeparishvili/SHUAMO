import { execSync } from "node:child_process";
import "dotenv/config";
import { requireTestDatabaseUrl } from "../src/config/test-database-url";

// The plan named this file .mjs, but plain `node` cannot import the .ts guard
// and the guard is the whole point of the script, so it runs under tsx instead.
// The connection string is handed over through the environment rather than the
// command line: nothing here is interpolated into a shell string.
const databaseUrl = requireTestDatabaseUrl(process.env);

execSync("pnpm prisma migrate deploy", {
  stdio: "inherit",
  env: { ...process.env, DATABASE_URL: databaseUrl },
});
