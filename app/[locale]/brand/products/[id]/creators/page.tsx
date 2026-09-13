import { CreatorsRoute } from "../../creators-route";
import type { PerformanceSearchParams } from "@/src/modules/conversions";
export default function ProductCreatorsPage(props: { params: Promise<{ locale: string; id: string }>; searchParams: Promise<PerformanceSearchParams> }) { return <CreatorsRoute {...props}/>; }
