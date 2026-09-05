import nextCoreWebVitals from "eslint-config-next/core-web-vitals";
import nextTypeScript from "eslint-config-next/typescript";

const config = [
  {
    ignores: [
      ".next/**",
      ".next-redesign/**",
      ".next-discovery/**",
      ".next-brands/**",
      ".playwright-mcp/**",
      "out/**",
      "build/**",
      "coverage/**",
      "playwright-report/**",
      "test-results/**",
      "next-env.d.ts",
      // `prisma generate` output — machine-written, not ours to lint.
      "src/generated/**",
      // Deliberate boundary violations, fed to the checker by its own test.
      "src/test/boundaries/fixtures/**",
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
