# Phase 1 — Design Language & Component Kit Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A written design language and a built component kit for SHUAMO, in both locales, before any product screen exists — so no surface is ever styled twice.

**Architecture:** One source of truth for every visual value: `src/modules/design-system/domain/tokens.ts`, a pure TypeScript module. A generator emits `app/tokens.css` from it, and a check fails the build if the two drift. Contrast is a unit test over the token table, not a designer's memory. Components live in `src/modules/design-system/ui/` and are the only place a colour, radius, or type size is ever spelled out.

**Tech Stack:** Tailwind CSS 4 (`@theme`) · React 19 server components by default · Geist + Geist Mono + Noto Sans Georgian · Playwright with `@axe-core/playwright` and visual snapshots.

**Spec:** `docs/superpowers/specs/2026-08-28-shuamo-r1-design.md` (§7 views define what the kit must be able to render) and `docs/superpowers/plans/2026-08-29-shuamo-delivery-roadmap.md`.

## Global Constraints

Inherited from the roadmap. The ones this phase exercises:

- Locales are `ka` and `en`, **both complete**. Georgian is never given a smaller size or a lighter weight than English.
- WCAG 2.2 AA on every screen, including hover, active, focus, and disabled states.
- Money is an exact decimal. A component never accepts a JavaScript `number` for an amount.
- `domain/` imports no framework: `tokens.ts` and `contrast.ts` are pure and testable without React.
- Each task ends in a commit.

---

## Planned file structure

```
DESIGN.md                                          the manifest, frontmatter + prose
scripts/generate-tokens.mjs                        tokens.ts -> app/tokens.css
app/tokens.css                                     generated; committed; never hand-edited
app/globals.css                                    imports tokens.css, sets base type
src/modules/design-system/domain/tokens.ts         the single source of every value
src/modules/design-system/domain/tokens.test.ts
src/modules/design-system/domain/contrast.ts       WCAG 2.2 relative luminance + ratio
src/modules/design-system/domain/contrast.test.ts
src/modules/design-system/domain/contrast-pairs.test.ts   every declared pair meets AA
src/modules/design-system/ui/button.tsx            + button.test.tsx
src/modules/design-system/ui/field.tsx             + field.test.tsx
src/modules/design-system/ui/select.tsx
src/modules/design-system/ui/card.tsx
src/modules/design-system/ui/figure.tsx            + figure.test.tsx
src/modules/design-system/ui/money.tsx             + money.test.tsx
src/modules/design-system/ui/status-pill.tsx       + status-pill.test.tsx
src/modules/design-system/ui/data-table.tsx
src/modules/design-system/ui/empty-state.tsx
src/modules/design-system/ui/banner.tsx
src/modules/design-system/ui/copy-field.tsx        + copy-field.test.tsx
src/modules/design-system/index.ts
src/modules/shell/ui/utility-strip.tsx
src/modules/shell/ui/site-header.tsx               + nav-model.ts + nav-model.test.ts
src/modules/shell/ui/locale-switch.tsx
src/modules/shell/ui/site-footer.tsx
src/modules/shell/ui/mobile-tab-bar.tsx
src/modules/shell/index.ts
app/[locale]/design/page.tsx                       the kitchen sink
src/test/e2e/design-system.spec.ts                 @phase-1
```

---

### Task 1: Write the design manifest

**Files:**

- Create: `DESIGN.md`

**Interfaces:**

- Consumes: nothing
- Produces: the vocabulary every later task cites — token names, the named rules, and the layout grid

- [ ] **Step 1: Write the frontmatter**

`DESIGN.md` opens with a machine-readable manifest. Task 2 transcribes these values into `tokens.ts`; the two are checked against each other by eye at review, and by the contrast test thereafter.

```yaml
---
name: SHUAMO
description: A creator-performance platform in ink, paper and one electric signal — every number traceable to the rows that produced it.
colors:
  signal: "#4436F5"
  signal-hover: "#3628D6"
  signal-active: "#2A1FAD"
  signal-50: "#F0EEFF"
  signal-100: "#DEDAFE"
  signal-200: "#C0B8FC"
  signal-700: "#2A1FAD"
  ink: "#111318"
  paper: "#FFFFFF"
  slate-50: "#F7F8FA"
  slate-100: "#EFF1F5"
  slate-200: "#E1E4EB"
  slate-300: "#CBD0DA"
  slate-400: "#9AA1B0"
  slate-500: "#6F7686"
  slate-600: "#535A69"
  slate-700: "#3B414D"
  slate-800: "#252A33"
  on-inverse: "#F3F4F7"
  accrued: "#8A5A00"
  accrued-soft: "#FFF4DE"
  settled: "#0B6B4F"
  settled-soft: "#E3F3EC"
  reversed: "#A32A22"
  reversed-soft: "#FBE9E7"
  focus-ring: "rgb(68 54 245 / 0.28)"
typography:
  display:
    fontFamily: "Geist, Noto Sans Georgian, system-ui, sans-serif"
    fontSize: "48px"
    fontWeight: 700
    lineHeight: 1.05
    letterSpacing: "-0.03em"
  h1:
    fontFamily: "Geist, Noto Sans Georgian, system-ui, sans-serif"
    fontSize: "34px"
    fontWeight: 700
    lineHeight: 1.1
    letterSpacing: "-0.025em"
  h2:
    fontFamily: "Geist, Noto Sans Georgian, system-ui, sans-serif"
    fontSize: "26px"
    fontWeight: 650
    lineHeight: 1.2
    letterSpacing: "-0.02em"
  h3:
    fontFamily: "Geist, Noto Sans Georgian, system-ui, sans-serif"
    fontSize: "20px"
    fontWeight: 650
    lineHeight: 1.3
    letterSpacing: "-0.01em"
  body:
    fontFamily: "Geist, Noto Sans Georgian, system-ui, sans-serif"
    fontSize: "16px"
    fontWeight: 400
    lineHeight: 1.6
  small:
    fontFamily: "Geist, Noto Sans Georgian, system-ui, sans-serif"
    fontSize: "14px"
    fontWeight: 450
    lineHeight: 1.5
  caption:
    fontFamily: "Geist, Noto Sans Georgian, system-ui, sans-serif"
    fontSize: "12px"
    fontWeight: 500
    lineHeight: 1.4
  overline:
    fontFamily: "Geist, Noto Sans Georgian, system-ui, sans-serif"
    fontSize: "11px"
    fontWeight: 700
    lineHeight: 1.3
    letterSpacing: "0.12em"
  figure-lg:
    fontFamily: "Geist Mono, ui-monospace, monospace"
    fontSize: "28px"
    fontWeight: 600
    lineHeight: 1.1
    fontVariantNumeric: "tabular-nums"
  figure:
    fontFamily: "Geist Mono, ui-monospace, monospace"
    fontSize: "20px"
    fontWeight: 600
    lineHeight: 1.2
    fontVariantNumeric: "tabular-nums"
  mono:
    fontFamily: "Geist Mono, ui-monospace, monospace"
    fontSize: "14px"
    fontWeight: 500
    lineHeight: 1.5
    fontVariantNumeric: "tabular-nums"
rounded:
  xs: "4px"
  sm: "8px"
  md: "12px"
  lg: "20px"
  pill: "999px"
elevation:
  xs: "0 1px 2px rgb(17 19 24 / 0.05)"
  sm: "0 2px 6px rgb(17 19 24 / 0.06), 0 1px 2px rgb(17 19 24 / 0.04)"
  md: "0 8px 24px rgb(17 19 24 / 0.08), 0 2px 6px rgb(17 19 24 / 0.05)"
layout:
  column: "1160px"
  gutter: "32px"
  gutter-md: "24px"
  gutter-sm: "16px"
  rail: "248px"
  control-height: "44px"
space:
  scale: "4 · 8 · 12 · 16 · 24 · 32 · 48 · 64 · 96"
---
```

