import { it, expect } from "vitest";
import { adminPerformanceCsv } from "./admin-performance-csv";
it("quotes text and protects spreadsheet formulas without corrupting signed currency", () => {
  const csv = adminPerformanceCsv(
    ["Name", "Amount"],
    [
      [
        { value: 'ქართული, "სახელი"\nnext' },
        { value: "-50.00", numeric: true },
      ],
      [{ value: ' \t=HYPERLINK("x")' }, { value: "0.00", numeric: true }],
    ],
  );
  expect(csv).toContain('"ქართული, ""სახელი""\nnext","-50.00"');
  expect(csv).toContain('"\' \t=HYPERLINK(""x"")"');
  expect(csv.startsWith("\uFEFF")).toBe(true);
  expect(csv.endsWith("\r\n")).toBe(true);
});
it("keeps empty exports header-only", () =>
  expect(adminPerformanceCsv(["From", "To"], [])).toBe(
    '\uFEFF"From","To"\r\n',
  ));
