import { Image } from "expo-image";
import { StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";

const UNREAD = require("../../assets/mailbox/unread.png");
const EMPTY = require("../../assets/mailbox/empty.png");

type Props = {
  unread: boolean;
  size?: number;
  style?: StyleProp<ViewStyle>;
};

/** User-provided mailbox art — unread vs empty/read. */
export function MailboxIcon({ unread, size = 30, style }: Props) {
  return (
    <View style={[styles.wrap, { width: size, height: size }, style]}>
      <Image
        source={unread ? UNREAD : EMPTY}
        style={{ width: size, height: size }}
        contentFit="contain"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: "center",
    justifyContent: "center",
  },
});
