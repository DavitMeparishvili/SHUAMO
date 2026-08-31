import { notFound } from "next/navigation";
import {
  Banner,
  Button,
  Card,
  CopyField,
  DataTable,
  EmptyState,
  Field,
  Figure,
  MoneyAmount,
  PILL_STATES,
  Select,
  StatusPill,
  type PillState,
} from "@/src/modules/design-system";
import { getMessages, isLocale, t } from "@/src/modules/localization";
import { Money } from "@/src/modules/shared";

const PILL_KEYS: Record<PillState, string> = {
  pending: "design.status.pending",
  confirmed: "design.status.confirmed",
  cancelled: "design.status.cancelled",
  unattributed: "design.status.unattributed",
  active: "design.status.active",
  disabled: "design.status.disabled",
  accrued: "design.status.accrued",
  available: "design.status.available",
  "in-transit": "design.status.inTransit",
  paid: "design.status.paid",
};

function Section({
  title,
  rule,
  children,
}: {
  title: string;
  rule: string;
  children: React.ReactNode;
}) {
  return (
    <section className="border-t border-slate-200 py-12 first:border-t-0">
      <div className="mb-8 grid gap-3 min-[800px]:grid-cols-[minmax(0,1fr)_minmax(260px,0.55fr)] min-[800px]:items-end">
        <h2 className="m-0 type-h2 text-ink">{title}</h2>
        <p className="m-0 max-w-[54ch] type-small text-slate-600 min-[800px]:justify-self-end min-[800px]:text-right">
          {rule}
        </p>
      </div>
      {children}
    </section>
  );
}

