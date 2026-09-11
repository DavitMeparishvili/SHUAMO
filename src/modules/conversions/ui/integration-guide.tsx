import type { ReactNode } from "react";
import Link from "next/link";
import type { Locale } from "@/src/modules/localization";
import type { IntegrationRequestView } from "../ports/integration-request";
import { integrationCopy } from "./integration-copy";
import {
  captureExample,
  examplePayload,
  requestExamples,
  responseExample,
} from "./integration-examples";
import {
  CodeExample,
  IntegrationValidator,
  RefreshRequests,
} from "./integration-tools";
import { integrationStyles as styles } from "./integration-styles";

export function IntegrationGuide({
  locale,
  apiBase,
  credentials,
  requests,
}: {
  locale: Locale;
  apiBase: string;
  credentials: ReactNode;
  requests: IntegrationRequestView[] | null;
}) {
  const copy = integrationCopy(locale);
  const codeCopy = {
    copy: copy.copy,
    copied: copy.copied,
    copyError: copy.copyError,
  };
  const payload = examplePayload();
  const sections = [
    ["overview", copy.overview],
    ["api-key", copy.credentials],
    ["capture", copy.capture],
    ["report", copy.report],
    ["responses", copy.responses],
    ["validate", copy.verify],
    ["requests", copy.history],
  ];
  return (
    <div className={styles.layout}>
      <article className={styles.article}>
        <section id="overview" className={styles.section}>
          <h2>{copy.overview}</h2>
          <p>{copy.overviewBody}</p>
          <ol className={styles.flow}>
            {copy.flow.map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ol>
          <p className={styles.note}>{copy.prerequisite}</p>
        </section>
        <section id="api-key" className={styles.section}>
          <h2>{copy.credentials}</h2>
          <p>{copy.credentialBody}</p>
          {credentials}
        </section>
        <section id="capture" className={styles.section}>
          <h2>{copy.capture}</h2>
          <p>{copy.captureBody}</p>
          <p>{copy.capturePolicy}</p>
          <CodeExample
            label={copy.captureExample}
            examples={[{ label: copy.captureExample, code: captureExample }]}
            copy={codeCopy}
          />
          <p className={styles.note}>{copy.captureConsume}</p>
        </section>
        <section id="report" className={styles.section}>
          <h2>{copy.report}</h2>
          <p>{copy.reportBody}</p>
          <div className={styles.endpoint}>
            <span>POST</span>
            <code>{apiBase}/v1/conversions</code>
          </div>
          <p>{copy.illustrative}</p>
          <CodeExample
            label={copy.examples}
            examples={requestExamples(apiBase, payload)}
            copy={codeCopy}
          />
          <h3>{copy.fields}</h3>
          <div
            className={styles.tableWrap}
            tabIndex={0}
            role="region"
            aria-label={copy.fields}
          >
            <table className={styles.fields}>
              <thead>
                <tr>
                  <th scope="col">{copy.field}</th>
                  <th scope="col">{copy.requirement}</th>
                </tr>
              </thead>
              <tbody>
                {copy.fieldRows.map(([field, description]) => (
                  <tr key={field}>
                    <td>
                      <code>{field}</code>
                    </td>
                    <td>{description}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p>{copy.money}</p>
        </section>
        <section id="responses" className={styles.section}>
          <h2>{copy.responses}</h2>
          <p className={styles.note}>{copy.responseBody}</p>
          <CodeExample
            label={copy.responseExample}
            examples={[{ label: copy.responseExample, code: responseExample }]}
            copy={codeCopy}
          />
          <p>{copy.retry}</p>
          <div
            className={styles.tableWrap}
            tabIndex={0}
            role="region"
            aria-label={copy.responses}
          >
            <table className={styles.fields}>
              <thead>
                <tr>
                  <th scope="col">{copy.status}</th>
                  <th scope="col">{copy.requirement}</th>
                </tr>
              </thead>
              <tbody>
                {copy.errors.map(([error, guidance]) => (
                  <tr key={error}>
                    <td>
                      <code>{error}</code>
                    </td>
                    <td>{guidance}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
        <section id="validate" className={styles.section}>
          <h2>{copy.verify}</h2>
          <p>{copy.verifyBody}</p>
          <div className={styles.endpoint}>
            <span>POST</span>
            <code>{apiBase}/v1/conversions/validate</code>
          </div>
          <p className={styles.note}>{copy.validatorNote}</p>
          <IntegrationValidator
            initialPayload={payload}
            copy={{
              payload: copy.payload,
              validate: copy.validate,
              validating: copy.validating,
              freshExample: copy.freshExample,
              validationError: copy.validationError,
              result: copy.result,
              requestId: copy.requestId,
              previewAmount: copy.previewAmount,
              outcomes: copy.outcomes,
            }}
          />
          <p>{copy.verificationSteps}</p>
          <Link href={`/${locale}/brand/orders`}>{copy.orders}</Link>
        </section>
        <section id="requests" className={styles.section}>
          <div className={styles.historyHeader}>
            <h2>{copy.history}</h2>
            <RefreshRequests label={copy.refresh} />
          </div>
          <p>{copy.historyBody}</p>
          {requests === null ? (
            <p role="alert">{copy.historyUnavailable}</p>
          ) : requests.length === 0 ? (
            <p className={styles.note}>{copy.historyEmpty}</p>
          ) : (
            <div
              className={styles.tableWrap}
              tabIndex={0}
              role="region"
              aria-label={copy.history}
            >
              <table className={styles.historyTable}>
                <thead>
                  <tr>
                    <th scope="col">{copy.time}</th>
                    <th scope="col">{copy.mode}</th>
                    <th scope="col">{copy.status}</th>
                    <th scope="col">{copy.outcome}</th>
                  </tr>
                </thead>
                <tbody>
                  {requests.map((request) => (
                    <tr key={request.id}>
                      <td>
                        <time dateTime={request.at}>
                          {new Intl.DateTimeFormat(
                            locale === "ka" ? "ka-GE" : "en-GB",
                            {
                              timeZone: "Asia/Tbilisi",
                              month: "short",
                              day: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                              second: "2-digit",
                              timeZoneName: "short",
                            },
                          ).format(new Date(request.at))}
                        </time>
                      </td>
                      <td>
                        {request.mode === "live" ? copy.live : copy.validation}
                      </td>
                      <td>{request.status}</td>
                      <td>
                        <details>
                          <summary>
                            <code>{request.outcome}</code>
                          </summary>
                          <p>{copy.outcomes[request.outcome]}</p>
                          <p>
                            {copy.requestId}: <code>{request.id}</code>
                          </p>
                        </details>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </article>
      <nav className={styles.nav} aria-label={copy.onPage}>
        <strong>{copy.onPage}</strong>
        {sections.map(([id, label]) => (
          <a key={id} href={`#${id}`}>
            {label}
          </a>
        ))}
      </nav>
    </div>
  );
}