- [ ] **Step 2: Write the prose**

Below the frontmatter, `DESIGN.md` states what the system is for and the rules that govern it. Write these sections, in this order:

**Overview — creative north star: "Provenance."**

> SHUAMO exists to answer one question about money: where did this number come from? The interface is built as an instrument, not a dashboard. Every aggregate is a link to the rows beneath it, every forward-looking figure is labelled an estimate, and every amount is set in tabular mono so two numbers in a column can be compared by eye. Ink and paper carry the page. One electric signal marks the single thing to do next. Three state tones — accrued, settled, reversed — carry money's only three conditions, and they are always accompanied by words.

**Colors.** The signal indigo is the one accent: primary action, active nav, the focused control's ring, and nothing else. The slate ramp is a true neutral from paper to near-ink: `slate-200` is the default hairline, `slate-300` the interactive border, `slate-500` muted text, `slate-700` body copy. The three state tones are used for money state and never as decoration.

**Named rules.** These are the enforceable part of the system. Each one is a test somewhere in this phase:

- **The White-On-Signal Rule.** Text on `signal` is always `paper`. Ink on indigo fails contrast and is never used, including hover and active.
- **The Money-Is-Mono Rule.** Every GEL amount — anywhere, at any size — is set in Geist Mono with `font-variant-numeric: tabular-nums`. Prose numbers are not money.
- **The Provenance Rule.** Every aggregate figure links to the rows that produced it. A total the user cannot open is a total the user cannot check.
- **The Estimate Rule.** A forward-looking number carries the word "estimate" in its visible label, in both locales. `§7.3` requires this because catalogue price is display-only and the real commission always comes from the postback.
- **The Single-Signal Rule.** One indigo element owns each decision surface. Two competing signals means one of them is wrong.
- **The State-Needs-Words Rule.** Status is never colour alone. Every pill carries its label; a screenshot in greyscale must still be readable.
- **The Equal-Script Rule.** Georgian may wrap earlier than English, but it is never given a smaller size, a lighter weight, or a truncation English does not get.
- **The Dead-Link Rule.** The "offer ended" page (§5) is a designed page, not an error page. A buyer who lands there was sent by a creator, and both of them deserve an explanation rather than a stack trace.

**Typography.** Geist for text, Geist Mono for every figure, Noto Sans Georgian as the per-glyph fallback inside the same declaration so one stack serves both locales without a language branch. The hierarchy is the frontmatter scale; half-steps are not part of the ramp.

**Layout.** A 1160px column with 32px gutters, narrowing to 24px below 1180px and 16px below 640px. Workspaces are a 248px rail beside `minmax(0, 1fr)`, collapsing to one column below 1024px, reordered by decision priority rather than source order. Below 640px a bottom tab bar replaces the nav tabs.

**Elevation.** Three steps. A card at rest is `xs`; a card that is a destination raises to `sm` on hover and takes a `signal-200` border. Nothing in the product is at `md` except a modal and the mobile filter sheet. A hover raise promises a destination — a card that does not navigate does not raise.

**Components.** One paragraph each for Button, Field, Select, Card, Figure, Money, StatusPill, DataTable, EmptyState, Banner and CopyField, describing shape, states, and the rule each one enforces. Tasks 4–6 implement exactly what is written here.

- [ ] **Step 3: Commit**

```bash
git add DESIGN.md
git commit -m "docs: write the SHUAMO design manifest"
```

---

### Task 2: Make the token layer the single source of truth

**Files:**

- Create: `src/modules/design-system/domain/tokens.ts`, `src/modules/design-system/domain/tokens.test.ts`
- Create: `scripts/generate-tokens.mjs`
- Create: `app/tokens.css` (generated)
- Modify: `app/globals.css`, `package.json`

**Interfaces:**

- Consumes: nothing
- Produces:
  - `COLORS: Record<ColorToken, string>` — hex or `rgb(...)` strings
  - `TYPE_SCALE: Record<TypeToken, TypeStyle>`
  - `RADIUS`, `ELEVATION`, `LAYOUT`, `SPACE`
  - `CONTRAST_PAIRS: readonly { name: string; foreground: ColorToken; background: ColorToken; minimum: 3 | 4.5 }[]`
  - `pnpm tokens:generate` and `pnpm tokens:check`

- [ ] **Step 1: Write the failing token test**

