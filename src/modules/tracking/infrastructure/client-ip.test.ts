import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { resolveClientIp } from "./client-ip";

describe("resolveClientIp", () => {
  it("uses only the address Caddy resolved", () => {
    const headers = new Headers({
      "x-real-ip": "31.146.0.1",
      "x-forwarded-for": "1.2.3.4, 5.6.7.8",
    });
    expect(resolveClientIp(headers)).toBe("31.146.0.1");
  });

  it("returns a stable placeholder without the trusted header", () => {
    expect(resolveClientIp(new Headers())).toBe("unknown");
  });

  it("has Caddy resolve trusted proxies strictly and overwrite both headers", () => {
    const caddy = readFileSync("deploy/Caddyfile", "utf8");
    expect(caddy).toMatch(/trusted_proxies static 127\.0\.0\.0\/8 ::1\/128/);
    expect(caddy).toMatch(/trusted_proxies_strict/);
    expect(caddy).toMatch(/client_ip_headers X-Forwarded-For/);
    expect(caddy).toMatch(/header_up X-Real-IP \{client_ip\}/);
    expect(caddy).toMatch(/header_up X-Forwarded-For \{client_ip\}/);
    expect(caddy).not.toContain("{remote_host}");
    expect(caddy).not.toMatch(/header_up \+X-Forwarded-For/);
  });
});
