import "dotenv/config";
import { fileURLToPath } from "node:url";

export interface RedirectLatency {
  p50: number;
  p95: number;
  p99: number;
  samples: number;
}

function percentile(sorted: readonly number[], fraction: number): number {
  const index = Math.max(0, Math.ceil(sorted.length * fraction) - 1);
  return sorted[index] ?? Number.NaN;
}

export async function measureRedirectLatency(
  input: {
    requests?: number;
    appUrl?: string;
    code?: string;
  } = {},
): Promise<RedirectLatency> {
  const requests = input.requests ?? 500;
  const appUrl = input.appUrl ?? process.env.APP_URL ?? "http://localhost:3000";
  const code = input.code ?? "P4ACTV01";
  const samples: number[] = [];

  for (let index = 0; index < requests; index += 1) {
    const response = await fetch(new URL(`/r/${code}`, appUrl), {
      redirect: "manual",
      headers: {
        "x-real-ip": "31.146.0.1",
        "user-agent": "shuamo-latency-probe/1",
      },
    });
    if (response.status !== 302) {
      throw new Error(`redirect probe returned HTTP ${response.status}`);
    }
    const timing = response.headers.get("server-timing");
    const duration = /(?:^|,)\s*total;dur=([0-9.]+)/.exec(timing ?? "")?.[1];
    if (duration === undefined) {
      throw new Error("redirect response omitted Server-Timing total duration");
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
  const result = await measureRedirectLatency();
  console.log(JSON.stringify({ event: "redirect_latency", ...result }));
  if (result.p95 >= 50) process.exitCode = 1;
}
