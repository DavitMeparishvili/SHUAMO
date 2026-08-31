import { readdirSync, readFileSync, statSync } from "node:fs";
import { builtinModules } from "node:module";
import { dirname, extname, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const sourceExtensions = new Set([
  ".ts",
  ".tsx",
  ".mts",
  ".mjs",
  ".js",
  ".jsx",
]);

// The only third-party packages a domain/ folder may import. decimal.js is
// arithmetic, not I/O; vitest only appears in domain tests.
const DOMAIN_SAFE_PACKAGES = ["decimal.js"];
const DOMAIN_TEST_PACKAGES = ["vitest"];

// Directories that hold no application source. `generated` matters most: the
// Prisma client imports @prisma/client on every second line by design, and
// rule 2 would report each one.
const SKIPPED_DIRECTORIES = new Set([
  ".git",
  ".next",
  "node_modules",
  "build",
  "coverage",
  "out",
  "playwright-report",
  "test-results",
  ".agents",
  ".claude",
  ".codex",
  ".impeccable",
  ".superpowers",
  "docs",
  "generated",
]);

const nodeBuiltins = new Set(
  builtinModules.map((m) => m.replace(/^node:/, "")),
);

function* walk(directory) {
  for (const entry of readdirSync(directory)) {
    if (SKIPPED_DIRECTORIES.has(entry)) continue;
    const path = join(directory, entry);
    if (statSync(path).isDirectory()) yield* walk(path);
    else if (sourceExtensions.has(extname(path))) yield path;
  }
}

function importsOf(file) {
  const source = ts.createSourceFile(
    file,
    readFileSync(file, "utf8"),
    ts.ScriptTarget.Latest,
    true,
  );
  const specifiers = [];
  const visit = (node) => {
    if (
      (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) &&
      node.moduleSpecifier &&
      ts.isStringLiteral(node.moduleSpecifier)
    ) {
      specifiers.push(node.moduleSpecifier.text);
    }
    if (
      ts.isCallExpression(node) &&
      node.expression.kind === ts.SyntaxKind.ImportKeyword &&
      node.arguments.length > 0 &&
      ts.isStringLiteral(node.arguments[0])
    ) {
      specifiers.push(node.arguments[0].text);
    }
    ts.forEachChild(node, visit);
  };
  visit(source);
  return specifiers;
}

function normalise(path) {
  return relative(root, path).split(sep).join("/");
}

function resolveInternal(file, specifier) {
  if (specifier.startsWith("."))
    return normalise(resolve(dirname(file), specifier));
  if (specifier.startsWith("@/")) return specifier.slice(2);
  if (specifier.startsWith("src/")) return specifier;
  return undefined;
}

const violations = [];
const isTest = (file) => /\.(test|spec)\.[cm]?[jt]sx?$/.test(file);

for (const file of walk(root)) {
  const relativeFile = normalise(file);
  const inDomain = /(^|\/)src\/modules\/[^/]+\/domain\//.test(relativeFile);
  const moduleName = relativeFile.match(/^src\/modules\/([^/]+)\//)?.[1];

  for (const specifier of importsOf(file)) {
    const internal = resolveInternal(file, specifier);

    // Rule 1: domain/ imports nothing but its own files and safe packages.
    if (inDomain) {
      if (internal === undefined) {
        const allowed = [
          ...DOMAIN_SAFE_PACKAGES,
          ...(isTest(relativeFile) ? DOMAIN_TEST_PACKAGES : []),
        ];
        const permitted =
          allowed.some(
            (p) => specifier === p || specifier.startsWith(`${p}/`),
          ) ||
          (isTest(relativeFile) &&
            nodeBuiltins.has(specifier.replace(/^node:/, "")));
        if (!permitted) {
          violations.push(
            `${relativeFile}: domain may not import "${specifier}"`,
          );
        }
      } else if (
        moduleName === undefined ||
        !internal.startsWith(`src/modules/${moduleName}/domain/`)
      ) {
        // An internal path is not automatically safe: `@/src/infrastructure/db`
        // is exactly the import this rule exists to stop. A domain file reaches
        // its own domain folder and nothing else.
        violations.push(
          `${relativeFile}: domain may not import "${specifier}"; a domain folder reaches only its own domain files`,
        );
      }
    }

    // Rule 2: Prisma lives behind infrastructure/, nowhere else.
    const touchesPrisma =
      specifier.startsWith("@prisma/") ||
      specifier === "prisma" ||
      internal?.includes("src/generated/prisma");
    const inInfrastructure =
      relativeFile.startsWith("src/infrastructure/") ||
      /(^|\/)src\/modules\/[^/]+\/infrastructure\//.test(relativeFile) ||
      relativeFile.startsWith("scripts/") ||
      relativeFile.startsWith("prisma/");
    if (touchesPrisma && !inInfrastructure) {
      violations.push(
        `${relativeFile}: only infrastructure/ may import Prisma ("${specifier}")`,
      );
    }

    // Rule 3: a module reaches another module only through its index.
    if (moduleName && internal?.startsWith("src/modules/")) {
      const targetModule = internal.split("/")[2];
      const reachesInside = internal.split("/").length > 3;
      if (targetModule && targetModule !== moduleName && reachesInside) {
        violations.push(
          `${relativeFile}: import "${specifier}" reaches inside module "${targetModule}"; use its index`,
        );
      }
    }
  }
}

if (violations.length > 0) {
  console.error(`Module boundary violations (${violations.length}):`);
  for (const violation of violations) console.error(`  ${violation}`);
  process.exit(1);
}

console.log("Module boundaries are clean.");
