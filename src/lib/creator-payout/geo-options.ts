import { City, Country, State } from "country-state-city";
import { isSelectableCountryCode } from "@/lib/i18n/countries";

export type GeoOption = { code: string; name: string };

/** Official English names can include accents; Helvetica/tax validation stay ASCII. */
export function toTaxAsciiName(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9\s,.\-/#']/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function listTaxCountries(opts?: { excludeUs?: boolean }): GeoOption[] {
  return Country.getAllCountries()
    .filter((country) => isSelectableCountryCode(country.isoCode))
    .filter((country) => !opts?.excludeUs || country.isoCode !== "US")
    .map((country) => ({ code: country.isoCode, name: country.name }))
    .sort((a, b) => a.name.localeCompare(b.name, "en"));
}

export function listTaxStates(countryCode: string): GeoOption[] {
  if (!countryCode) return [];
  return State.getStatesOfCountry(countryCode)
    .map((state) => ({ code: state.isoCode, name: toTaxAsciiName(state.name) }))
    .filter((state) => state.code && state.name)
    .sort((a, b) => a.name.localeCompare(b.name, "en"));
}

export function listTaxCities(countryCode: string, stateCode: string): GeoOption[] {
  if (!countryCode || !stateCode) return [];
  return City.getCitiesOfState(countryCode, stateCode)
    .map((city) => ({ code: toTaxAsciiName(city.name), name: toTaxAsciiName(city.name) }))
    .filter((city) => city.name)
    .sort((a, b) => a.name.localeCompare(b.name, "en"));
}

export function isTaxCityInState(countryCode: string, stateCode: string, city: string): boolean {
  const cities = listTaxCities(countryCode, stateCode);
  if (cities.length === 0) return city.trim().length >= 2;
  return cities.some((item) => item.name === city);
}

export function listTaxCitiesOfCountry(countryCode: string): GeoOption[] {
  if (!countryCode) return [];
  return (City.getCitiesOfCountry(countryCode) ?? [])
    .map((city) => ({ code: toTaxAsciiName(city.name), name: toTaxAsciiName(city.name) }))
    .filter((city) => city.name)
    .sort((a, b) => a.name.localeCompare(b.name, "en"));
}
