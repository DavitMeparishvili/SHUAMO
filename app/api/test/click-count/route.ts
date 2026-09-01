import { countClicks } from "@/src/infrastructure/e2e/click-count";

export const dynamic = "force-dynamic";

export async function GET(): Promise<Response> {
  if (process.env.E2E_TEST !== "1") {
    return new Response(null, { status: 404 });
  }
  return Response.json({ count: await countClicks() });
}
