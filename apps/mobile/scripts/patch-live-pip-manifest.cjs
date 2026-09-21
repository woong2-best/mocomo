const fs = require("fs");
const p = "C:/dev/mocomo/apps/mobile/android/app/src/main/AndroidManifest.xml";
let c = fs.readFileSync(p, "utf8");
if (!c.includes("supportsPictureInPicture")) {
  c = c.replace(
    'android:screenOrientation="portrait"',
    'android:supportsPictureInPicture="true" android:enableOnBackInvokedCallback="false" android:screenOrientation="portrait"'
  );
}
const oldCfg =
  'android:configChanges="keyboard|keyboardHidden|orientation|screenSize|screenLayout|uiMode|smallestScreenSize|assetsPaths"';
const newCfg =
  'android:configChanges="keyboard|keyboardHidden|orientation|screenSize|screenLayout|uiMode|smallestScreenSize|density|assetsPaths"';
if (c.includes(oldCfg)) c = c.replace(oldCfg, newCfg);
fs.writeFileSync(p, c);
console.log("supportsPictureInPicture=", c.includes("supportsPictureInPicture"));
