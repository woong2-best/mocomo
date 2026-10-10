import {
  defaultPostTranslateFromBrowser,
  isPostTranslateInto,
  POST_TRANSLATE_OFF,
  type PostTranslateInto,
} from "@/lib/client-translate/opus-mt-pairs";

export const POST_TRANSLATE_STORAGE_KEY = "mocomo_post_translate_into";

export {
  defaultPostTranslateFromBrowser,
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

export function writeLocalPostTranslateInto(value: PostTranslateInto): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(POST_TRANSLATE_STORAGE_KEY, value);
  } catch {
    /* quota / private mode */
  }
}

export function resolveClientPostTranslateInto(
  stored: string | null | undefined,
  browserLanguage?: string
): PostTranslateInto {
  return (
    parsePostTranslateInto(stored) ??
    defaultPostTranslateFromBrowser(
      browserLanguage ?? (typeof navigator !== "undefined" ? navigator.language : "")
    )
  );
}
