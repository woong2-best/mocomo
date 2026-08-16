/**
 * FFmpegKit binaries were removed from Maven Central (Jan 2025).
 * Patch the RN module to use the vendored AAR in android/libs/.
 */
const fs = require("fs");
const path = require("path");
const https = require("https");

const mobileAndroidLibs = path.join(__dirname, "../android/libs");
const aarPath = path.join(mobileAndroidLibs, "ffmpeg-kit-full-gpl.aar");
const aarUrl =
  "https://github.com/NooruddinLakhani/ffmpeg-kit-full-gpl/releases/download/v1.0.0/ffmpeg-kit-full-gpl.aar";

const buildGradle = path.join(
  __dirname,
  "../node_modules/ffmpeg-kit-react-native/android/build.gradle"
);

function downloadAar(url, dest) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);
    https
      .get(url, (res) => {
        if (res.statusCode !== 200) {
          reject(new Error(`HTTP ${res.statusCode}`));
          return;
        }
        res.pipe(file);
        file.on("finish", () => file.close(resolve));
      })
      .on("error", reject);
  });
}

async function ensureAar() {
  fs.mkdirSync(mobileAndroidLibs, { recursive: true });
  if (fs.existsSync(aarPath) && fs.statSync(aarPath).size > 1_000_000) return;
  console.log("[patch-ffmpeg-kit] downloading ffmpeg-kit-full-gpl.aar …");
  await downloadAar(aarUrl, aarPath);
}

if (!fs.existsSync(buildGradle)) {
  console.warn("[patch-ffmpeg-kit] ffmpeg-kit-react-native not installed — skip");
  process.exit(0);
}

void ensureAar()
  .then(() => {
    let content = fs.readFileSync(buildGradle, "utf8");
    const marker = "implementation(name: 'ffmpeg-kit-full-gpl', ext: 'aar')";

    if (!content.includes(marker)) {
      content = content.replace(
        /implementation 'com\.arthenica:ffmpeg-kit-' \+ safePackageName\(safeExtGet\('ffmpegKitPackage', 'https'\)\) \+ ':' \+ safePackageVersion\(safeExtGet\('ffmpegKitPackage', 'https'\)\)/,
        `${marker}
  implementation 'com.arthenica:smart-exception-java:0.2.1'`
      );
    }

    if (!content.includes("flatDir {")) {
      content = content.replace(
        "repositories {\n  mavenCentral()",
        "repositories {\n  flatDir { dirs 'libs' }\n  mavenCentral()"
      );
    }

    fs.writeFileSync(buildGradle, content);
    console.log("[patch-ffmpeg-kit] patched android/build.gradle");
  })
  .catch((err) => {
    console.warn("[patch-ffmpeg-kit]", err.message || err);
    process.exit(0);
  });