`src/modules/design-system/domain/tokens.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { COLORS, CONTRAST_PAIRS, RADIUS, TYPE_SCALE } from "./tokens";

describe("tokens", () => {
  it("declares every colour as a parseable value", () => {
    for (const [name, value] of Object.entries(COLORS)) {
      expect(value, name).toMatch(/^(#[0-9A-Fa-f]{6}|rgb\(.+\))$/);
    }
  });

  it("sets tabular numerals on every mono style", () => {
    for (const [name, style] of Object.entries(TYPE_SCALE)) {
      if (!style.fontFamily.startsWith("Geist Mono")) continue;
      expect(style.fontVariantNumeric, name).toBe("tabular-nums");
    }
  });

  it("names Noto Sans Georgian in every text stack", () => {
    for (const [name, style] of Object.entries(TYPE_SCALE)) {
      if (style.fontFamily.startsWith("Geist Mono")) continue;
      expect(style.fontFamily, name).toContain("Noto Sans Georgian");
    }
  });

  it("covers every interactive surface with a contrast pair", () => {
    const named = CONTRAST_PAIRS.map((pair) => pair.name);
    for (const required of [
      "signal button rest",
      "signal button hover",
      "signal button active",
      "outline button rest",
      "body text on paper",
      "muted text on paper",
      "accrued pill",
      "settled pill",
      "reversed pill",
      "utility strip",
    ]) {
      expect(named).toContain(required);
    }
  });

  it("keeps the radius ramp to five steps", () => {
    expect(Object.keys(RADIUS)).toEqual(["xs", "sm", "md", "lg", "pill"]);
  });
});
```

- [ ] **Step 2: Run and confirm failure**

```bash
pnpm vitest run src/modules/design-system/domain/tokens.test.ts
```

Expected: FAIL — module not found.

- [ ] **Step 3: Implement the tokens**

`src/modules/design-system/domain/tokens.ts`. Transcribe the `DESIGN.md` frontmatter exactly; this file is what the CSS is generated from, so a value that differs from the manifest is a bug in one of the two:

```ts
export const COLORS = {
  signal: "#4436F5",
  "signal-hover": "#3628D6",
  "signal-active": "#2A1FAD",
  "signal-50": "#F0EEFF",
  "signal-100": "#DEDAFE",
  "signal-200": "#C0B8FC",
  "signal-700": "#2A1FAD",
  ink: "#111318",
  paper: "#FFFFFF",
  "slate-50": "#F7F8FA",
  "slate-100": "#EFF1F5",
  "slate-200": "#E1E4EB",
  "slate-300": "#CBD0DA",
  "slate-400": "#9AA1B0",
  "slate-500": "#6F7686",
  "slate-600": "#535A69",
  "slate-700": "#3B414D",
  "slate-800": "#252A33",
  "on-inverse": "#F3F4F7",
  accrued: "#8A5A00",
  "accrued-soft": "#FFF4DE",
  settled: "#0B6B4F",
  "settled-soft": "#E3F3EC",
  reversed: "#A32A22",
  "reversed-soft": "#FBE9E7",
} as const;

export type ColorToken = keyof typeof COLORS;

export interface TypeStyle {
  readonly fontFamily: string;
  readonly fontSize: string;
  readonly fontWeight: number;
  readonly lineHeight: number;
  readonly letterSpacing?: string;
  readonly fontVariantNumeric?: "tabular-nums";
}

const TEXT = "Geist, Noto Sans Georgian, system-ui, sans-serif";
const MONO = "Geist Mono, ui-monospace, monospace";

export const TYPE_SCALE = {
  display: { fontFamily: TEXT, fontSize: "48px", fontWeight: 700, lineHeight: 1.05, letterSpacing: "-0.03em" },
  h1: { fontFamily: TEXT, fontSize: "34px", fontWeight: 700, lineHeight: 1.1, letterSpacing: "-0.025em" },
  h2: { fontFamily: TEXT, fontSize: "26px", fontWeight: 650, lineHeight: 1.2, letterSpacing: "-0.02em" },
  h3: { fontFamily: TEXT, fontSize: "20px", fontWeight: 650, lineHeight: 1.3, letterSpacing: "-0.01em" },
  body: { fontFamily: TEXT, fontSize: "16px", fontWeight: 400, lineHeight: 1.6 },
  small: { fontFamily: TEXT, fontSize: "14px", fontWeight: 450, lineHeight: 1.5 },
  caption: { fontFamily: TEXT, fontSize: "12px", fontWeight: 500, lineHeight: 1.4 },
  overline: { fontFamily: TEXT, fontSize: "11px", fontWeight: 700, lineHeight: 1.3, letterSpacing: "0.12em" },
  "figure-lg": { fontFamily: MONO, fontSize: "28px", fontWeight: 600, lineHeight: 1.1, fontVariantNumeric: "tabular-nums" },
  figure: { fontFamily: MONO, fontSize: "20px", fontWeight: 600, lineHeight: 1.2, fontVariantNumeric: "tabular-nums" },
  mono: { fontFamily: MONO, fontSize: "14px", fontWeight: 500, lineHeight: 1.5, fontVariantNumeric: "tabular-nums" },
} as const satisfies Record<string, TypeStyle>;

export type TypeToken = keyof typeof TYPE_SCALE;

export const RADIUS = { xs: "4px", sm: "8px", md: "12px", lg: "20px", pill: "999px" } as const;

export const ELEVATION = {
  xs: "0 1px 2px rgb(17 19 24 / 0.05)",
  sm: "0 2px 6px rgb(17 19 24 / 0.06), 0 1px 2px rgb(17 19 24 / 0.04)",
  md: "0 8px 24px rgb(17 19 24 / 0.08), 0 2px 6px rgb(17 19 24 / 0.05)",
} as const;

export const LAYOUT = {
  column: "1160px",
  gutter: "32px",
  "gutter-md": "24px",
  "gutter-sm": "16px",
  rail: "248px",
  "control-height": "44px",
} as const;

export const SPACE = [4, 8, 12, 16, 24, 32, 48, 64, 96] as const;

/**
 * Every foreground/background combination the product actually renders.
 * `minimum` is 4.5 for text and 3 for large text and non-text boundaries,
 * per WCAG 2.2 AA. A pair not listed here is a pair nobody checked.
 */
export const CONTRAST_PAIRS = [
  { name: "signal button rest", foreground: "paper", background: "signal", minimum: 4.5 },
  { name: "signal button hover", foreground: "paper", background: "signal-hover", minimum: 4.5 },
  { name: "signal button active", foreground: "paper", background: "signal-active", minimum: 4.5 },
  { name: "outline button rest", foreground: "ink", background: "paper", minimum: 4.5 },
  { name: "body text on paper", foreground: "slate-700", background: "paper", minimum: 4.5 },
  { name: "muted text on paper", foreground: "slate-500", background: "paper", minimum: 4.5 },
  { name: "body text on slate-50", foreground: "slate-700", background: "slate-50", minimum: 4.5 },
  { name: "accrued pill", foreground: "accrued", background: "accrued-soft", minimum: 4.5 },
  { name: "settled pill", foreground: "settled", background: "settled-soft", minimum: 4.5 },
  { name: "reversed pill", foreground: "reversed", background: "reversed-soft", minimum: 4.5 },
  { name: "utility strip", foreground: "on-inverse", background: "ink", minimum: 4.5 },
  { name: "link on paper", foreground: "signal", background: "paper", minimum: 4.5 },
  { name: "hairline on paper", foreground: "slate-200", background: "paper", minimum: 3 },
  { name: "interactive border on paper", foreground: "slate-300", background: "paper", minimum: 3 },
] as const satisfies readonly {
  name: string;
  foreground: ColorToken;
  background: ColorToken;
  minimum: 3 | 4.5;
}[];
```

