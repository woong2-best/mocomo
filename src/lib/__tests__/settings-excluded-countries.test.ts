import test from "node:test";
import assert from "node:assert/strict";
import { isSelectableCountryCode } from "@/lib/i18n/countries";
import {
  assertSettingsCountrySelectable,
  isSettingsExcludedCountry,
} from "@/lib/i18n/settings-excluded-countries";

test("settings country picker excludes the requested list", () => {
  for (const code of ["KP", "IR", "CU", "SY", "RU", "BY", "VE", "AF", "MM", "SD", "NI"]) {
    assert.equal(isSettingsExcludedCountry(code), true);
    assert.equal(isSelectableCountryCode(code), false);
  }
  assert.equal(isSelectableCountryCode("KR"), true);
  assert.equal(isSelectableCountryCode("US"), true);
  assert.equal(isSelectableCountryCode("DE"), true);
  assert.equal(isSelectableCountryCode("BR"), true);
});

test("existing excluded country can keep saving locale", () => {
  assert.equal(assertSettingsCountrySelectable("RU", "RU"), null);
  assert.ok(assertSettingsCountrySelectable("RU", "KR"));
});
