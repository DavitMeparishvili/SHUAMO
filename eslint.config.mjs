import nextCoreWebVitals from "eslint-config-next/core-web-vitals";
import nextTypeScript from "eslint-config-next/typescript";

const config = [
  {
    ignores: [
      ".next/**",
      "out/**",
      "build/**",
      "coverage/**",
      "playwright-report/**",
      "test-results/**",
      "next-env.d.ts",
      // `prisma generate` output — machine-written, not ours to lint.
      "src/generated/**",
      // Agent tooling that ships its own scripts; not application source.
      ".agents/**",
      ".claude/**",
      ".codex/**",
      ".impeccable/**",
      ".superpowers/**",
    ],
  },
  ...nextCoreWebVitals,
  ...nextTypeScript,
];

export default config;
