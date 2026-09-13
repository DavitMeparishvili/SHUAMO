import { readdirSync, readFileSync, statSync } from "node:fs";
import { builtinModules } from "node:module";
import { dirname, extname, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");

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
// node:crypto's digest functions are deterministic arithmetic over bytes; they
// perform no I/O and keep bearer-key hashing in the pure identity domain.
const DOMAIN_SAFE_PACKAGES = ["decimal.js", "node:crypto"];
const DOMAIN_TEST_PACKAGES = ["vitest"];

// The module that holds the primitives every other domain is allowed to use.
const SHARED_MODULE = "shared";

// A module's public surface. "" and "index" are its index; "testing" is its
// test-double index, which only a test file may import.
const PUBLIC_ENTRIES = new Set(["", "index", "testing", "testing/index"]);
const TESTING_ENTRIES = new Set(["testing", "testing/index"]);

// Skipped wherever they appear, because they nest.
const SKIPPED_DIRECTORY_NAMES = new Set([
  "node_modules",
  ".git",
  ".next",
  ".next-redesign",
  ".next-discovery",
  ".next-brands",
  ".next-layout",
]);

// Skipped only at these exact repository-relative paths. Matching on the bare
// directory name would exempt any directory that happened to share it — a
// `src/modules/shared/domain/generated/` would then be free to import Prisma.
const SKIPPED_PATHS = new Set([
  // `prisma generate` output: machine-written, and it imports @prisma/client on
  // nearly every file by design.
  "src/generated",
  // Deliberate violations, fed to this checker by its own test.
  "src/test/boundaries/fixtures",
  "docs",
  "coverage",
  "out",
  "build",
  "playwright-report",
  "test-results",
  ".agents",
  ".claude",
  ".codex",
  ".impeccable",
  ".superpowers",
]);

const nodeBuiltins = new Set(
  builtinModules.map((name) => name.replace(/^node:/, "")),
);

const isTestFile = (file) => /\.(test|spec)\.[cm]?[jt]sx?$/.test(file);

function normalise(root, path) {
  return relative(root, path).split(sep).join("/");
}

function* walk(root, directory) {
  for (const entry of readdirSync(directory)) {
    if (SKIPPED_DIRECTORY_NAMES.has(entry)) continue;

    const path = join(directory, entry);
    if (SKIPPED_PATHS.has(normalise(root, path))) continue;

    if (statSync(path).isDirectory()) yield* walk(root, path);
    else if (sourceExtensions.has(extname(path))) yield path;
  }
}

/**
 * Every module specifier the file names, as `{ text }`. `text` is null for a
 * dynamic import whose argument is not a literal: such a specifier cannot be
 * checked, so it is reported rather than ignored.
 */
function importsOf(file) {
  const source = ts.createSourceFile(
    file,
    readFileSync(file, "utf8"),
    ts.ScriptTarget.Latest,
    true,
  );

  const specifiers = [];

  const visit = (node) => {
    // import x from "y" / export { x } from "y" / export * from "y".
    // isStringLiteralLike also matches a NoSubstitutionTemplateLiteral, which
    // is a distinct AST node: `import("@prisma/client")` written with backticks
    // used to be invisible to this checker.
    if (
      (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) &&
      node.moduleSpecifier &&
      ts.isStringLiteralLike(node.moduleSpecifier)
    ) {
      specifiers.push({ text: node.moduleSpecifier.text });
    }

    // import x = require("y"). Legal TypeScript regardless of the emit module,
    // and it resolves a real specifier, so it is checked like any other.
    if (
      ts.isImportEqualsDeclaration(node) &&
      ts.isExternalModuleReference(node.moduleReference) &&
      ts.isStringLiteralLike(node.moduleReference.expression)
    ) {
      specifiers.push({ text: node.moduleReference.expression.text });
    }

    // import("y") in any of its spellings.
    if (
      ts.isCallExpression(node) &&
      node.expression.kind === ts.SyntaxKind.ImportKeyword
    ) {
      const argument = node.arguments[0];
      specifiers.push({
        text:
          argument !== undefined && ts.isStringLiteralLike(argument)
            ? argument.text
            : null,
      });
    }

    ts.forEachChild(node, visit);
  };

  visit(source);
  return specifiers;
}

function resolveInternal(root, file, specifier) {
  if (specifier.startsWith("."))
    return normalise(root, resolve(dirname(file), specifier));
  if (specifier.startsWith("@/")) return specifier.slice(2);
  if (specifier.startsWith("src/")) return specifier;
  return undefined;
}

/** `src/modules/shared/testing` → `{ module: "shared", rest: "testing" }`. */
function moduleEntryOf(internal) {
  if (internal === undefined) return undefined;
  const parts = internal.split("/");
  if (parts.length < 3 || parts[0] !== "src" || parts[1] !== "modules") {
    return undefined;
  }
  return { module: parts[2], rest: parts.slice(3).join("/") };
}

export function findViolations(root) {
  const violations = [];

  for (const file of walk(root, root)) {
    const relativeFile = normalise(root, file);
    const inDomain = /(^|\/)src\/modules\/[^/]+\/domain\//.test(relativeFile);
    const moduleName = relativeFile.match(/^src\/modules\/([^/]+)\//)?.[1];
    const isTest = isTestFile(relativeFile);

    for (const { text: specifier } of importsOf(file)) {
      if (specifier === null) {
        violations.push(
          `${relativeFile}: dynamic import with a computed specifier cannot be checked; use a literal`,
        );
        continue;
      }

      const internal = resolveInternal(root, file, specifier);
      const target = moduleEntryOf(internal);

      // Rule 1: a domain/ file imports its own domain folder, the shared
      // module's public index, and nothing else. Resolving internally is not a
      // free pass — "@/src/infrastructure/db/client" is exactly the import this
      // rule exists to stop.
      if (inDomain) {
        if (internal === undefined) {
          const allowed = [
            ...DOMAIN_SAFE_PACKAGES,
            ...(isTest ? DOMAIN_TEST_PACKAGES : []),
          ];
          const permitted =
            allowed.some(
              (p) => specifier === p || specifier.startsWith(`${p}/`),
            ) ||
            (isTest && nodeBuiltins.has(specifier.replace(/^node:/, "")));

          if (!permitted) {
            violations.push(
              `${relativeFile}: domain may not import "${specifier}"`,
            );
          }
        } else {
          const ownDomain =
            moduleName !== undefined &&
            internal.startsWith(`src/modules/${moduleName}/domain/`);

          const foreignShared =
            target?.module === SHARED_MODULE && target.module !== moduleName;
          const sharedIndex =
            foreignShared && (target.rest === "" || target.rest === "index");
          const sharedTesting =
            foreignShared && TESTING_ENTRIES.has(target.rest) && isTest;

          if (!ownDomain && !sharedIndex && !sharedTesting) {
            violations.push(
              `${relativeFile}: domain may not import "${specifier}"; a domain folder reaches its own domain files and the "${SHARED_MODULE}" module's public index`,
            );
          }
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

      // Rule 3: any consumer reaches a module only through its public surface.
      // This is not restricted to files inside src/modules — app/ and
      // src/infrastructure/ are consumers too, and were the ones actually
      // reaching past an index.
      if (target && target.module !== moduleName) {
        if (!PUBLIC_ENTRIES.has(target.rest)) {
          violations.push(
            `${relativeFile}: import "${specifier}" reaches inside module "${target.module}"; use its index`,
          );
        } else if (TESTING_ENTRIES.has(target.rest) && !isTest) {
          violations.push(
            `${relativeFile}: import "${specifier}" pulls test doubles into production code; "${target.module}/testing" is for test files only`,
          );
        }
      }
    }
  }

  return violations;
}

const invokedDirectly =
  process.argv[1] !== undefined &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (invokedDirectly) {
  const violations = findViolations(repositoryRoot);

  if (violations.length > 0) {
    console.error(`Module boundary violations (${violations.length}):`);
    for (const violation of violations) console.error(`  ${violation}`);
    process.exit(1);
  }

  console.log("Module boundaries are clean.");
}
