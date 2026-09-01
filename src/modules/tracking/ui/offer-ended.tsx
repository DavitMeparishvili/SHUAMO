import type { DisableReason } from "@/src/modules/partnerships";

export function OfferEnded({
  title,
  intro,
  reason,
  note,
}: {
  title: string;
  intro: string;
  reason: { code: DisableReason; message: string };
  note: string;
}) {
  return (
    <section className="relative isolate flex min-h-[62vh] items-center overflow-hidden bg-slate-50 px-4 py-16 sm:px-6 sm:py-24 lg:px-8">
      <div
        aria-hidden="true"
        className="absolute inset-y-0 right-[12%] -z-10 w-px bg-slate-100"
      />
      <div className="mx-auto grid w-full max-w-[960px] gap-10 md:grid-cols-[minmax(0,1.4fr)_minmax(260px,0.6fr)] md:items-end md:gap-16">
        <div>
          <div aria-hidden="true" className="mb-8 flex items-center gap-3">
            <span className="h-3 w-3 rounded-full bg-signal" />
            <span className="h-px w-20 bg-signal-200" />
          </div>
          <h1 className="m-0 max-w-[16ch] text-balance type-display text-ink">
            {title}
          </h1>
          <p className="mb-0 mt-6 max-w-[58ch] text-pretty text-lg leading-8 text-slate-600">
            {intro}
          </p>
        </div>

        <div className="border-t border-slate-300 pt-6">
          <p className="m-0 text-balance type-h3 text-ink">{reason.message}</p>
          <p className="mb-0 mt-4 text-pretty type-small text-slate-600">
            {note}
          </p>
          <span className="sr-only">{reason.code}</span>
        </div>
      </div>
    </section>
  );
}
