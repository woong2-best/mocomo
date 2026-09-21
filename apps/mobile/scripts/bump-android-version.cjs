const fs = require("fs");
const p = "C:/dev/mocomo/apps/mobile/android/app/build.gradle";
let c = fs.readFileSync(p, "utf8");
c = c.replace(/versionCode\s+\d+/, "versionCode 148");
c = c.replace(/versionName\s+"[^"]+"/, 'versionName "1.0.138"');
fs.writeFileSync(p, c);
const m1 = c.match(/versionCode\s+\d+/);
const m2 = c.match(/versionName\s+"[^"]+"/);
console.log(m1 && m1[0], m2 && m2[0]);
