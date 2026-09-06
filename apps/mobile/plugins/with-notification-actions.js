/**
 * Expo config plugin — bundle PNG action icons + register iOS notification category with icons.
 * Android drawables are copied for the expo-notifications action icon patch.
 */
const fs = require("fs");
const path = require("path");
const {
  withAppDelegate,
  withDangerousMod,
  withXcodeProject,
  IOSConfig,
  createRunOncePlugin,
} = require("@expo/config-plugins");

const CATEGORY_ID = "post_interaction";
const ACTION_FILES = [
  { asset: "action-reply.png", ios: "notification-action-reply", android: "notification_action_reply" },
  { asset: "action-star.png", ios: "notification-action-star", android: "notification_action_star" },
  { asset: "action-heart.png", ios: "notification-action-heart", android: "notification_action_heart" },
];

function assetDir(projectRoot) {
  return path.join(projectRoot, "assets", "notifications");
}

function copyActionAssets(projectRoot, targetDir, renameFn) {
  fs.mkdirSync(targetDir, { recursive: true });
  for (const file of ACTION_FILES) {
    const src = path.join(assetDir(projectRoot), file.asset);
    if (!fs.existsSync(src)) continue;
    fs.copyFileSync(src, path.join(targetDir, renameFn(file)));
  }
}

function injectIosCategories(appDelegate) {
  if (appDelegate.includes("MOCOMO_POST_INTERACTION_CATEGORY")) return appDelegate;

  const importBlock = "#import <UserNotifications/UserNotifications.h>";
  if (!appDelegate.includes(importBlock)) {
    appDelegate = appDelegate.replace(
      /#import "AppDelegate\.h"/,
      `#import "AppDelegate.h"\n${importBlock}`
    );
  }

  const swiftImport = "import UserNotifications";
  if (appDelegate.includes("func application(_ application: UIApplication")) {
    if (!appDelegate.includes(swiftImport)) {
      appDelegate = `${swiftImport}\n\n${appDelegate}`;
    }
  }

  const hook = `
    // MOCOMO_POST_INTERACTION_CATEGORY
    if #available(iOS 15.0, *) {
      let reply = UNTextInputNotificationAction(
        identifier: "post_reply",
        title: "",
        icon: UNNotificationActionIcon(templateImageName: "notification-action-reply"),
        options: [],
        textInputButtonTitle: "전송",
        textInputPlaceholder: "답글…"
      )
      let star = UNNotificationAction(
        identifier: "post_star",
        title: "",
        icon: UNNotificationActionIcon(templateImageName: "notification-action-star"),
        options: []
      )
      let heart = UNNotificationAction(
        identifier: "post_heart",
        title: "",
        icon: UNNotificationActionIcon(templateImageName: "notification-action-heart"),
        options: []
      )
      let category = UNNotificationCategory(
        identifier: "${CATEGORY_ID}",
        actions: [reply, star, heart],
        intentIdentifiers: [],
        options: []
      )
      UNUserNotificationCenter.current().setNotificationCategories([category])
    }
`;

  if (appDelegate.includes("didFinishLaunchingWithOptions")) {
    appDelegate = appDelegate.replace(
      /return super\.application\(application, didFinishLaunchingWithOptions: launchOptions\)/,
      `${hook}\n    return super.application(application, didFinishLaunchingWithOptions: launchOptions)`
    );
  }

  return appDelegate;
}

function withNotificationActions(config) {
  config = withDangerousMod(config, [
    "android",
    (cfg) => {
      const { projectRoot, platformProjectRoot } = cfg.modRequest;
      const drawableDir = path.join(platformProjectRoot, "app", "src", "main", "res", "drawable-xxhdpi");
      copyActionAssets(projectRoot, drawableDir, (file) => `${file.android}.png`);
      return cfg;
    },
  ]);

  config = withDangerousMod(config, [
    "ios",
    (cfg) => {
      const { projectRoot, platformProjectRoot } = cfg.modRequest;
      const projectName = IOSConfig.XcodeUtils.getProjectName(projectRoot);
      const targetDir = path.join(platformProjectRoot, projectName, "NotificationActions");
      copyActionAssets(projectRoot, targetDir, (file) => `${file.ios}.png`);
      return cfg;
    },
  ]);

  config = withXcodeProject(config, (cfg) => {
    const project = cfg.modResults;
    const projectRoot = cfg.modRequest.projectRoot;
    const projectName = IOSConfig.XcodeUtils.getProjectName(projectRoot);
    for (const file of ACTION_FILES) {
      const rel = `${projectName}/NotificationActions/${file.ios}.png`;
      if (!project.hasFile(rel)) {
        project.addResourceFile(rel, {}, projectName);
      }
    }
    return cfg;
  });

  config = withAppDelegate(config, (cfg) => {
    cfg.modResults.contents = injectIosCategories(cfg.modResults.contents);
    return cfg;
  });

  return config;
}

module.exports = createRunOncePlugin(withNotificationActions, "with-notification-actions", "1.0.0");
