export const dynamic = "force-dynamic";

export function GET(): Response {
  if (process.env.E2E_TEST !== "1") {
    return new Response(null, { status: 404 });
  }
  return new Response("Seeded shop destination", {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
