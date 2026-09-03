const fs = require("fs");
const path = require("path");

const version = require("../app.json").expo.version;
const src = path.join(__dirname, "..", "android", "app", "build", "outputs", "bundle", "release", "app-release.aab");
const dest = path.join(__dirname, "..", "..", "..", `MoCoMo-${version}-play.aab`);

if (!fs.existsSync(src)) {
  console.error("AAB not found:", src);
  process.exit(1);
}

fs.copyFileSync(src, dest);
console.log("Copied to", dest);
