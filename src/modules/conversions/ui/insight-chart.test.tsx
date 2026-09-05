// @vitest-environment jsdom
import { act } from "react";
import { hydrateRoot, type Root } from "react-dom/client";
import { renderToString } from "react-dom/server";
import { fireEvent, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { parsePerformanceQuery } from "../application/performance-query";
import { InsightChart } from "./insight-chart";

afterEach(() => vi.restoreAllMocks());

describe("InsightChart hydration", () => {
  it.each([
    ["ka", "creator"],
    ["ka", "brand"],
    ["en", "creator"],
    ["en", "brand"],
  ] as const)(
    "preserves server labels in %s for %s despite browser ICU differences",
    async (locale, role) => {
      const basePath = `/${locale}/${role}/${role === "creator" ? "earnings" : "performance"}`;
      // Resolve the server component once, as an RSC response does, then hydrate
      // only the interactive component using the serialized label props.
      const element = InsightChart({
        locale,
        basePath,
        state: parsePerformanceQuery({}, role),
        report: {
          role,
          trend: [
            {
              date: "2026-08-08",
              clicks: 4,
              orders: 1,
              earnings: "1234.5",
              sales: "5678.9",
            },
            {
              date: "2026-08-09",
              clicks: 0,
              orders: 0,
              earnings: "0",
              sales: "0",
            },
          ],
        },
      });
      const container = document.createElement("div");
      document.body.append(container);
      container.innerHTML = renderToString(element);
      const serverHTML = container.innerHTML;
      const Dates = Intl.DateTimeFormat;
      const Numbers = Intl.NumberFormat;
      vi.spyOn(Intl, "DateTimeFormat").mockImplementation(function (
        _locales?: Intl.LocalesArgument,
        options?: Intl.DateTimeFormatOptions,
      ) {
        return new Dates("en-US", options);
      } as typeof Intl.DateTimeFormat);
      vi.spyOn(Intl, "NumberFormat").mockImplementation(function (
        _locales?: Intl.LocalesArgument,
        options?: Intl.NumberFormatOptions,
      ) {
        return new Numbers("de-DE", options);
      } as typeof Intl.NumberFormat);
      const browserDate = new Intl.DateTimeFormat(locale, {
        day: "numeric",
        month: "short",
      }).format(new Date("2026-08-08T12:00:00Z"));
      expect(browserDate).not.toBe(element.props.labels.dates[0]);
      const recoverableError = vi.fn();
      const consoleError = vi.spyOn(console, "error");
      let root: Root | undefined;
      try {
        await act(async () => {
          root = hydrateRoot(container, element, {
            onRecoverableError: recoverableError,
          });
        });
        expect(recoverableError).not.toHaveBeenCalled();
        expect(consoleError).not.toHaveBeenCalled();
        expect(container.innerHTML).toBe(serverHTML);

        fireEvent.click(within(container).getAllByRole("button")[0]!);
        const readout = container.querySelector(".insight-chart-readout")!;
        expect(readout.textContent).toContain(element.props.labels.dates[0]);
        expect(readout.textContent).toContain(element.props.labels.amounts[0]);
        const href = within(container).getByRole("link").getAttribute("href")!;
        expect(new URL(href, "http://localhost").searchParams.get("from")).toBe(
          "2026-08-08",
        );
      } finally {
        await act(async () => root?.unmount());
        container.remove();
      }
    },
  );
});
