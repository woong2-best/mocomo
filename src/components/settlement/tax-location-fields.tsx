"use client";

import { useLayoutEffect, useMemo, useRef } from "react";
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
  state,
  stateCode,
  onStateChange,
  city,
  onCityChange,
}: TaxLocationFieldsProps) {
  const countries = useMemo(() => listTaxCountries({ excludeUs }), [excludeUs]);
  const states = useMemo(() => listTaxStates(countryCode), [countryCode]);
  const cities = useMemo(() => {
    if (stateCode) return listTaxCities(countryCode, stateCode);
    if (states.length === 0) return listTaxCitiesOfCountry(countryCode);
    return [];
  }, [countryCode, stateCode, states.length]);

  const locationKey = `${countryCode}:${stateCode}`;
  const prevLocationKey = useRef(locationKey);

  useLayoutEffect(() => {
    if (prevLocationKey.current === locationKey) return;
    prevLocationKey.current = locationKey;
    onCityChange("");
  }, [locationKey, onCityChange]);

  const stateFallback = Boolean(countryCode) && states.length === 0;
  const cityFallback = Boolean(countryCode) && (stateFallback || Boolean(stateCode)) && cities.length === 0;
  const cityEnabled = Boolean(countryCode) && (stateFallback || Boolean(stateCode));

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

      {stateFallback ? (
        <FallbackField
          key={`state-text-${countryCode}`}
          label="State / province"
          value={state}
          onChange={(value) => changeState(value, "")}
        />
      ) : (
        <label className="block space-y-1 text-sm">
          <span className="font-semibold">{excludeUs ? "State / province" : "State"}</span>
          <select
            key={`state-select-${countryCode}`}
            className={fieldClass}
            value={stateCode}
            disabled={!countryCode}
            autoComplete="off"
            onChange={(e) => {
              const next = states.find((item) => item.code === e.target.value);
              changeState(next?.name ?? "", next?.code ?? "");
            }}
          >
            <option value="">{countryCode ? "Select state" : "Select country first"}</option>
            {states.map((item) => (
              <option key={item.code} value={item.code}>
                {item.name}
              </option>
            ))}
          </select>
        </label>
      )}

      {cityFallback ? (
        <FallbackField
          key={`city-text-${locationKey}`}
          label="City"
          value={city}
          onChange={onCityChange}
          disabled={!cityEnabled}
        />
      ) : (
        <label className="block space-y-1 text-sm">
          <span className="font-semibold">City</span>
          <select
            key={`city-select-${locationKey}`}
            className={fieldClass}
            value={cities.some((item) => item.name === city) ? city : ""}
            disabled={!cityEnabled}
            autoComplete="off"
            onChange={(e) => onCityChange(e.target.value)}
          >
            <option value="">{cityEnabled ? "Select city" : "Select state first"}</option>
            {cities.map((item) => (
              <option key={`${item.name}-${item.code}`} value={item.name}>
                {item.name}
              </option>
            ))}
          </select>
        </label>
      )}
    </>
  );
}

function FallbackField({
  label,
  value,
  onChange,
  disabled = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}) {
  return (
    <label className="block space-y-1 text-sm">
      <span className="font-semibold">{label}</span>
      <input
        className={fieldClass}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(sanitizeTaxTextInput(e.target.value))}
        autoComplete="off"
        spellCheck={false}
      />
    </label>
  );
}
