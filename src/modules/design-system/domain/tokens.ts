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
  "slate-200": "#8E95A3",
  "slate-300": "#858C99",
  "slate-400": "#7F8694",
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
  "focus-ring": "rgb(68 54 245 / 0.28)",
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
  display: {
    fontFamily: TEXT,
    fontSize: "48px",
    fontWeight: 700,
    lineHeight: 1.05,
    letterSpacing: "-0.03em",
  },
  h1: {
    fontFamily: TEXT,
    fontSize: "34px",
    fontWeight: 700,
    lineHeight: 1.1,
    letterSpacing: "-0.025em",
  },
  h2: {
    fontFamily: TEXT,
    fontSize: "26px",
    fontWeight: 650,
    lineHeight: 1.2,
    letterSpacing: "-0.02em",
  },
  h3: {
    fontFamily: TEXT,
    fontSize: "20px",
    fontWeight: 650,
    lineHeight: 1.3,
    letterSpacing: "-0.01em",
  },
  body: {
    fontFamily: TEXT,
    fontSize: "16px",
    fontWeight: 400,
    lineHeight: 1.6,
  },
  small: {
    fontFamily: TEXT,
    fontSize: "14px",
    fontWeight: 450,
    lineHeight: 1.5,
  },
  caption: {
    fontFamily: TEXT,
    fontSize: "12px",
    fontWeight: 500,
    lineHeight: 1.4,
  },
  overline: {
    fontFamily: TEXT,
    fontSize: "11px",
    fontWeight: 700,
    lineHeight: 1.3,
    letterSpacing: "0.12em",
  },
  "figure-lg": {
    fontFamily: MONO,
    fontSize: "28px",
    fontWeight: 600,
    lineHeight: 1.1,
    fontVariantNumeric: "tabular-nums",
  },
  figure: {
    fontFamily: MONO,
    fontSize: "20px",
    fontWeight: 600,
    lineHeight: 1.2,
    fontVariantNumeric: "tabular-nums",
  },
  mono: {
    fontFamily: MONO,
    fontSize: "14px",
    fontWeight: 500,
    lineHeight: 1.5,
    fontVariantNumeric: "tabular-nums",
  },
} as const satisfies Record<string, TypeStyle>;

export type TypeToken = keyof typeof TYPE_SCALE;

export const RADIUS = {
  xs: "4px",
  sm: "8px",
  md: "12px",
  lg: "20px",
  pill: "999px",
} as const;

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

/** Every foreground/background combination rendered by the component kit. */
export const CONTRAST_PAIRS = [
  {
    name: "signal button rest",
    foreground: "paper",
    background: "signal",
    minimum: 4.5,
  },
  {
    name: "signal button hover",
    foreground: "paper",
    background: "signal-hover",
    minimum: 4.5,
  },
  {
    name: "signal button active",
    foreground: "paper",
    background: "signal-active",
    minimum: 4.5,
  },
  {
    name: "outline button rest",
    foreground: "ink",
    background: "paper",
    minimum: 4.5,
  },
  {
    name: "body text on paper",
    foreground: "slate-700",
    background: "paper",
    minimum: 4.5,
  },
  {
    name: "muted text on paper",
    foreground: "slate-500",
    background: "paper",
    minimum: 4.5,
  },
  {
    name: "body text on slate-50",
    foreground: "slate-700",
    background: "slate-50",
    minimum: 4.5,
  },
  {
    name: "accrued pill",
    foreground: "accrued",
    background: "accrued-soft",
    minimum: 4.5,
  },
  {
    name: "settled pill",
    foreground: "settled",
    background: "settled-soft",
    minimum: 4.5,
  },
  {
    name: "reversed pill",
    foreground: "reversed",
    background: "reversed-soft",
    minimum: 4.5,
  },
  {
    name: "utility strip",
    foreground: "on-inverse",
    background: "ink",
    minimum: 4.5,
  },
  {
    name: "link on paper",
    foreground: "signal",
    background: "paper",
    minimum: 4.5,
  },
  {
    name: "hairline on paper",
    foreground: "slate-200",
    background: "paper",
    minimum: 3,
  },
  {
    name: "interactive border on paper",
    foreground: "slate-300",
    background: "paper",
    minimum: 3,
  },
] as const satisfies readonly {
  name: string;
  foreground: ColorToken;
  background: ColorToken;
  minimum: 3 | 4.5;
}[];
