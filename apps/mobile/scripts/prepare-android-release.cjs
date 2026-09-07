/**
 * Post-prebuild tweaks for local Play AAB builds on Windows.
 */
const fs = require("fs");
const path = require("path");

const androidDir = path.join(__dirname, "..", "android");
const rootGradle = path.join(androidDir, "build.gradle");
const appGradle = path.join(androidDir, "app", "build.gradle");
const keystoreProps = path.join(androidDir, "keystore.properties");

function ensureFlatDir() {
  let content = fs.readFileSync(rootGradle, "utf8");
  const marker =
    'flatDir {\n      dirs "$rootDir/../node_modules/ffmpeg-kit-react-native/android/libs"\n    }';
  if (content.includes(marker)) return;
  content = content.replace(
    /allprojects \{\s*\n\s*repositories \{/,
    `allprojects {
  repositories {
    ${marker}`
  );
  fs.writeFileSync(rootGradle, content);
  console.log("[prepare-android-release] added ffmpeg flatDir to root build.gradle");
}

function ensureReleaseSigning() {
  if (!fs.existsSync(keystoreProps)) {
    fs.writeFileSync(
      keystoreProps,
      [
        "storeFile=../../../../android/mocomo-release.keystore",
        "storePassword=Mocomo2026Release!",
        "keyAlias=mocomo",
        "keyPassword=Mocomo2026Release!",
        "",
      ].join("\n")
    );
  }

  let content = fs.readFileSync(appGradle, "utf8");
  if (content.includes("keystorePropertiesFile")) return;

  content = content.replace(
    "def jscFlavor = 'io.github.react-native-community:jsc-android:2026004.+'",
    `def jscFlavor = 'io.github.react-native-community:jsc-android:2026004.+'

def keystorePropertiesFile = rootProject.file("keystore.properties")
def keystoreProperties = new Properties()
if (keystorePropertiesFile.exists()) {
    keystoreProperties.load(new FileInputStream(keystorePropertiesFile))
}`
  );

  content = content.replace(
    /signingConfigs \{\s*\n\s*debug \{[\s\S]*?\n\s*\}\s*\n\s*\}/,
    `signingConfigs {
        debug {
            storeFile file('debug.keystore')
            storePassword 'android'
            keyAlias 'androiddebugkey'
            keyPassword 'android'
        }
        release {
            if (keystorePropertiesFile.exists()) {
                storeFile file(keystoreProperties['storeFile'])
                storePassword keystoreProperties['storePassword']
                keyAlias keystoreProperties['keyAlias']
                keyPassword keystoreProperties['keyPassword']
            }
        }
    }`
  );

  content = content.replace(
    /release \{\s*\n\s*\/\/ Caution![\s\S]*?signingConfig signingConfigs\.debug/,
    `release {
            signingConfig keystorePropertiesFile.exists() ? signingConfigs.release : signingConfigs.debug`
  );

  fs.writeFileSync(appGradle, content);
  console.log("[prepare-android-release] configured release signing");
}

if (!fs.existsSync(androidDir)) {
  console.error("[prepare-android-release] android/ missing — run expo prebuild first");
  process.exit(1);
}

ensureFlatDir();
ensureReleaseSigning();
