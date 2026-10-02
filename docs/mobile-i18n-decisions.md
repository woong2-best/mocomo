# Mobile i18n decisions (apps/mobile)

Goal: the app is English by default. Its own UI copy (buttons, menus, labels, notices) is
translated into the device language on the device with Google ML Kit Translation.

## Investigation (before the change)

| Question | Finding |
|---|---|
| Where did UI strings come from? | Three places. (1) Server catalog: `t(key)` fetched `GET /api/i18n/messages` (the web `en.json`) and cached it in AsyncStorage. (2) Inline `u("한글", "English")` pairs (~1,600 call sites) and `uiText(locale, ko, en)`. (3) Hardcoded Korean in JSX, `Alert`/toast text, label tables and error strings (~800 lines). |
| Hangul in source | 281 files / ~2,400 lines in `apps/mobile` (tracked files, excluding `node_modules`). |
| i18n library? | No third-party i18n library. A home-grown `I18nProvider` (`src/i18n`) plus `@react-native-ml-kit/translate-text` + `franc` already used for **user-generated content** (`TranslatableText`). |
| Server errors | `ApiError.message` was shown raw; some screens branched on Korean text (e.g. `msg.includes("휴대폰")`). |

## ML Kit choice

Reuse `@react-native-ml-kit/translate-text` (already a dependency, already linked, Android + iOS,
wraps ML Kit Translate). No new native module and no custom Kotlin. The project already builds
a dev client / prebuilt `android/`, so nothing about the build flow changes.

One upstream bug matters: the Android wrapper reads the `requireWifi` option under the wrong key
(`requiresWifi`), so Wi-Fi-only downloads never applied. `scripts/patch-ml-kit-translate-wifi.cjs`
(run from `postinstall`, same pattern as the other patch scripts) fixes it.

## Rules

- Components never contain English (or any) literal UI copy. They call `t("key")`; the one English
  source is `src/i18n/en.json`. There are no other locale files in the app.
- `t(key, vars)` returns English as-is when the device language is English. Otherwise it returns the
  cached ML Kit translation for `(key, language, app version)` or English if that is not ready.
- Keys under `legal.*`, `wiki.*` and `brand.*` are never translated. MoCoMo, numbers, currency,
  dates and `{placeholders}` are protected during translation.
- User-generated content (messages, posts, comments, bios) keeps using the existing
  `TranslatableText` path, unchanged.
- `npm run check:i18n` (apps/mobile) fails if Hangul appears in the app source.

## Allowed Hangul: `src/data/server-values/`

Only values that must equal Korean data that already exists on the server or in user content:
region names stored on used-market listings, legacy Korean chat templates that are parsed back
out of stored messages, hashtag filters. They are identifiers / user data, not UI copy, and the
UI shows English labels for them.

(Updated at the end of the migration with the final list, translation-layer design and skipped items.)
