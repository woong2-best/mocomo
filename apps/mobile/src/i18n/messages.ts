import en from "./en.json";

/** The single source of UI copy. Components reference keys only; this is the English text. */
export const EN_MESSAGES: Readonly<Record<string, string>> = en;

export function englishText(key: string): string {
  return EN_MESSAGES[key] ?? key;
}

/** Replace `{name}` placeholders. Runs after translation so values are never machine-translated. */
export function interpolate(text: string, vars?: Record<string, string>): string {
  if (!vars) return text;
  let out = text;
  for (const [name, value] of Object.entries(vars)) out = out.split(`{${name}}`).join(value);
  return out;
}
