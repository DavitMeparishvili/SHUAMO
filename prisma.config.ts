import "dotenv/config";
import { defineConfig } from "prisma/config";

// Prisma 7 no longer accepts `url` inside the schema's datasource block; the
// migration and introspection commands read it from here instead.
//
// It is attached only when it is actually set. `prisma generate` needs no
// connection string and runs from the postinstall hook, which on a fresh clone
// happens before anyone has written `.env`; resolving the variable eagerly there
// fails the very first `pnpm install`. The migration commands do need it and
// report their own error when it is missing — there is still no default value
// anywhere.
const databaseUrl = process.env.DATABASE_URL;

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: { path: "prisma/migrations" },
  ...(databaseUrl === undefined ? {} : { datasource: { url: databaseUrl } }),
});
