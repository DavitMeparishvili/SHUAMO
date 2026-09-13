import type { Viewer } from "@/src/modules/identity";
import { isLocale } from "@/src/modules/localization";
import type { FinanceReads } from "../ports/finance-repository";
import { readFinanceInvoice } from "../application/read-finance";
import { invoiceHtml } from "../ui/invoice-html";
export function createInvoiceDownload(deps: {
  viewer: () => Promise<Viewer>;
  reads: FinanceReads;
}) {
  return async (request: Request, id: string) => {
    const locale = new URL(request.url).searchParams.get("locale") || "en";
    if (!isLocale(locale))
      return new Response("Invalid locale", {
        status: 400,
        headers: { "Cache-Control": "private, no-store" },
      });
    const result = await readFinanceInvoice(deps.reads)(
      await deps.viewer(),
      id,
    );
    if (!result.ok)
      return new Response("Not found", {
        status: result.error === "unauthenticated" ? 401 : 404,
        headers: { "Cache-Control": "private, no-store" },
      });
    return new Response(invoiceHtml(result.value, locale), {
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Content-Disposition": `attachment; filename="${result.value.number}.html"`,
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
        "Content-Security-Policy":
          "default-src 'none'; style-src 'unsafe-inline'; base-uri 'none'; frame-ancestors 'none'",
      },
    });
  };
}