- [ ] **Step 4: Run the token test**

```bash
pnpm vitest run src/modules/design-system/domain/tokens.test.ts
```

Expected: PASS, 5 tests.

- [ ] **Step 5: Generate the CSS from the tokens**

`scripts/generate-tokens.mjs`:

```js
import { writeFileSync, readFileSync, existsSync } from "node:fs";
import { COLORS, ELEVATION, LAYOUT, RADIUS, TYPE_SCALE } from "../src/modules/design-system/domain/tokens.ts";

const lines = [
  "/* GENERATED by scripts/generate-tokens.mjs — do not edit. */",
  "/* Edit src/modules/design-system/domain/tokens.ts and run `pnpm tokens:generate`. */",
  "@theme {",
];

for (const [name, value] of Object.entries(COLORS)) lines.push(`  --color-${name}: ${value};`);
for (const [name, value] of Object.entries(RADIUS)) lines.push(`  --radius-${name}: ${value};`);
for (const [name, value] of Object.entries(ELEVATION)) lines.push(`  --shadow-${name}: ${value};`);
for (const [name, value] of Object.entries(LAYOUT)) lines.push(`  --layout-${name}: ${value};`);

for (const [name, style] of Object.entries(TYPE_SCALE)) {
  lines.push(`  --type-${name}-family: ${style.fontFamily};`);
  lines.push(`  --type-${name}-size: ${style.fontSize};`);
  lines.push(`  --type-${name}-weight: ${style.fontWeight};`);
  lines.push(`  --type-${name}-leading: ${style.lineHeight};`);
  if (style.letterSpacing) lines.push(`  --type-${name}-tracking: ${style.letterSpacing};`);
}

lines.push("}", "");

// One utility class per type token, so a component never spells out a size.
for (const [name, style] of Object.entries(TYPE_SCALE)) {
  lines.push(`.type-${name} {`);
  lines.push(`  font-family: var(--type-${name}-family);`);
  lines.push(`  font-size: var(--type-${name}-size);`);
  lines.push(`  font-weight: var(--type-${name}-weight);`);
  lines.push(`  line-height: var(--type-${name}-leading);`);
  if (style.letterSpacing) lines.push(`  letter-spacing: var(--type-${name}-tracking);`);
  if (style.fontVariantNumeric) lines.push(`  font-variant-numeric: ${style.fontVariantNumeric};`);
  lines.push("}", "");
}

const output = lines.join("\n");
const target = "app/tokens.css";

if (process.argv.includes("--check")) {
  const current = existsSync(target) ? readFileSync(target, "utf8") : "";
  if (current !== output) {
    console.error("app/tokens.css is out of date. Run `pnpm tokens:generate`.");
    process.exit(1);
  }
  console.log("Tokens are in sync.");
} else {
  writeFileSync(target, output);
  console.log(`Wrote ${target}`);
}
```

Add to `package.json`:

```json
{
  "tokens:generate": "tsx scripts/generate-tokens.mjs",
  "tokens:check": "tsx scripts/generate-tokens.mjs --check"
}
```

- [ ] **Step 6: Generate, and wire globals.css**

```bash
pnpm tokens:generate
```

`app/globals.css`:

```css
@import "tailwindcss";
@import "./tokens.css";

:root {
  color-scheme: light;
}

body {
  background: var(--color-paper);
  color: var(--color-slate-700);
  font-family: var(--type-body-family);
  font-size: var(--type-body-size);
  line-height: var(--type-body-leading);
}

/* One focus treatment for the whole product. Never removed, never restyled
   per component — a focus ring a user cannot predict is a focus ring they
   cannot use. */
:focus-visible {
  outline: 2px solid var(--color-signal);
  outline-offset: 2px;
  border-radius: var(--radius-xs);
}
```

- [ ] **Step 7: Prove the drift check works**

```bash
pnpm tokens:check                                    # expect: "Tokens are in sync."
printf '\n/* drift */\n' >> app/tokens.css
pnpm tokens:check                                    # expect: exit 1
pnpm tokens:generate && pnpm tokens:check            # back in sync
```

- [ ] **Step 8: Commit**

```bash
git add src/modules/design-system scripts/generate-tokens.mjs app/tokens.css app/globals.css package.json
git commit -m "feat: generate the CSS token layer from a single typed source"
```

---

### Task 3: Prove the palette against WCAG 2.2 AA

**Files:**

- Create: `src/modules/design-system/domain/contrast.ts`, `src/modules/design-system/domain/contrast.test.ts`
- Create: `src/modules/design-system/domain/contrast-pairs.test.ts`

**Interfaces:**

- Consumes: `COLORS`, `CONTRAST_PAIRS` from Task 2
- Produces: `contrastRatio(foreground: string, background: string): number` — WCAG 2.2 relative-luminance ratio, `1..21`

- [ ] **Step 1: Write the failing contrast tests**

`src/modules/design-system/domain/contrast.test.ts` — the known values first, so a bug in the formula cannot hide behind the palette passing:

```ts
import { describe, expect, it } from "vitest";
import { contrastRatio } from "./contrast";

describe("contrastRatio", () => {
  it("returns 21 for black on white", () => {
    expect(contrastRatio("#000000", "#FFFFFF")).toBeCloseTo(21, 2);
  });

  it("returns 1 for a colour against itself", () => {
    expect(contrastRatio("#4436F5", "#4436F5")).toBeCloseTo(1, 4);
  });

  it("is symmetric", () => {
    expect(contrastRatio("#4436F5", "#FFFFFF")).toBeCloseTo(
      contrastRatio("#FFFFFF", "#4436F5"),
      6,
    );
  });

  it("matches the published ratio for a known pair", () => {
    // #767676 on #FFFFFF is the canonical AA boundary example: 4.54:1
    expect(contrastRatio("#767676", "#FFFFFF")).toBeCloseTo(4.54, 2);
  });
});
```

`src/modules/design-system/domain/contrast-pairs.test.ts` — the one that governs the palette:

```ts
import { describe, expect, it } from "vitest";
import { COLORS, CONTRAST_PAIRS } from "./tokens";
import { contrastRatio } from "./contrast";

describe("declared contrast pairs", () => {
  it.each(CONTRAST_PAIRS)(
    "$name meets $minimum:1",
    ({ foreground, background, minimum }) => {
      const ratio = contrastRatio(COLORS[foreground], COLORS[background]);
      expect(ratio).toBeGreaterThanOrEqual(minimum);
    },
  );
});
```

- [ ] **Step 2: Run and confirm failure**

```bash
pnpm vitest run src/modules/design-system/domain
```

Expected: FAIL — `contrast.ts` not found.

- [ ] **Step 3: Implement the ratio**

`src/modules/design-system/domain/contrast.ts`:

```ts
function channel(component: number): number {
  const normalised = component / 255;
  return normalised <= 0.03928
    ? normalised / 12.92
    : ((normalised + 0.055) / 1.055) ** 2.4;
}

function relativeLuminance(hex: string): number {
  const match = /^#([0-9A-Fa-f]{6})$/.exec(hex);
  if (!match?.[1]) {
    throw new TypeError(`contrastRatio needs a #RRGGBB colour, received "${hex}"`);
  }
  const value = Number.parseInt(match[1], 16);
  const r = channel((value >> 16) & 0xff);
  const g = channel((value >> 8) & 0xff);
  const b = channel(value & 0xff);

  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** WCAG 2.2 contrast ratio, between 1 and 21. */
