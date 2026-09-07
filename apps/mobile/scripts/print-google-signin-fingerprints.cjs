/**
 * Print Android signing fingerprints for Google Sign-In / Firebase setup.
 *
 * Play Store installs are re-signed with Google's app signing key. Firebase must
 * list BOTH the upload key SHA-1 and the Play app signing key SHA-1.
 */
const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const repoRoot = path.join(__dirname, "..", "..", "..");
const keystore = path.join(repoRoot, "android", "mocomo-release.keystore");
const keystoreProps = path.join(__dirname, "..", "android", "keystore.properties");

function findKeytool() {
  const candidates = [
    process.env.JAVA_HOME && path.join(process.env.JAVA_HOME, "bin", "keytool.exe"),
    "C:\\Program Files\\Android\\Android Studio\\jbr\\bin\\keytool.exe",
  ].filter(Boolean);
  for (const p of candidates) {
    if (fs.existsSync(p)) return p;
  }
  return "keytool";
}

function readProps() {
  if (!fs.existsSync(keystoreProps)) {
    return { storepass: null, alias: "mocomo" };
  }
  const lines = fs.readFileSync(keystoreProps, "utf8").split("\n");
  const map = Object.fromEntries(
    lines
      .map((l) => l.trim())
      .filter(Boolean)
      .map((l) => l.split("=").map((s) => s.trim()))
  );
  return { storepass: map.storePassword ?? null, alias: map.keyAlias ?? "mocomo" };
}

function sha1FromKeytool(keytool, storepass, alias) {
  const out = execSync(
    `"${keytool}" -list -v -keystore "${keystore}" -alias ${alias} -storepass ${storepass}`,
    { encoding: "utf8" }
  );
  const m = out.match(/SHA1:\s*([0-9A-F:]+)/i);
  return m ? m[1] : null;
}

if (!fs.existsSync(keystore)) {
  console.error("Keystore not found:", keystore);
  process.exit(1);
}

const { storepass, alias } = readProps();
const pass = storepass || process.env.MOCOMO_KEYSTORE_PASSWORD;
if (!pass) {
  console.error("Set store password in android/keystore.properties or MOCOMO_KEYSTORE_PASSWORD");
  process.exit(1);
}

const keytool = findKeytool();
const sha1 = sha1FromKeytool(keytool, pass, alias);
const firebaseHash = sha1 ? sha1.replace(/:/g, "").toLowerCase() : null;

console.log("MoCoMo Android signing — Google Sign-In / Firebase");
console.log("Package: net.mocomo.app");
console.log("");
console.log("Upload key SHA-1 (local AAB signing):");
console.log(" ", sha1 ?? "(failed to read)");
if (firebaseHash) {
  console.log("Firebase certificate_hash:", firebaseHash);
}
console.log("");
console.log("Play Store installs use a DIFFERENT app signing key.");
console.log("Add that SHA-1 too:");
console.log("  1. Play Console → MoCoMo → Test and release → App integrity");
console.log("  2. Copy App signing key certificate → SHA-1");
console.log("  3. Firebase → Project settings → Android app → Add fingerprint");
console.log("  4. Re-download google-services.json → apps/mobile/google-services.json");
console.log("  5. Rebuild AAB");
