/**
 * @react-native-ml-kit/translate-text@0.5.0 (Android) checks `hasKey("requiresWifi")` but reads
 * `getBoolean("requireWifi")`, so `requireWifi: true` is silently ignored and model downloads
 * happen on mobile data. Fix the key so the "Wi-Fi preferred" download policy actually works.
 */
const fs = require("fs");
const path = require("path");

const TARGET = path.join(
  __dirname,
  "..",
  "node_modules/@react-native-ml-kit/translate-text/android/src/main/java/com/rnmlkit/translatetext/TranslateTextModule.java"
);

if (!fs.existsSync(TARGET)) {
  console.warn("[patch-ml-kit-translate-wifi] skip - @react-native-ml-kit/translate-text not installed");
  process.exit(0);
}

const src = fs.readFileSync(TARGET, "utf8");
const BAD = 'optionsMap.hasKey("requiresWifi") && optionsMap.getBoolean("requireWifi")';
const GOOD = 'optionsMap.hasKey("requireWifi") && optionsMap.getBoolean("requireWifi")';

if (src.includes(GOOD)) process.exit(0);
if (!src.includes(BAD)) {
  console.warn("[patch-ml-kit-translate-wifi] skip - unexpected file shape");
  process.exit(0);
}

fs.writeFileSync(TARGET, src.replace(BAD, GOOD), "utf8");
console.log("[patch-ml-kit-translate-wifi] patched requireWifi key");
