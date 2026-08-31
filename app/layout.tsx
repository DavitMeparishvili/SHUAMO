import type { ReactNode } from "react";
import "./globals.css";

// The locale segment owns <html lang>, so the root layout is a pass-through.
// Anything rendered outside a locale segment — app/not-found.tsx — supplies its
// own document.
export default function RootLayout({ children }: { children: ReactNode }) {
  return children;
}
