"use client";

import { useId, useLayoutEffect, useMemo, useRef } from "react";
import {
  listTaxCities,
  listTaxCitiesOfCountry,
  listTaxCountries,
  listTaxStates,
} from "@/lib/creator-payout/geo-options";
import { sanitizeTaxTextInput } from "@/lib/creator-payout/tax-form-input";

const fieldClass =
  "w-full rounded-lg border border-neutral-300 bg-white px-3 py-2.5 text-sm text-black placeholder:text-neutral-400 disabled:bg-neutral-100 disabled:text-neutral-400";

type TaxLocationFieldsProps = {
  countryCode: string;
  onCountryChange: (code: string) => void;
  countryLocked?: boolean;
  excludeUs?: boolean;
  state: string;
  stateCode: string;
  onStateChange: (name: string, isoCode: string) => void;
  city: string;
  onCityChange: (name: string) => void;
};

export function TaxLocationFields({
  countryCode,
  onCountryChange,
  countryLocked = false,
  excludeUs = false,
  state: _state,
  stateCode,
  onStateChange,
  city,
  onCityChange,
}: TaxLocationFieldsProps) {
  const cityListId = useId();
  const countries = useMemo(() => listTaxCountries({ excludeUs }), [excludeUs]);
  const states = useMemo(() => listTaxStates(countryCode), [countryCode]);
  const cities = useMemo(() => {
    if (stateCode) return listTaxCities(countryCode, stateCode);
    if (states.length === 0 && countryCode) return listTaxCitiesOfCountry(countryCode);
    return [];
  }, [countryCode, stateCode, states.length]);

  const locationKey = `${countryCode}:${stateCode}`;
  const prevLocationKey = useRef(locationKey);

  useLayoutEffect(() => {
    if (prevLocationKey.current === locationKey) return;
    prevLocationKey.current = locationKey;
    onCityChange("");
  }, [locationKey, onCityChange]);

  const cityEnabled = Boolean(countryCode) && (Boolean(stateCode) || states.length === 0);

  function changeCountry(nextCountry: string) {
    onCityChange("");
    onStateChange("", "");
    onCountryChange(nextCountry);
  }

  function changeState(name: string, isoCode: string) {
    onCityChange("");
    onStateChange(name, isoCode);
  }

  return (
    <>
      <label className="block space-y-1 text-sm">
        <span className="font-semibold">{excludeUs ? "Country of residence" : "Country"}</span>
        <select
          className={fieldClass}
          value={countryCode}
          disabled={countryLocked}
          autoComplete="off"
          onChange={(e) => changeCountry(e.target.value)}
        >
          {!countryCode ? <option value="">Select country</option> : null}
          {countries.map((country) => (
            <option key={country.code} value={country.code}>
              {country.name}
            </option>
          ))}
        </select>
      </label>

      <label className="block space-y-1 text-sm">
        <span className="font-semibold">{excludeUs ? "State / province" : "State"}</span>
        <select
          key={`state-select-${countryCode}`}
          className={fieldClass}
          value={stateCode}
          disabled={!countryCode || states.length === 0}
          autoComplete="off"
          onChange={(e) => {
            const next = states.find((item) => item.code === e.target.value);
            changeState(next?.name ?? "", next?.code ?? "");
          }}
        >
          <option value="">
            {!countryCode
              ? "Select country first"
              : states.length === 0
                ? "No states for this country"
                : "Select state"}
          </option>
          {states.map((item) => (
            <option key={item.code} value={item.code}>
              {item.name}
            </option>
          ))}
        </select>
      </label>

      <label className="block space-y-1 text-sm">
        <span className="font-semibold">City</span>
        <input
          key={`city-text-${locationKey}`}
          className={fieldClass}
          value={city}
          disabled={!cityEnabled}
          list={cityEnabled && cities.length > 0 ? cityListId : undefined}
          onChange={(e) => onCityChange(sanitizeTaxTextInput(e.target.value))}
          autoComplete="off"
          spellCheck={false}
          placeholder={cityEnabled ? "City" : "Select state first"}
        />
        {cityEnabled && cities.length > 0 ? (
          <datalist id={cityListId}>
            {cities.map((item) => (
              <option key={`${item.name}-${item.code}`} value={item.name} />
            ))}
          </datalist>
        ) : null}
      </label>
    </>
  );
}
