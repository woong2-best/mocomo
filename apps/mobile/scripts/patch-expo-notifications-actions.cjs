/**
 * Patch expo-notifications Android builder to use MoCoMo PNG drawables on action buttons.
 */
const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const TARGET = path.join(
  ROOT,
  "node_modules/expo-notifications/android/src/main/java/expo/modules/notifications/notifications/model/NotificationAction.kt"
);

const MARKER = "MOCOMO_ACTION_ICON";

function patchNotificationAction() {
  if (!fs.existsSync(TARGET)) {
    console.warn("[patch-expo-notifications-actions] skip — expo-notifications not installed");
    return;
  }

  let src = fs.readFileSync(TARGET, "utf8");
  if (src.includes(MARKER)) return;

  if (!src.includes("class NotificationAction")) {
    console.warn("[patch-expo-notifications-actions] skip — unexpected file shape");
    return;
  }

  const helper = `
  // ${MARKER}
  fun iconResourceId(context: android.content.Context): Int? {
    val res = context.resources
    val pkg = context.packageName
    val name = when (identifier) {
      "post_reply" -> "notification_action_reply"
      "post_star" -> "notification_action_star"
      "post_heart" -> "notification_action_heart"
      else -> return null
    }
    val id = res.getIdentifier(name, "drawable", pkg)
    return if (id != 0) id else null
  }
`;

  src = src.replace(/\n}\s*$/, `${helper}\n}\n`);

  const builderTarget = path.join(
    ROOT,
    "node_modules/expo-notifications/android/src/main/java/expo/modules/notifications/notifications/presentation/builders/ExpoNotificationBuilder.kt"
  );

  if (fs.existsSync(builderTarget)) {
    let builder = fs.readFileSync(builderTarget, "utf8");
    if (!builder.includes(MARKER)) {
      builder = builder.replace(
        /NotificationCompat\.Action\.Builder\(\s*0,/g,
        `NotificationCompat.Action.Builder(action.iconResourceId(context) ?: 0,`
      );
      fs.writeFileSync(builderTarget, builder);
    }
  }

  fs.writeFileSync(TARGET, src);
  console.log("[patch-expo-notifications-actions] patched action icon mapping");
}

patchNotificationAction();
