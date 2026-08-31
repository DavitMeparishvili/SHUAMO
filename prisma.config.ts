import "dotenv/config";
import { defineConfig, env } from "prisma/config";

// Prisma 7 no longer accepts `url` inside the schema's datasource block; the
// migration and introspection commands read it from here instead. `env()`
// throws when the variable is absent, which keeps the "no secret defaults"
// rule true for the CLI as well as for the app.
export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: { path: "prisma/migrations" },
  datasource: { url: env("DATABASE_URL") },
});
