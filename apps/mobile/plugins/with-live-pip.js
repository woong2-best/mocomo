/**
 * Expo config plugin — enable Android Activity Picture-in-Picture for live.
 * Patches MainActivity + AndroidManifest so home/gesture can auto-enter PiP.
 */
const {
  withAndroidManifest,
  withMainActivity,
  createRunOncePlugin,
} = require("@expo/config-plugins");

const TAG = "with-live-pip";

function ensurePipManifest(androidManifest) {
  const app = androidManifest.manifest.application?.[0];
  if (!app?.activity) return androidManifest;

  for (const activity of app.activity) {
    const name = activity.$?.["android:name"];
    if (!name || !String(name).endsWith("MainActivity")) continue;

    activity.$["android:supportsPictureInPicture"] = "true";
    // Keep predictive-back from finishing the activity before auto-enter PiP can run.
    activity.$["android:enableOnBackInvokedCallback"] = "false";

    const existing = activity.$["android:configChanges"] || "";
    const needed = [
      "keyboard",
      "keyboardHidden",
      "orientation",
      "screenSize",
      "screenLayout",
      "uiMode",
      "smallestScreenSize",
      "density",
    ];
    const set = new Set(
      existing
        .split("|")
        .map((s) => s.trim())
        .filter(Boolean)
    );
    for (const n of needed) set.add(n);
    activity.$["android:configChanges"] = [...set].join("|");
  }
  return androidManifest;
}

const PIP_IMPORT = "import net.mocomo.livepip.LivePipBridge";
const PIP_MARKER = "MOCOMO_LIVE_PIP";

function injectMainActivityKotlin(src) {
  if (src.includes(PIP_MARKER)) return src;

  let next = src;
  if (!next.includes(PIP_IMPORT)) {
    next = next.replace(
      /import expo\.modules\.ReactActivityDelegateWrapper/,
      `import expo.modules.ReactActivityDelegateWrapper\n\nimport android.app.PictureInPictureParams\nimport android.content.res.Configuration\nimport android.os.Build\nimport net.mocomo.livepip.LivePipBridge`
    );
  }

  // Avoid duplicate Build import if already present — cleaned below.
  next = next.replace(
    /import android\.os\.Build\nimport android\.os\.Build\n/,
    "import android.os.Build\n"
  );

  if (!next.includes("onUserLeaveHint")) {
    next = next.replace(
      /override fun invokeDefaultOnBackPressed\(\) \{[\s\S]*?\n  \}/,
      (block) =>
        `${block}

  // ${PIP_MARKER}
  override fun onUserLeaveHint() {
    super.onUserLeaveHint()
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O &&
        Build.VERSION.SDK_INT < Build.VERSION_CODES.S &&
        LivePipBridge.enabled
    ) {
      LivePipBridge.tryEnter(this)
    }
  }

  override fun onPictureInPictureModeChanged(
    isInPictureInPictureMode: Boolean,
    newConfig: Configuration
  ) {
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
      super.onPictureInPictureModeChanged(isInPictureInPictureMode, newConfig)
    }
    LivePipBridge.onPipModeChanged(isInPictureInPictureMode)
  }

  override fun onResume() {
    super.onResume()
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
      try {
        setPictureInPictureParams(LivePipBridge.buildParams())
      } catch (_: Throwable) {
      }
    }
  }`
    );
  }

  return next;
}

const withLivePip = (config) => {
  config = withAndroidManifest(config, (cfg) => {
    cfg.modResults = ensurePipManifest(cfg.modResults);
    return cfg;
  });

  config = withMainActivity(config, (cfg) => {
    if (cfg.modResults.language === "kt") {
      cfg.modResults.contents = injectMainActivityKotlin(cfg.modResults.contents);
    }
    return cfg;
  });

  return config;
};

module.exports = createRunOncePlugin(withLivePip, TAG, "1.0.0");
