import { describe, expect, it } from "vitest";
import {
  browseCategoriesForTag,
  labelContainsTerm,
  listingMatchesBrowseCategory,
  matchUsedBrowseCategory,
  productTypeIdsForTag,
  usedQueryFacets,
} from "@/lib/used-market-query";

describe("used market query routing", () => {
  it("opens the category page when the query is exactly a category name", () => {
    expect(matchUsedBrowseCategory("Figures & Models")).toBe("FIGURE");
    expect(matchUsedBrowseCategory("  figures & models  ")).toBe("FIGURE");
    expect(matchUsedBrowseCategory("TCG")).toBe("TCG");
    expect(matchUsedBrowseCategory("Fashion")).toBe("COSPLAY");
    expect(matchUsedBrowseCategory("Cosplay")).toBe("COSPLAY");
    expect(matchUsedBrowseCategory("Manga & Doujinshi")).toBe("BOOK");
    expect(matchUsedBrowseCategory("Books")).toBe("BOOK");
  });

  it("does not treat a partial name as an exact category", () => {
    expect(matchUsedBrowseCategory("dolls")).toBeNull();
    expect(matchUsedBrowseCategory("cards")).toBeNull();
  });

  it("matches product tags that contain the term", () => {
    expect(labelContainsTerm("Figures & Models", "models")).toBe(true);
    expect(labelContainsTerm("Books", "me")).toBe(false);
    expect(browseCategoriesForTag("models")).toEqual(["FIGURE"]);
    expect(productTypeIdsForTag("pokemon")).toContain("TCG_POKEMON");
  });

  it("ranks categories by how many matched products belong to them", () => {
    const facets = usedQueryFacets([
      { category: "FIGURE", productType: null },
      { category: "FIGURE", productType: null },
      { category: "GOODS", productType: "TCG_CARD" },
      { category: "BOOK", productType: null },
    ]);
    expect(facets.map((facet) => facet.id)).toEqual(["FIGURE", "GOODS", "BOOK", "TCG"]);
    expect(facets[0]?.count).toBe(2);
    expect(listingMatchesBrowseCategory({ category: "GOODS", productType: "TCG_CARD" }, "TCG")).toBe(
      true
    );
    expect(listingMatchesBrowseCategory({ category: "FIGURE", productType: null }, "FIGURE")).toBe(
      true
    );
  });
});