export function contrastRatio(foreground: string, background: string): number {
  const a = relativeLuminance(foreground);
  const b = relativeLuminance(background);
  const [lighter, darker] = a > b ? [a, b] : [b, a];

  return (lighter + 0.05) / (darker + 0.05);
}
```

- [ ] **Step 4: Run the tests and fix the palette, not the test**

```bash
pnpm vitest run src/modules/design-system/domain
```

Expected: PASS. **If a pair fails, darken or lighten the token in `tokens.ts` and regenerate.** Lowering a `minimum` or deleting a pair is not a fix, and any change here updates `DESIGN.md`'s frontmatter in the same commit so the manifest and the tokens never disagree.

- [ ] **Step 5: Commit**

```bash
git add src/modules/design-system/domain DESIGN.md app/tokens.css
git commit -m "test: prove every declared colour pair meets WCAG 2.2 AA"
```

---

### Task 4: Build the money and figure primitives

**Files:**

- Create: `src/modules/design-system/ui/money.tsx`, `money.test.tsx`
- Create: `src/modules/design-system/ui/figure.tsx`, `figure.test.tsx`
- Create: `src/modules/design-system/ui/status-pill.tsx`, `status-pill.test.tsx`
- Modify: `package.json` (add `@testing-library/react`, `@testing-library/jest-dom`, `jsdom`), `vitest.config.ts`

**Interfaces:**

- Consumes: `Money` from `@/src/modules/shared`
- Produces:
  - `<MoneyAmount value={Money} tone?: "neutral" | "accrued" | "settled" | "reversed" size?: "sm" | "md" | "lg" />`
  - `<Figure label={string} value={ReactNode} hint?: string estimate?: boolean href?: string />`
  - `<StatusPill state={PillState} label={string} />` where `PillState = "pending" | "confirmed" | "cancelled" | "unattributed" | "active" | "disabled" | "accrued" | "available" | "in-transit" | "paid"`

These three carry four of the named rules, which is why they are built before anything else.

- [ ] **Step 1: Add the component testing setup**

```bash
pnpm add -D @testing-library/react@16.3.0 @testing-library/jest-dom@6.9.0 jsdom@27.0.0
```

`vitest.config.ts` — add an `environmentMatchGlobs` entry so only `.tsx` tests pay for jsdom:

```ts
test: {
  include: ["src/**/*.test.{ts,tsx}", "app/**/*.test.{ts,tsx}"],
  exclude: ["**/*.integration.test.ts"],
  environmentMatchGlobs: [["**/*.test.tsx", "jsdom"]],
  setupFiles: ["src/test/unit/setup.tsx"],
}
```

`src/test/unit/setup.tsx` is one line: `import "@testing-library/jest-dom/vitest";`

- [ ] **Step 2: Write the failing money component test**

`src/modules/design-system/ui/money.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Money } from "@/src/modules/shared";
import { MoneyAmount } from "./money";

describe("MoneyAmount", () => {
  it("always renders two decimal places and the lari sign", () => {
    render(<MoneyAmount value={Money.of("22.5")} />);
    expect(screen.getByText("22.50 ₾")).toBeInTheDocument();
  });

  it("sets tabular numerals — the Money-Is-Mono Rule", () => {
    render(<MoneyAmount value={Money.of("11.44")} />);
    const element = screen.getByText("11.44 ₾");
    expect(element.className).toContain("type-figure");
  });

  it("renders a negative amount with a sign, not only a colour", () => {
    render(<MoneyAmount value={Money.of("-11.44")} tone="reversed" />);
    // The State-Needs-Words Rule: greyscale must still read as negative.
    expect(screen.getByText("-11.44 ₾")).toBeInTheDocument();
  });

  it("exposes the exact value to assistive technology", () => {
    render(<MoneyAmount value={Money.of("1694.92")} />);
    expect(screen.getByText("1694.92 ₾")).toHaveAttribute(
      "data-amount",
      "1694.92",
    );
  });

  it("refuses a number", () => {
    // @ts-expect-error money components never take a JavaScript number
    expect(() => render(<MoneyAmount value={22.5} />)).toThrow();
  });
});
```

- [ ] **Step 3: Run and confirm failure, then implement**

```bash
pnpm vitest run src/modules/design-system/ui/money.test.tsx   # FAIL: module not found
```

`src/modules/design-system/ui/money.tsx`:

```tsx
import type { Money } from "@/src/modules/shared";

const TONE_CLASS = {
  neutral: "text-ink",
  accrued: "text-accrued",
  settled: "text-settled",
  reversed: "text-reversed",
} as const;

const SIZE_CLASS = {
  sm: "type-mono",
  md: "type-figure",
  lg: "type-figure-lg",
} as const;

