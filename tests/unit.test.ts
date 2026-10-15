import { describe, expect, it } from "vitest";
import { ALL_RIGHTS, DEFAULT_RIGHTS } from "@/lib/rights";
import { parseCsv } from "@/components/csv-import";
import { toCsv } from "@/lib/export";
import { parseRange, previousRange } from "@/lib/queries";
import { pctChange, slugify } from "@/lib/format";

describe("rights defaults", () => {
  it("owner holds every right", () => {
    expect(DEFAULT_RIGHTS.owner).toEqual(ALL_RIGHTS);
  });
  it("reps cannot delete, export, administer or see other reps' sales", () => {
    for (const r of ["SALES_DEL", "EXPORT", "TEAM_ADMIN", "BILLING_ADMIN", "SALES_VIEW_ALL", "AUDIT_VIEW"] as const) {
      expect(DEFAULT_RIGHTS.rep).not.toContain(r);
    }
  });
  it("admins can't manage billing", () => {
    expect(DEFAULT_RIGHTS.admin).not.toContain("BILLING_ADMIN");
  });
});

describe("CSV", () => {
  it("parses quoted fields, escaped quotes and CRLF", () => {
    expect(parseCsv('name,note\r\n"Acme, Inc.","said ""hi"""\r\nBob,\n')).toEqual([
      ["name", "note"],
      ["Acme, Inc.", 'said "hi"'],
      ["Bob", ""],
    ]);
  });
  it("neutralises spreadsheet formula injection on export", () => {
    const out = toCsv({ name: "x", columns: ["a"], rows: [["=HYPERLINK(1)"], [-5]] });
    expect(out).toContain("'=HYPERLINK(1)");
    expect(out).toContain("-5"); // numbers are untouched
  });
});

describe("date ranges", () => {
  it("previous range has the same length and ends the day before", () => {
    const r = parseRange({ range: "custom", from: "2026-03-01", to: "2026-03-10" });
    expect(previousRange(r)).toMatchObject({ from: "2026-02-19", to: "2026-02-28" });
  });
  it("rejects inverted custom ranges", () => {
    expect(parseRange({ range: "custom", from: "2026-03-10", to: "2026-03-01" }).key).toBe("30d");
  });
});

describe("format", () => {
  it("pctChange handles zero baselines", () => {
    expect(pctChange(50, 0)).toBe(100);
    expect(pctChange(0, 0)).toBe(0);
    expect(pctChange(150, 100)).toBe(50);
  });
  it("slugify", () => {
    expect(slugify("Acme Trading Co.!")).toBe("acme-trading-co");
  });
});
