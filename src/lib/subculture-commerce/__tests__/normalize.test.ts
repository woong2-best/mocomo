import { describe, expect, it } from "vitest";
import { normalizeSubcultureListingInput, normalizeSubcultureMeta } from "@/lib/subculture-commerce/normalize";
import { buildSubcultureBadges } from "@/lib/subculture-commerce/labels";

describe("subculture-commerce", () => {
  it("normalizes tcg meta and badges", () => {
    const row = normalizeSubcultureListingInput({
      productType: "TCG_POKEMON",
      characterName: " Pikachu ",
      conditionGrade: "NM",
      limitedKind: "EVENT_EXCLUSIVE",
      listingFormat: "SINGLE",
      tradeMode: "SELL",
      itemOrigin: "OFFICIAL",
      subcultureMeta: {
        tcgSet: "SV4a",
        tcgNumber: "025/165",
        graded: true,
        grader: "PSA",
        grade: "10",
      },
    });
    expect(row.characterName).toBe("Pikachu");
    expect(row.conditionGrade).toBe("NM");
    expect(row.subcultureMeta?.tcgSet).toBe("SV4a");

    const badges = buildSubcultureBadges({
      productType: "TCG_POKEMON",
      conditionGrade: row.conditionGrade,
      limitedKind: row.limitedKind,
      subcultureMeta: row.subcultureMeta,
    });
    expect(badges.some((b) => b.label.includes("PSA"))).toBe(true);
  });

  it("rejects invalid meta keys", () => {
    expect(normalizeSubcultureMeta({ tcgSet: "OK", evil: "x" })).toEqual({ tcgSet: "OK" });
  });
});