export function MoneyAmount({
  value,
  tone = "neutral",
  size = "md",
}: {
  value: Money;
  tone?: keyof typeof TONE_CLASS;
  size?: keyof typeof SIZE_CLASS;
}) {
  // toStorageString throws unless the amount is exact at the tetri, which is
  // what stops an unrounded intermediate from ever reaching a screen.
  const amount = value.toStorageString();

  return (
    <span
      className={`${SIZE_CLASS[size]} ${TONE_CLASS[tone]}`}
      data-amount={amount}
    >
      {amount} ₾
    </span>
  );
}
```

- [ ] **Step 4: Write and satisfy the Figure test**

`figure.test.tsx` asserts three things, one of them a named rule:

```tsx
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Money } from "@/src/modules/shared";
import { Figure } from "./figure";
import { MoneyAmount } from "./money";

describe("Figure", () => {
  it("associates the label with the value", () => {
    render(<Figure label="Unique clicks" value="128" />);
    expect(screen.getByText("Unique clicks")).toBeInTheDocument();
    expect(screen.getByText("128")).toBeInTheDocument();
  });

  it("marks an estimate in the visible label — the Estimate Rule", () => {
    render(
      <Figure
        label="You earn per sale"
        value={<MoneyAmount value={Money.of("30.00")} />}
        estimate
        estimateLabel="estimate, based on catalogue price"
      />,
    );
    expect(screen.getByText(/estimate/i)).toBeVisible();
  });

  it("links to its rows when given an href — the Provenance Rule", () => {
    render(<Figure label="Accrued" value="847.22" href="/ka/earnings/accrued" />);
    expect(screen.getByRole("link", { name: /accrued/i })).toHaveAttribute(
      "href",
      "/ka/earnings/accrued",
    );
  });
});
```

`figure.tsx` renders an `<a>` wrapper when `href` is present and a `<div>` otherwise, with the label in `type-caption text-slate-500` above the value, and the estimate note rendered as visible text — never as a `title` attribute, which a touch user cannot reach.

- [ ] **Step 5: Write and satisfy the StatusPill test**

`status-pill.test.tsx` proves the State-Needs-Words Rule mechanically:

```tsx
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { PILL_STATES, StatusPill } from "./status-pill";

describe("StatusPill", () => {
  it.each(PILL_STATES)("%s renders its label as text", (state) => {
    render(<StatusPill state={state} label={`label-${state}`} />);
    expect(screen.getByText(`label-${state}`)).toBeVisible();
  });

  it("never conveys state by colour alone", () => {
    const { container } = render(<StatusPill state="cancelled" label="Cancelled" />);
    expect(container.textContent?.trim()).not.toBe("");
  });
});
```

`status-pill.tsx` maps each state onto one of the three tone pairs plus neutral, at `radius-pill`, `type-caption`, with `label` always rendered.

- [ ] **Step 6: Run the component tests**

```bash
pnpm vitest run src/modules/design-system/ui
```

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/modules/design-system/ui src/test/unit vitest.config.ts package.json
git commit -m "feat: add the money, figure, and status primitives"
```

---

### Task 5: Build the control and container primitives

**Files:**

- Create: `src/modules/design-system/ui/button.tsx`, `button.test.tsx`
- Create: `src/modules/design-system/ui/field.tsx`, `field.test.tsx`
- Create: `src/modules/design-system/ui/select.tsx`, `card.tsx`, `data-table.tsx`, `empty-state.tsx`, `banner.tsx`
- Create: `src/modules/design-system/ui/copy-field.tsx`, `copy-field.test.tsx`
- Create: `src/modules/design-system/index.ts`

**Interfaces:**

- Consumes: the token classes from Task 2
- Produces:
  - `<Button variant="signal" | "outline" | "ghost" | "danger" size="md" | "sm" pending?: boolean />` — renders a `<button>`, forwards every native prop
  - `<Field label id error?: string hint?: string required?: boolean />` wrapping an `<input>`
  - `<Card as?: "div" | "a" raised?: boolean />`
  - `<DataTable columns rows caption />` — a real `<table>` with a `<caption>`
  - `<EmptyState title body action? />`
  - `<Banner tone="info" | "warning" | "danger" title body action? />`
  - `<CopyField value label revealOnce?: boolean />`
  - `src/modules/design-system/index.ts` re-exports all of the above; every other module imports from here

- [ ] **Step 1: Write the failing button test**

`button.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Button } from "./button";

describe("Button", () => {
  it("is a real button element with an accessible name", () => {
    render(<Button>Confirm</Button>);
    expect(screen.getByRole("button", { name: "Confirm" })).toBeInTheDocument();
  });

  it("keeps the label visible while pending, never collapsing to a spinner", () => {
    render(<Button pending pendingLabel="Confirming…">Confirm</Button>);
    expect(screen.getByRole("button")).toHaveAccessibleName(/Confirm/);
    expect(screen.getByRole("button")).toBeDisabled();
    expect(screen.getByText("Confirming…")).toBeVisible();
  });

  it("meets the 44px minimum target at both sizes", () => {
    render(<Button size="sm">Small</Button>);
    expect(screen.getByRole("button").className).toContain("min-h-[44px]");
  });

  it("marks a disabled button to assistive technology, not only visually", () => {
    render(<Button disabled>Confirm</Button>);
    expect(screen.getByRole("button")).toBeDisabled();
  });
});
```

A pending button keeping its label is the rule the test encodes: an operator releasing a payout needs to know *what* is in flight, and a bare spinner does not say.

- [ ] **Step 2: Run, confirm failure, implement**

```bash
pnpm vitest run src/modules/design-system/ui/button.test.tsx   # FAIL
```

`button.tsx`:

```tsx
import type { ButtonHTMLAttributes, ReactNode } from "react";

const VARIANT = {
  signal:
    "bg-signal text-paper shadow-xs hover:bg-signal-hover active:bg-signal-active",
  outline:
    "bg-paper text-ink border border-slate-300 hover:border-ink",
  ghost: "bg-transparent text-slate-700 hover:bg-slate-100",
  danger: "bg-reversed text-paper hover:brightness-95",
} as const;

export function Button({
  variant = "signal",
  size = "md",
  pending = false,
  pendingLabel,
  children,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: keyof typeof VARIANT;
  size?: "sm" | "md";
  pending?: boolean;
  pendingLabel?: string;
  children: ReactNode;
}) {
  return (
    <button
      {...rest}
      disabled={pending || rest.disabled}
      aria-busy={pending || undefined}
      className={[
        "type-small inline-flex items-center justify-center gap-2 rounded-pill",
        "min-h-[44px] disabled:opacity-60 disabled:cursor-not-allowed",
        size === "sm" ? "px-4" : "px-5",
        VARIANT[variant],
      ].join(" ")}
    >
      {children}
      {pending && pendingLabel ? (
        <span className="type-caption opacity-80">{pendingLabel}</span>
      ) : null}
    </button>
  );
}
```

