import { loadLocaleTableSync, translate } from "@/lib/i18n/messages";

/**
 * Display text for an error returned by a server action or API route.
 *
 * - A catalog code (`actions.xxx`, `used.error.*`, ...) resolves through en.json.
 * - Anything else (already-translated English, third-party messages) is returned unchanged,
 *   so calling this twice, or on text that was translated server-side, is always safe.
 */
export function errorText(value: unknown): string {
  if (typeof value !== "string" || !value) return "";
  const table = loadLocaleTableSync("en") as Record<string, string>;
  if (!Object.prototype.hasOwnProperty.call(table, value)) return value;
  return translate("en", value);
}
