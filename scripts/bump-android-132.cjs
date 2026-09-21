const fs = require("fs");

const files = [
  [
    "apps/mobile/app.json",
    [
      ['"version": "1.0.131"', '"version": "1.0.132"'],
      ['"versionCode": 141', '"versionCode": 142'],
    ],
  ],
  [
    "apps/mobile/package.json",
    [['"version": "1.0.131"', '"version": "1.0.132"']],
  ],
  [
    "apps/mobile/android/app/build.gradle",
    [
      ["versionCode 141", "versionCode 142"],
      ['versionName "1.0.131"', 'versionName "1.0.132"'],
    ],
  ],
];

for (const [p, reps] of files) {
  let c = fs.readFileSync(p, "utf8");
  for (const [a, b] of reps) {
    if (!c.includes(a)) {
      console.error("MISS", p, a);
      process.exit(1);
    }
    c = c.replace(a, b);
  }
  fs.writeFileSync(p, c);
  console.log("OK", p);
}
