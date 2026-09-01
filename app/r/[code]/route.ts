import { createRedirectHandler } from "@/src/modules/tracking";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = createRedirectHandler();
