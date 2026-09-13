import { CreatorsRoute } from "../../../../products/creators-route";
import type { PerformanceSearchParams } from "@/src/modules/conversions";
export default function CreatorPanel(props: { params: Promise<{ locale: string; id: string }>; searchParams: Promise<PerformanceSearchParams> }) { return <CreatorsRoute {...props} drawer/>; }
