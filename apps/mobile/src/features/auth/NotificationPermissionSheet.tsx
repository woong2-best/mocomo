import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Notifications from "expo-notifications";
import { markNotificationPromptSeen } from "@/lib/onboarding-store";
import { radii } from "@/theme/tokens";

type Props = {
  visible: boolean;
  onComplete: () => void;
};

/** X-style notification priming — shown once on fresh install before login. */
export function NotificationPermissionSheet({ visible, onComplete }: Props) {
  const insets = useSafeAreaInsets();

  async function finish(allow: boolean) {
    await markNotificationPromptSeen();
    if (allow) {
      await Notifications.requestPermissionsAsync({
        ios: { allowAlert: true, allowBadge: true, allowSound: true },
      }).catch(() => undefined);
    }
    onComplete();
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={() => void finish(false)}>
      <View style={styles.root}>
        <Pressable style={styles.scrim} onPress={() => void finish(false)} />
        <View style={[styles.sheet, { paddingBottom: insets.bottom + 12 }]}>
          <View style={styles.iconWrap}>
            <Ionicons name="notifications" size={32} color="#1DA1F2" />
          </View>
          <Text style={styles.title}>MoCoMo에서 알림을 보내도록{"\n"}허용하시겠습니까?</Text>
          <Text style={styles.sub}>
            새 메시지, 라이브, 활동 알림을 받을 수 있습니다.
          </Text>

          <Pressable style={styles.allowBtn} onPress={() => void finish(true)}>
            <Text style={styles.allowText}>허용</Text>
          </Pressable>
          <Pressable style={styles.denyBtn} onPress={() => void finish(false)}>
            <Text style={styles.denyText}>허용 안함</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, justifyContent: "flex-end" },
  scrim: { ...StyleSheet.absoluteFill, backgroundColor: "rgba(0,0,0,0.55)" },
  sheet: {
    backgroundColor: "#16181C",
    borderTopLeftRadius: radii.xl,
    borderTopRightRadius: radii.xl,
    paddingHorizontal: 24,
    paddingTop: 28,
    alignItems: "center",
  },
  iconWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "rgba(29,161,242,0.15)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
  },
  title: {
    color: "#E7E9EA",
    fontSize: 20,
    fontWeight: "800",
    textAlign: "center",
    lineHeight: 28,
    marginBottom: 10,
  },
  sub: {
    color: "#71767B",
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 24,
  },
  allowBtn: {
    width: "100%",
    paddingVertical: 16,
    alignItems: "center",
    borderRadius: radii.pill,
    backgroundColor: "#E7E9EA",
    marginBottom: 8,
  },
  allowText: { color: "#0F1419", fontSize: 16, fontWeight: "800" },
  denyBtn: {
    width: "100%",
    paddingVertical: 16,
    alignItems: "center",
    borderRadius: radii.pill,
  },
  denyText: { color: "#E7E9EA", fontSize: 16, fontWeight: "700" },
});
