import { describe, expect, it } from "vitest";
import { listTaxCities, listTaxCountries, listTaxStates, toTaxAsciiName } from "@/lib/creator-payout/geo-options";

describe("tax form geo options", () => {
  it("lists English country names and US states", () => {
    const countries = listTaxCountries();
    expect(countries.some((country) => country.code === "US" && country.name === "United States")).toBe(true);
    expect(listTaxCountries({ excludeUs: true }).some((country) => country.code === "US")).toBe(false);
    const states = listTaxStates("US");
    expect(states.length).toBeGreaterThanOrEqual(50);
    expect(states.some((state) => state.code === "CA" && state.name === "California")).toBe(true);
  });

  it("lists cities after a state is chosen and folds accents", () => {
    const cities = listTaxCities("US", "CA");
    expect(cities.length).toBeGreaterThan(0);
    expect(cities.some((city) => city.name === "Los Angeles")).toBe(true);
    expect(toTaxAsciiName("S\u00e3o Paulo")).toBe("Sao Paulo");
  });
});
