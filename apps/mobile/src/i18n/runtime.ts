import { englishText, interpolate } from "./messages";
import type { TFn } from "./types";

let current: TFn = (key, vars) => interpolate(englishText(key), vars);

/** Installed by I18nProvider so non-React code (helpers, errors, toasts) uses the same translator. */
export function setRuntimeTranslator(fn: TFn): void {
  current = fn;
}

/** Translator for code that cannot call hooks. Components should prefer `useI18n().t`. */
export function translate(key: string, vars?: Record<string, string>): string {
  return current(key, vars);
}
