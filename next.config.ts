import type { NextConfig } from "next";

// `output: "standalone"` traces the server bundle and links every runtime
// dependency into `.next/standalone`. On Windows that link step needs
// SeCreateSymbolicLinkPrivilege — Developer Mode or an elevated shell — and
// without it the build dies with EPERM after compiling successfully. CI and the
// deployment image both build on Linux, where standalone output is required, so
// the tracer stays on everywhere except a plain Windows workstation.
// Set SHUAMO_STANDALONE=1 to force it on, or SHUAMO_STANDALONE=0 to force it off.
const standaloneOverride = process.env.SHUAMO_STANDALONE;
const standalone =
  standaloneOverride === undefined
    ? process.platform !== "win32"
    : standaloneOverride === "1";

const nextConfig: NextConfig = {
  ...(standalone ? { output: "standalone" as const } : {}),
  poweredByHeader: false,
  reactStrictMode: true,
};

export default nextConfig;
