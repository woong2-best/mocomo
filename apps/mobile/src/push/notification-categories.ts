/** Shared identifiers — must match native config plugin + FCM payload. */
export const POST_INTERACTION_CATEGORY = "post_interaction";

export const POST_REPLY_ACTION = "post_reply";
export const POST_STAR_ACTION = "post_star";
export const POST_HEART_ACTION = "post_heart";

/** Icon-only labels: zero-width space keeps actions tappable without visible text. */
const ICON_ONLY_LABEL = "\u200B";

export async function registerPostInteractionCategory(): Promise<void> {
  const Notifications = await import("expo-notifications");

  await Notifications.setNotificationCategoryAsync(POST_INTERACTION_CATEGORY, [
    {
      identifier: POST_REPLY_ACTION,
      buttonTitle: ICON_ONLY_LABEL,
      textInput: {
        submitButtonTitle: "전송",
        placeholder: "답글…",
      },
      options: {
        opensAppToForeground: false,
      },
    },
    {
      identifier: POST_STAR_ACTION,
      buttonTitle: ICON_ONLY_LABEL,
      options: {
        opensAppToForeground: false,
      },
    },
    {
      identifier: POST_HEART_ACTION,
      buttonTitle: ICON_ONLY_LABEL,
      options: {
        opensAppToForeground: false,
      },
    },
  ]);
}

export async function registerAllNotificationCategories(): Promise<void> {
  await registerPostInteractionCategory();
}
