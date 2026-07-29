import {
  finiteNumberOr,
  hasRequiredText,
  nullIfUndefined,
  requiredText,
} from "@/partykit/ingestion/shared/database-values";

describe("database value normalization", () => {
  it("converts omitted upstream fields to SQL-safe null", () => {
    expect(nullIfUndefined(undefined)).toBeNull();
    expect(nullIfUndefined(null)).toBeNull();
    expect(nullIfUndefined("value")).toBe("value");
  });

  it("accepts only non-empty string identifiers", () => {
    expect(hasRequiredText("item", "tag")).toBe(true);
    expect(hasRequiredText("item", "")).toBe(false);
    expect(hasRequiredText("item", undefined)).toBe(false);
  });

  it("normalizes timestamps and rejects missing required columns before SQL", () => {
    expect(finiteNumberOr(undefined, 42)).toBe(42);
    expect(finiteNumberOr(Number.NaN, 42)).toBe(42);
    expect(requiredText("reference", "title")).toBe("reference");
    expect(() => requiredText(undefined, "id")).toThrow("required id");
  });
});
