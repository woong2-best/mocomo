import { ActionSheetIOS, Alert, Platform } from "react-native";

export function showMessageReplyMenu(
  onReply: () => void,
  labels: { reply: string; cancel: string }
) {
  if (Platform.OS === "ios") {
    ActionSheetIOS.showActionSheetWithOptions(
      { options: [labels.cancel, labels.reply], cancelButtonIndex: 0 },
      (index) => {
        if (index === 1) onReply();
      }
    );
    return;
  }
  Alert.alert("", undefined, [
    { text: labels.cancel, style: "cancel" },
    { text: labels.reply, onPress: onReply },
  ]);
}
