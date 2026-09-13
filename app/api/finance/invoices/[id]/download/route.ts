import { currentViewer } from "@/src/modules/identity";
import {
  createInvoiceDownload,
  prismaFinanceReads,
} from "@/src/modules/finance";
const download = createInvoiceDownload({
  viewer: currentViewer,
  reads: prismaFinanceReads,
});
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  return download(request, (await params).id);
}
