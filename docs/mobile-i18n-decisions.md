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

## Translation-layer design

- Device language comes from `expo-localization` (`readDeviceLocale()`), not the signed-in
  profile locale. English devices skip ML Kit entirely.
- `t(key, vars)` always starts from `src/i18n/en.json`. If a cached ML Kit string exists for
  `(key, device language, app version)` it is used; otherwise English is shown and one translate
  job is scheduled. When that job finishes the overlay updates once (no empty/loading flash).
- Cache lives in AsyncStorage (`mocomo_ui_keys:{version}:{locale}`). MMKV is not a dependency.
- Language models download in the background with `requireWifi: true`. Download/translate failures
  and unsupported languages keep English.
- Keys under `legal.*`, `wiki.*` and `brand.*` are never sent to ML Kit. Placeholders (`{name}`),
  `MoCoMo` / `MOCO`, currency amounts and numeric dates are split out before translation
  (`ui-translate-segments.ts`) and interpolated after, so values are never machine-translated.
- User-generated content keeps the existing `TranslatableText` / `ClientTranslationProvider` path.
  The UI layer never wraps posts, comments, messages or bios.

## Rules

- Components never contain English (or any) literal UI copy. They call `t("key")`; the one English
  source is `src/i18n/en.json`. There are no other locale files in the app.
- `t(key, vars)` returns English as-is when the device language is English. Otherwise it returns the
  cached ML Kit translation for `(key, language, app version)` or English if that is not ready.
- Keys under `legal.*`, `wiki.*` and `brand.*` are never translated. MoCoMo, numbers, currency,
  dates and `{placeholders}` are protected during translation.
- User-generated content (messages, posts, comments, bios) keeps using the existing
  `TranslatableText` path, unchanged.
- Server errors carry a catalog `code`. The client compares `ApiError.code` / `isApiErrorCode()`
  and renders `t(code)`. It does not branch on Korean (or any) message text.
- Culture Wiki is English-only. The editor shows `wiki.form.englishOnlyNotice` and blocks submit
  when the combined fields are mostly non-English letters (`cultureWikiEnglishOnlyViolation`).
- `npm run check:i18n` (apps/mobile) fails if Hangul appears in the app source, including
  `\uAC00`-style escapes that decode to Hangul. Unicode *ranges* in regexes (`\uAC00-\uD7AF`)
  are allowed because they are detectors, not copy.

## Allowed Hangul: `src/data/server-values/`

Only values that must equal Korean data that already exists on the server or in user content.
They are identifiers / user data, not UI copy, and the UI shows English labels for them.

| File | Why it stays |
|---|---|
| `korea-regions.ts` | Region names stored on used-market listings. Display goes through `displayUsedRegion()`. |
| `used-catalog-ko.ts` | Legacy Korean catalog labels used to map stored listing categories. |
| `legacy-chat-patterns.ts` | Regexes that parse Korean templates already stored in chat messages. |
| `event-hashtag-filters.ts` | Hashtag strings that must match tags already on events. |
| `kr-banks.ts` | Official Korean bank names for KR payout / verification matching. |
| `commerce-defaults.ts` | Default commerce listing category (`굿즈`) already stored on the server. |

## Skipped

- `_codemod/` and one-off extract scripts — migration helpers, not shipped.
- Archive / generated native projects / `node_modules` — outside app source.
- User-generated content translation (`TranslatableText`) — unchanged by design.
- Culture Wiki article bodies — English-only authoring; never ML Kit'd (`wiki.*` prefix).
- Legal term bodies (`legal.*`) — English only, never ML Kit'd.
