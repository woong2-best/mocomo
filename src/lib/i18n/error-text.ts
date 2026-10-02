import { translate } from "@/lib/i18n/messages";

/**
 * Display text for an error returned by a server action or API route.
 * Catalog codes (`actions.xxx`, `wiki.error.*`) resolve via en.json; plain text passes through.
 */
export function errorText(value: unknown): string {
  if (typeof value !== "string" || !value) return "";
  return translate("en", value);
}