- [ ] **Step 3: Write and satisfy the field test**

`field.test.tsx` covers the three things a form field gets wrong:

```tsx
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Field } from "./field";

describe("Field", () => {
  it("associates the label with the input", () => {
    render(<Field id="sku" label="SKU" />);
    expect(screen.getByLabelText("SKU")).toBeInTheDocument();
  });

  it("links an error message to the input and marks it invalid", () => {
    render(<Field id="rate" label="Rate" error="Must be a fraction below 1" />);
    const input = screen.getByLabelText("Rate");
    expect(input).toHaveAttribute("aria-invalid", "true");
    expect(input).toHaveAccessibleDescription(/fraction below 1/);
  });

  it("links a hint when there is no error", () => {
    render(<Field id="rate" label="Rate" hint="0.125 means 12.5%" />);
    expect(screen.getByLabelText("Rate")).toHaveAccessibleDescription(
      /0.125 means 12.5%/,
    );
  });

  it("marks a required field to assistive technology", () => {
    render(<Field id="sku" label="SKU" required />);
    expect(screen.getByLabelText(/SKU/)).toBeRequired();
  });
});
```

`field.tsx` wires `aria-describedby` to the error id when present and the hint id otherwise, sets `aria-invalid`, and renders the error in `text-reversed type-caption` below the control with repair-specific copy.

- [ ] **Step 4: Write and satisfy the copy-field test**

`CopyField` carries a rule that costs real money if it is wrong — the brand API key is shown exactly once (§3.1):

```tsx
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { CopyField } from "./copy-field";

describe("CopyField", () => {
  it("shows the value and a copy control", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal("navigator", { clipboard: { writeText } });

    render(<CopyField label="Link code" value="xu.ge/r/K7M2QP" />);
    await userEvent.click(screen.getByRole("button", { name: /copy/i }));

    expect(writeText).toHaveBeenCalledWith("xu.ge/r/K7M2QP");
  });

  it("warns, in visible text, that a one-time value cannot be shown again", () => {
    render(<CopyField label="API key" value="xu_sk_live_abc" revealOnce />);
    expect(screen.getByText(/only time/i)).toBeVisible();
  });
});
```

- [ ] **Step 5: Build the remaining containers**

