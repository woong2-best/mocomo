import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { ScrollView } from "react-native-gesture-handler";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { SHARE_SHEET } from "@/features/share/share-sheet-theme";

export type ShareOutsideId = "copy" | "instagram" | "whatsapp" | "sms" | "more";

type Action = {
  id: ShareOutsideId;
  label: string;
};

type Props = {
  title: string;
  copyLabel: string;
  instagramLabel: string;
  whatsappLabel: string;
  smsLabel: string;
  moreLabel: string;
  busyId?: ShareOutsideId | null;
  onPress: (id: ShareOutsideId) => void;
};

export function ShareOutsideActions({
  title,
  copyLabel,
  instagramLabel,
  whatsappLabel,
  smsLabel,
  moreLabel,
  busyId,
  onPress,
}: Props) {
  const actions: Action[] = [
    { id: "copy", label: copyLabel },
    { id: "instagram", label: instagramLabel },
    { id: "whatsapp", label: whatsappLabel },
    { id: "sms", label: smsLabel },
    { id: "more", label: moreLabel },
  ];

  return (
    <View>
      <Text style={styles.section}>{title}</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.row}
      >
        {actions.map((action) => (
          <Pressable
            key={action.id}
            style={styles.item}
            onPress={() => onPress(action.id)}
            disabled={!!busyId}
            accessibilityRole="button"
            accessibilityLabel={action.label}
          >
            <View style={styles.iconWrap}>
              <ActionGlyph id={action.id} />
              {busyId === action.id ? (
                <View style={styles.busy}>
                  <ActivityIndicator color="#fff" size="small" />
                </View>
              ) : null}
            </View>
            <Text style={styles.label} numberOfLines={1} ellipsizeMode="tail">
              {action.label}
            </Text>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}

function ActionGlyph({ id }: { id: ShareOutsideId }) {
  if (id === "instagram") {
    return (
      <LinearGradient colors={[...SHARE_SHEET.instagram]} style={styles.icon}>
        <Ionicons name="logo-instagram" size={26} color="#fff" />
      </LinearGradient>
    );
  }
  if (id === "whatsapp") {
    return (
      <View style={[styles.icon, { backgroundColor: SHARE_SHEET.whatsapp }]}>
        <Ionicons name="logo-whatsapp" size={26} color="#fff" />
      </View>
    );
  }
  if (id === "sms") {
    return (
      <View style={[styles.icon, { backgroundColor: SHARE_SHEET.sms }]}>
        <Ionicons name="chatbubble" size={22} color="#fff" />
      </View>
    );
  }
  return (
    <View style={[styles.icon, { backgroundColor: SHARE_SHEET.iconMuted }]}>
      <Ionicons
        name={id === "copy" ? "link-outline" : "ellipsis-horizontal"}
        size={22}
        color={SHARE_SHEET.text}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    paddingHorizontal: 20,
    paddingTop: 6,
    paddingBottom: 12,
    color: SHARE_SHEET.muted,
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.8,
  },
  row: {
    paddingHorizontal: 16,
    paddingBottom: 8,
    gap: 16,
  },
  item: {
    width: 72,
    alignItems: "center",
    gap: 8,
  },
  iconWrap: {
    width: 56,
    height: 56,
  },
  icon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
  },
  label: {
    width: "100%",
    color: SHARE_SHEET.textSecondary,
    fontSize: 11,
    fontWeight: "500",
    textAlign: "center",
  },
  busy: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    borderRadius: 28,
    backgroundColor: "rgba(0,0,0,0.4)",
    alignItems: "center",
    justifyContent: "center",
  },
});
