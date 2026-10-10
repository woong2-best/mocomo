import {
  defaultPostTranslateFromBrowser,
  inferPostTranslateInto,
  isPostTranslateInto,
  POST_TRANSLATE_OFF,
  type PostTranslateInto,
} from "@/lib/client-translate/opus-mt-pairs";

export const POST_TRANSLATE_STORAGE_KEY = "mocomo_post_translate_into";
export const POST_TRANSLATE_EXPLICIT_KEY = "mocomo_post_translate_into_explicit";

export {
  defaultPostTranslateFromBrowser,
  inferPostTranslateInto,
  isPostTranslateInto,
  POST_TRANSLATE_OFF,
  type PostTranslateInto,
};

export function parsePostTranslateInto(value: string | null | undefined): PostTranslateInto | null {
  if (!value) return null;
  return isPostTranslateInto(value) ? value : null;
}

export function readLocalPostTranslateInto(): PostTranslateInto | null {
  if (typeof window === "undefined") return null;
  try {
    return parsePostTranslateInto(window.localStorage.getItem(POST_TRANSLATE_STORAGE_KEY));
  } catch {
    return null;
  }
}

export function writeLocalPostTranslateInto(value: PostTranslateInto, explicit = false): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(POST_TRANSLATE_STORAGE_KEY, value);
    if (explicit) {
      window.localStorage.setItem(POST_TRANSLATE_EXPLICIT_KEY, "1");
    }
  } catch {
    /* quota / private mode */
  }
}

export function hasExplicitLocalPostTranslate(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(POST_TRANSLATE_EXPLICIT_KEY) === "1";
  } catch {
    return false;
  }
}

export function resolveClientPostTranslateInto(
  stored: string | null | undefined,
  browserLanguage?: string,
  countryCode?: string
): PostTranslateInto {
  return (
    parsePostTranslateInto(stored) ??
    inferPostTranslateInto(
      browserLanguage ?? (typeof navigator !== "undefined" ? navigator.language : ""),
      countryCode ?? ""
    )
  );
}