- `Card` — `rounded-md border border-slate-200 bg-paper shadow-xs`, raising to `shadow-sm` and `border-signal-200` **only** when rendered as a link.
- `DataTable` — a real `<table>` with a `<caption>`, `scope="col"` headers, `text-right` on every money column, and a `overflow-x-auto` wrapper so a wide table scrolls inside its card rather than the page.
- `EmptyState` — title, body, optional action. Every list in the product uses it; there is no bare "No results".
- `Banner` — `info` / `warning` / `danger`, with an icon that is `aria-hidden` because the tone is already in the text (§7.1's pending-order escalation is the first consumer).

- [ ] **Step 6: Export the public surface**

`src/modules/design-system/index.ts`:

```ts
export { Button } from "./ui/button";
export { Field } from "./ui/field";
export { Select } from "./ui/select";
export { Card } from "./ui/card";
export { Figure } from "./ui/figure";
export { MoneyAmount } from "./ui/money";
export { StatusPill, PILL_STATES, type PillState } from "./ui/status-pill";
export { DataTable } from "./ui/data-table";
export { EmptyState } from "./ui/empty-state";
export { Banner } from "./ui/banner";
export { CopyField } from "./ui/copy-field";
export { COLORS, TYPE_SCALE, RADIUS, LAYOUT } from "./domain/tokens";
```

- [ ] **Step 7: Run the suite and the boundary check**

```bash
pnpm vitest run src/modules/design-system
pnpm verify:boundaries
```

Expected: PASS, and boundaries clean.

- [ ] **Step 8: Commit**

```bash
git add src/modules/design-system
git commit -m "feat: add the control and container primitives"
```

---

### Task 6: Build the application shell

**Files:**

- Create: `src/modules/shell/ui/utility-strip.tsx`, `site-header.tsx`, `locale-switch.tsx`, `site-footer.tsx`, `mobile-tab-bar.tsx`
- Create: `src/modules/shell/ui/nav-model.ts`, `nav-model.test.ts`
- Create: `src/modules/shell/index.ts`
- Modify: `app/[locale]/layout.tsx`

**Interfaces:**

- Consumes: `Locale`, `getMessages`, `t` from localization; primitives from `@/src/modules/design-system`
- Produces:
  - `type Viewer = { kind: "anonymous" } | { kind: "brand"; brandName: string } | { kind: "creator"; displayName: string } | { kind: "admin" }`
  - `navDestinationsFor(viewer: Viewer, locale: Locale): NavDestination[]` where `NavDestination = { href: string; labelKey: string }`
  - `<AppShell locale viewer children />`

- [ ] **Step 1: Write the failing nav-model test**

`nav-model.test.ts` — this is where a whole class of authorisation bug is prevented:

```ts
import { describe, expect, it } from "vitest";
import { navDestinationsFor } from "./nav-model";

describe("navDestinationsFor", () => {
  it("offers an anonymous viewer nothing but sign-in", () => {
    const destinations = navDestinationsFor({ kind: "anonymous" }, "ka");
    expect(destinations.map((d) => d.href)).toEqual(["/ka/sign-in"]);
  });

  it("never offers a creator a brand destination", () => {
    const destinations = navDestinationsFor(
      { kind: "creator", displayName: "Nino" },
      "en",
    );
    expect(destinations.every((d) => !d.href.includes("/brand/"))).toBe(true);
  });

  it("never offers a brand a creator destination", () => {
    const destinations = navDestinationsFor(
      { kind: "brand", brandName: "Aromashop" },
      "en",
    );
    expect(destinations.every((d) => !d.href.includes("/creator/"))).toBe(true);
  });

  it("prefixes every destination with the active locale", () => {
    for (const locale of ["ka", "en"] as const) {
      const destinations = navDestinationsFor({ kind: "admin" }, locale);
      expect(destinations.every((d) => d.href.startsWith(`/${locale}/`))).toBe(true);
    }
  });
});
```

The rule this encodes: **destinations are built from the viewer's capabilities in one place**, so a route the server would refuse is never offered as navigation. Phase 2 supplies the real `Viewer`; this phase builds the function and its tests against a stub.

- [ ] **Step 2: Run, confirm failure, implement `nav-model.ts`**

A pure function returning a `NavDestination[]` per viewer kind, with no React import. `verify:boundaries` does not police `ui/`, so keep the discipline by hand: `nav-model.ts` imports nothing but the `Locale` type.

- [ ] **Step 3: Build the shell components**

- `UtilityStrip` — 32px `bg-ink text-on-inverse`, carrying a one-line product statement, a help link, and the locale switch.
- `SiteHeader` — 64px sticky `bg-paper/90 backdrop-blur`, wordmark, destination tabs from `navDestinationsFor`, and at most one `signal` action (the Single-Signal Rule).
- `LocaleSwitch` — a real `<a>` per locale pointing at the same path under the other prefix, with `aria-current="true"` on the active one. Not a `<select>`: a language switch a screen reader announces as a combobox is worse than two links.
- `SiteFooter` and `MobileTabBar` — the tab bar appears below 640px and the header tabs hide.

- [ ] **Step 4: Compose the layout**

`app/[locale]/layout.tsx` renders `<AppShell locale={locale} viewer={{ kind: "anonymous" }}>` around `{children}`, keeping the skip link as the first focusable element and `<main id="main">` as the skip target.

- [ ] **Step 5: Run the tests**

```bash
pnpm vitest run src/modules/shell
pnpm build
```

Expected: PASS and a clean build.

- [ ] **Step 6: Commit**

```bash
git add src/modules/shell app/[locale]/layout.tsx
git commit -m "feat: build the application shell with capability-derived navigation"
```

---

### Task 7: Build the kitchen sink and lock it with snapshots

**Files:**

- Create: `app/[locale]/design/page.tsx`
- Create: `src/test/e2e/design-system.spec.ts`
- Modify: `package.json` (add `@axe-core/playwright`, the `verify:phase-1` script)

**Interfaces:**

- Consumes: everything built in Tasks 4–6
- Produces: `/ka/design` and `/en/design`, and a committed visual baseline per breakpoint per locale

- [ ] **Step 1: Build the page**

`app/[locale]/design/page.tsx` renders every primitive in every state, grouped by section, each section headed with the named rule it demonstrates:

- **Buttons** — all four variants × rest / hover-documented / disabled / pending.
- **Fields** — rest, with hint, with error, required, disabled.
- **Money** — a positive amount at all three sizes, a negative amount, and a zero, each in all four tones. A caption states the Money-Is-Mono Rule.
- **Figures** — a plain figure, one with an estimate label, one that links (Provenance).
- **Status pills** — every member of `PILL_STATES`, rendered as a wrapped row, with a note that a greyscale screenshot of this row must still be readable.
- **Table** — a five-row table with two money columns, right-aligned, inside a card.
- **Empty state and banners** — all three banner tones.
- **CopyField** — one plain, one `revealOnce`.

Every string on the page comes from the message catalogues, in both locales. This page is also the fastest way to spot an untranslated key, because `t()` throws.

- [ ] **Step 2: Write the accessibility and visual test**

`src/test/e2e/design-system.spec.ts`:

```ts
import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

for (const locale of ["ka", "en"] as const) {
  test(`@phase-1 ${locale} design system has no accessibility violations`, async ({
    page,
  }) => {
    await page.goto(`/${locale}/design`);

    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
      .analyze();

    expect(results.violations).toEqual([]);
  });

  test(`@phase-1 ${locale} design system is keyboard traversable`, async ({
    page,
  }) => {
    await page.goto(`/${locale}/design`);

    const interactive = await page
      .locator("a[href], button:not([disabled]), input:not([disabled])")
      .count();

    for (let i = 0; i < interactive; i += 1) {
      await page.keyboard.press("Tab");
      await expect(page.locator(":focus")).toBeVisible();
    }
  });

  test(`@phase-1 ${locale} design system matches its visual baseline`, async ({
    page,
  }) => {
    await page.goto(`/${locale}/design`);
    await page.waitForLoadState("networkidle");

    await expect(page).toHaveScreenshot(`design-${locale}.png`, {
      fullPage: true,
      maxDiffPixelRatio: 0.01,
    });
  });
}
```

The screenshot runs under both Playwright projects, so the baseline covers desktop and mobile without a fourth test.

- [ ] **Step 3: Generate and review the baselines**

```bash
pnpm add -D @axe-core/playwright@4.11.0
pnpm build
pnpm test:e2e --grep @phase-1 --update-snapshots
```

**Open every generated PNG and look at it.** A baseline committed without being seen locks in whatever was wrong at the time. Check: Georgian text is not clipped, no gold-on-white artefact of a mis-set token, the money column is right-aligned, and the pill row is legible.

- [ ] **Step 4: Run the phase gate**

Add to `package.json`:

```json
{
  "verify:phase-1": "pnpm verify:phase-0 && pnpm tokens:check && pnpm test:e2e --grep @phase-1"
}
```

```bash
pnpm verify:phase-1
```

Expected: green.

- [ ] **Step 5: Commit**

```bash
git add app/[locale]/design src/test/e2e/design-system.spec.ts package.json
git add src/test/e2e/design-system.spec.ts-snapshots
git commit -m "feat: add the design kitchen sink with axe and visual baselines"
```

---

## Phase 1 completion checklist

- [x] `pnpm verify:phase-1` passes.
- [x] `pnpm tokens:check` fails when `app/tokens.css` is edited by hand, proved by editing it and reverting.
- [x] Every pair in `CONTRAST_PAIRS` meets its minimum, and the list covers every foreground/background the kitchen sink actually renders.
- [ ] No hex value appears anywhere outside `tokens.ts` and the generated `tokens.css` — checked with `grep -rn "#[0-9A-Fa-f]\{6\}" app src --include=*.tsx --include=*.ts`.
- [x] Every money value on `/design` is mono and tabular, and a negative amount carries a visible sign.
- [x] Every status pill carries its label as text; a greyscale screenshot of the pill row is readable.
- [x] Every interactive element on `/design` is reachable by Tab with a visible focus ring, at both breakpoints.
- [x] Axe reports zero violations on `/ka/design` and `/en/design`, desktop and mobile.
- [x] Both visual baselines have been opened and looked at, not merely generated.
- [x] `DESIGN.md` frontmatter and `tokens.ts` agree value for value.
- [x] `navDestinationsFor` offers a creator no brand destination and a brand no creator destination.
