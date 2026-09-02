import "dotenv/config";
import { fileURLToPath } from "node:url";

export interface ConversionsLatency {
  readonly p50: number;
  readonly p95: number;
  readonly p99: number;
  readonly samples: number;
}

function percentile(sorted: readonly number[], fraction: number): number {
  return sorted[Math.max(0, Math.ceil(sorted.length * fraction) - 1)]!;
}

export async function measureConversionsLatency(
  input: {
    requests?: number;
    appUrl?: string;
    key?: string;
    sku?: string;
  } = {},
): Promise<ConversionsLatency> {
  const requests = input.requests ?? 200;
  const appUrl = input.appUrl ?? process.env.APP_URL ?? "http://localhost:3000";
  const key = input.key ?? "xu_sk_BBBBBBBB_BBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB";
  const sku = input.sku ?? "PHASE4-ACTIVE-1";
  const samples: number[] = [];

  for (let index = 0; index < requests; index += 1) {
    const redirect = await fetch(new URL("/r/P4ACTV01", appUrl), {
      redirect: "manual",
    });
    const location = redirect.headers.get("location");
    if (redirect.status !== 302 || location === null) {
      throw new Error("conversion probe could not mint a recorded click");
    }
    const clickId = new URL(location, appUrl).searchParams.get("xu");
    if (clickId === null) {
      throw new Error("conversion probe redirect omitted its click ID");
    }
    const response = await fetch(new URL("/v1/conversions", appUrl), {
      method: "POST",
      headers: {
        authorization: `Bearer ${key}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        orderId: `LATENCY-${Date.now()}-${index}`,
        occurredAt: new Date().toISOString(),
        clickId,
        items: [
          {
            sku,
            qty: 1,
            unitPrice: "100.00",
            lineDiscount: "0.00",
            lineVat: "0.00",
          },
        ],
      }),
    });
    if (response.status !== 200) {
      throw new Error(`conversion probe returned HTTP ${response.status}`);
    }
    const timing = response.headers.get("server-timing");
    const duration = /(?:^|,)\s*total;dur=([0-9.]+)/.exec(timing ?? "")?.[1];
    if (duration === undefined) {
      throw new Error("conversion response omitted Server-Timing");
    }
    samples.push(Number(duration));
  }
  samples.sort((a, b) => a - b);
  return {
    p50: percentile(samples, 0.5),
    p95: percentile(samples, 0.95),
    p99: percentile(samples, 0.99),
    samples: samples.length,
  };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const result = await measureConversionsLatency();
  console.log(JSON.stringify({ event: "conversions_latency", ...result }));
  if (result.p95 >= 200) process.exitCode = 1;
}
