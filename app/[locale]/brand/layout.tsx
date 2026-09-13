import type { ReactNode } from "react";
export default function BrandLayout({ children, panel }: { children: ReactNode; panel: ReactNode }) { return <>{children}{panel}</>; }