export default async function DesignSystemPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();

  const messages = getMessages(locale);
  const translate = (key: string) => t(messages, key);
  const tableRows = [
    {
      order: "#1234",
      creator: translate("design.table.creator1"),
      net: <MoneyAmount size="sm" value={Money.of("190.68")} />,
      commission: (
        <MoneyAmount size="sm" tone="settled" value={Money.of("11.44")} />
      ),
    },
    {
      order: "#1235",
      creator: translate("design.table.creator2"),
      net: <MoneyAmount size="sm" value={Money.of("1694.92")} />,
      commission: (
        <MoneyAmount size="sm" tone="accrued" value={Money.of("25.43")} />
      ),
    },
    {
      order: "#1236",
      creator: translate("design.table.creator3"),
      net: <MoneyAmount size="sm" value={Money.of("80.00")} />,
      commission: (
        <MoneyAmount size="sm" tone="settled" value={Money.of("9.60")} />
      ),
    },
    {
      order: "#1237",
      creator: translate("design.table.creator1"),
      net: <MoneyAmount size="sm" value={Money.of("249.00")} />,
      commission: (
        <MoneyAmount size="sm" tone="reversed" value={Money.of("-29.88")} />
      ),
    },
    {
      order: "#1238",
      creator: translate("design.table.creator2"),
      net: <MoneyAmount size="sm" value={Money.of("75.50")} />,
      commission: (
        <MoneyAmount size="sm" tone="accrued" value={Money.of("9.06")} />
      ),
    },
  ];

  const tones = ["neutral", "accrued", "settled", "reversed"] as const;

  return (
    <div className="mx-auto max-w-[var(--layout-column)] px-[var(--layout-gutter)] max-[1179px]:px-[var(--layout-gutter-md)] max-[639px]:px-[var(--layout-gutter-sm)]">
      <header className="grid gap-8 py-16 min-[900px]:grid-cols-[minmax(0,1fr)_360px] min-[900px]:items-end">
        <div>
          <h1 className="m-0 max-w-[14ch] text-balance type-display text-ink">
            {translate("design.title")}
          </h1>
          <p className="mb-0 mt-6 max-w-[68ch] text-slate-600">
            {translate("design.intro")}
          </p>
        </div>
        <div className="rounded-md bg-ink p-6 text-on-inverse shadow-sm">
          <p className="m-0 type-small font-semibold">
            {translate("design.provenanceQuestion")}
          </p>
          <p className="mb-0 mt-3 type-caption text-on-inverse">
            {translate("design.provenanceAnswer")}
          </p>
        </div>
      </header>

      <Section
        title={translate("design.section.buttons")}
        rule={translate("design.rule.singleSignal")}
      >
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
          {(["signal", "outline", "ghost", "danger"] as const).map(
            (variant) => (
              <Card className="grid content-start gap-4" key={variant}>
                <h3 className="m-0 type-h3 text-ink">
                  {translate(`design.button.${variant}`)}
                </h3>
                <Button variant={variant}>
                  {translate("design.action.confirm")}
                </Button>
                <p className="m-0 type-caption text-slate-600">
                  {translate("design.state.hover")}
                </p>
                <Button disabled variant={variant}>
                  {translate("design.state.disabled")}
                </Button>
                <Button
                  pending
                  pendingLabel={translate("design.state.pending")}
                  variant={variant}
                >
                  {translate("design.action.confirm")}
                </Button>
              </Card>
            ),
          )}
        </div>
      </Section>

      <Section
        title={translate("design.section.fields")}
        rule={translate("design.rule.equalScript")}
      >
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          <Field id="field-rest" label={translate("design.field.sku")} />
          <Field
            id="field-hint"
            label={translate("design.field.rate")}
            hint={translate("design.field.rateHint")}
          />
          <Field
            id="field-error"
            label={translate("design.field.destination")}
            error={translate("design.field.destinationError")}
            defaultValue="shop.example"
          />
          <Field
            id="field-required"
            label={translate("design.field.product")}
            required
          />
          <Field
            id="field-disabled"
            label={translate("design.field.brand")}
            defaultValue="Aromashop"
            disabled
          />
          <Select
            id="field-select"
            label={translate("design.field.commissionType")}
            defaultValue="percent"
          >
            <option value="percent">{translate("design.field.percent")}</option>
            <option value="fixed">{translate("design.field.fixed")}</option>
          </Select>
        </div>
      </Section>

      <Section
        title={translate("design.section.money")}
        rule={translate("design.rule.moneyMono")}
      >
        <div className="grid gap-5 lg:grid-cols-3">
          {(["sm", "md", "lg"] as const).map((size) => (
            <Card key={size}>
              <p className="mb-4 mt-0 type-caption text-slate-600">
                {translate(`design.money.size.${size}`)}
              </p>
              <MoneyAmount size={size} value={Money.of("1694.92")} />
            </Card>
          ))}
        </div>
        <div className="mt-5 grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
          {tones.map((tone) => (
            <Card className="grid gap-5" key={tone}>
              <h3 className="m-0 type-small font-bold text-ink">
                {translate(`design.money.tone.${tone}`)}
              </h3>
              <MoneyAmount tone={tone} value={Money.of("250.00")} />
              <MoneyAmount tone={tone} value={Money.of("-11.44")} />
              <MoneyAmount tone={tone} value={Money.ZERO} />
            </Card>
          ))}
        </div>
      </Section>

      <Section
        title={translate("design.section.figures")}
        rule={translate("design.rule.provenance")}
      >
        <div className="grid gap-5 md:grid-cols-3">
          <Card>
            <Figure label={translate("design.figure.unique")} value="128" />
          </Card>
          <Card>
            <Figure
              estimate
              estimateLabel={translate("design.figure.estimateNote")}
              label={translate("design.figure.estimate")}
              value={<MoneyAmount value={Money.of("30.00")} />}
            />
          </Card>
          <Figure
            href={`/${locale}/design#table`}
            label={translate("design.figure.accrued")}
            value={<MoneyAmount tone="accrued" value={Money.of("847.22")} />}
          />
        </div>
      </Section>

      <Section
        title={translate("design.section.status")}
        rule={translate("design.rule.stateWords")}
      >
        <Card>
          <div className="flex flex-wrap gap-3">
            {PILL_STATES.map((state) => (
              <StatusPill
                key={state}
                label={translate(PILL_KEYS[state])}
                state={state}
              />
            ))}
          </div>
          <p className="mb-0 mt-5 type-small text-slate-600">
            {translate("design.status.greyscale")}
          </p>
        </Card>
      </Section>

      <Section
        title={translate("design.section.table")}
        rule={translate("design.rule.table")}
      >
        <Card className="p-4 sm:p-6">
          <div id="table">
            <DataTable
              caption={translate("design.table.caption")}
              columns={[
                { key: "order", label: translate("design.table.order") },
                { key: "creator", label: translate("design.table.creator") },
                {
                  key: "net",
                  label: translate("design.table.net"),
                  align: "right",
                },
                {
                  key: "commission",
                  label: translate("design.table.commission"),
                  align: "right",
                },
              ]}
              rowKey="order"
              rows={tableRows}
            />
          </div>
        </Card>
      </Section>

      <Section
        title={translate("design.section.feedback")}
        rule={translate("design.rule.feedback")}
      >
        <div className="grid gap-5 lg:grid-cols-2">
          <Card>
            <EmptyState
              title={translate("design.empty.title")}
              body={translate("design.empty.body")}
              action={
                <Button variant="outline">
                  {translate("design.empty.action")}
                </Button>
              }
            />
          </Card>
          <div className="grid gap-4">
            <Banner
              tone="info"
              title={translate("design.banner.infoTitle")}
              body={translate("design.banner.infoBody")}
            />
            <Banner
              tone="warning"
              title={translate("design.banner.warningTitle")}
              body={translate("design.banner.warningBody")}
            />
            <Banner
              tone="danger"
              title={translate("design.banner.dangerTitle")}
              body={translate("design.banner.dangerBody")}
            />
          </div>
        </div>
      </Section>

      <Section
        title={translate("design.section.copy")}
        rule={translate("design.rule.copy")}
      >
        <div className="grid gap-5 lg:grid-cols-2">
          <Card>
            <CopyField
              copiedLabel={translate("design.copy.copied")}
              copyLabel={translate("design.copy.copy")}
              label={translate("design.copy.link")}
              value="xu.ge/r/K7M2QP"
            />
          </Card>
          <Card>
            <CopyField
              copiedLabel={translate("design.copy.copied")}
              copyLabel={translate("design.copy.copy")}
              label={translate("design.copy.apiKey")}
              oneTimeWarning={translate("design.copy.once")}
              revealOnce
              value="xu_sk_live_7Q4M"
            />
          </Card>
        </div>
      </Section>
    </div>
  );
}
