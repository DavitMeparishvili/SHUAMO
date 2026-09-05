import type { SVGProps } from "react";
export function XurjinLogo() {
  return (
    <span className="xurjin-logo">
      <svg viewBox="0 0 44 44" aria-hidden="true">
        <path
          d="M7 5h5l25 31-5 3L7 8Z"
          fill="none"
          stroke="#19c3f6"
          strokeWidth="3"
          strokeLinejoin="round"
        />
        <path
          d="M35 5h4L12 38H5L32 7Z"
          fill="#4778ff"
          stroke="#4778ff"
          strokeWidth="2"
          strokeLinejoin="round"
        />
        <path
          d="m26 26 11 12h-7l-8-9"
          fill="none"
          stroke="#9751ff"
          strokeWidth="3"
          strokeLinejoin="round"
        />
      </svg>
      <span>Xurjin</span>
    </span>
  );
}
const paths = {
  eye: "M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12ZM15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0",
  edit: "m15 4 5 5M3 21l5-1L21 7l-5-5L3 15ZM3 21h18",
  pin: "M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 1 1 16 0ZM15 10a3 3 0 1 1-6 0 3 3 0 0 1 6 0",
  image: "M3 3h18v18H3ZM3 17l6-7 5 5 3-3 4 5M16 7h.01",
  crop: "M6 2v16h16M2 6h16v16",
  lock: "M5 10h14v12H5ZM8 10V6a4 4 0 0 1 8 0v4M12 14v4",
  chevron: "m8 4 8 8-8 8",
  instagram:
    "M7 2h10a5 5 0 0 1 5 5v10a5 5 0 0 1-5 5H7a5 5 0 0 1-5-5V7a5 5 0 0 1 5-5ZM16 12a4 4 0 1 1-8 0 4 4 0 0 1 8 0M18 6h.01",
  youtube: "M3 5h18v14H3ZM10 8l6 4-6 4Z",
  tiktok: "M14 3v13a5 5 0 1 1-5-5M14 3c0 5 4 6 7 6",
  home: "m3 10 9-7 9 7M5 9v11h5v-6h4v6h5V9",
  search: "M21 21l-5-5M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0",
  shop: "M4 10v11h16V10M3 10l2-7h14l2 7M3 10c0 4 5 4 5 0 0 4 8 4 8 0 0 4 5 4 5 0M9 21v-7h6v7",
  users:
    "M16 21v-3a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v3M9 10a4 4 0 1 0 0-8 4 4 0 0 0 0 8M18 3a4 4 0 0 1 0 8M22 21v-3a4 4 0 0 0-3-4",
  user: "M20 21v-2a7 7 0 0 0-14 0v2M13 10a4 4 0 1 0 0-8 4 4 0 0 0 0 8",
  chart: "M4 21V11h3v10M11 21V3h3v18M18 21V7h3v14",
  link: "m10 13 4-4M9 15l-2 2a4 4 0 0 1-5-5l5-5a4 4 0 0 1 6 0M15 9l2-2a4 4 0 0 0-5-5M11 17a4 4 0 0 0 6 0l5-5a4 4 0 0 0-5-5",
  box: "m3 7 9-5 9 5v11l-9 4-9-4ZM3 7l9 5 9-5M12 12v10M8 4l9 5",
  bell: "M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4",
  help: "M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20M9 8a3 3 0 1 1 4 3c-1 1-1 2-1 3M12 17h.01",
  settings:
    "M9 3h6l1 3 3 1 2 5-2 5-3 1-1 3H9l-1-3-3-1-2-5 2-5 3-1ZM16 12a4 4 0 1 1-8 0 4 4 0 0 1 8 0",
  arrow: "M4 12h16M14 6l6 6-6 6",
  mail: "M3 4h18v16H3ZM3 5l9 8 9-8",
  menu: "M3 6h18M3 12h18M3 18h18",
  close: "m5 5 14 14M5 19 19 5",
  wallet: "M21 8V4H3v16h18V8H3M21 11h-6v6h6M17 14h.1",
  click: "m4 2 16 10-8 1-4 7ZM12 13l6 8",
  cart: "M2 3h3l3 13h11l3-10H6M9 21h.1M18 21h.1",
  shield: "M12 2 3 6v6c0 5 9 10 9 10s9-5 9-10V6ZM8 12l3 3 5-6",
  check: "m5 12 4 4L20 5",
  calendar: "M4 5h16v16H4ZM4 10h16M8 2v6M16 2v6",
  logout: "M9 3H3v18h6M8 12h14M17 7l5 5-5 5",
  play: "m8 4 12 8-12 8Z",
} as const;
export type IconName = keyof typeof paths;
export function Icon({
  name,
  ...props
}: SVGProps<SVGSVGElement> & { name: IconName }) {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      <path d={paths[name]} />
    </svg>
  );
}
