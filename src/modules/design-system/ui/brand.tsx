import { useId, type SVGProps } from "react";
export function XurjinLogo() {
  const gradientId = useId();
  return (
    <span className="xurjin-logo" role="img" aria-label="Xurjin">
      <svg viewBox="0 0 100 100" aria-hidden="true" focusable="false">
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="1" y2=".8">
            <stop stopColor="#20C4EA" />
            <stop offset=".55" stopColor="#2460F5" />
            <stop offset="1" stopColor="#8545F7" />
          </linearGradient>
        </defs>
        <path
          d="M13 14H39L50 33L61 14H87L63 50L87 86H61L50 67L39 86H13L37 50Z"
          fill={`url(#${gradientId})`}
        />
      </svg>
      <span>
        <svg
          className="xurjin-wordmark"
          viewBox="122 0 246 100"
          aria-hidden="true"
          focusable="false"
        >
          <g
            fill="currentColor"
            transform="translate(122 76) scale(.086 -.086)"
          >
            <path
              transform="translate(0 0)"
              d="M419 372 644 729H470L336 489L208 729H30L252 367L22 0H196L335 253L475 0H653Z"
            />
            <path
              transform="translate(655 0)"
              d="M541 0V540H401V202C401 138 357 96 288 96C228 96 198 128 198 193V540H58V164C58 44 123 -23 239 -23C312 -23 361 3 401 64V0Z"
            />
            <path
              transform="translate(1254 0)"
              d="M63 540V0H203V287C203 369 244 410 326 410C341 410 351 409 370 406V548C362 549 359 549 353 549C289 549 234 507 203 434V540Z"
            />
            <path
              transform="translate(1631 0)"
              d="M210 540H70V-63C70 -94 59 -105 29 -105C20 -105 13 -104 4 -101V-213C31 -216 65 -218 87 -218C174 -218 210 -182 210 -94ZM210 729H70V604H210Z"
            />
            <path
              transform="translate(1897 0)"
              d="M207 540H67V0H207ZM207 729H67V604H207Z"
            />
            <path
              transform="translate(2163 0)"
              d="M63 540V0H203V324C203 388 247 430 316 430C376 430 406 397 406 333V0H546V362C546 482 481 549 365 549C292 549 243 523 203 462V540Z"
            />
          </g>
        </svg>
      </span>
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
  facebook: "M17 3h-3a4 4 0 0 0-4 4v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3Z",
  globe:
    "M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20M2 12h20M12 2a15 15 0 0 1 0 20M12 2a15 15 0 0 0 0 20",
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
