// Integration teardown truncates every table. This is the only thing standing
// between that statement and a developer's working data.
export function requireTestDatabaseUrl(
  source: Record<string, string | undefined>,
): string {
  const url = source.DATABASE_URL_TEST;

  if (url === undefined || url === "") {
    throw new Error("DATABASE_URL_TEST is required to run integration tests");
  }

  const databaseName = new URL(url).pathname.replace(/^\//, "");

  if (!databaseName.endsWith("_test")) {
    throw new Error(
      `Refusing to run integration tests against "${databaseName}": the database name must end _test`,
    );
  }

  return url;
}
