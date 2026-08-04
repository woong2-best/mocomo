import { useMemo } from "react";
import { Linking, Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { AppHeader } from "@/ui/AppHeader";
import { FolkCard } from "@/ui/FolkCard";
import { Screen } from "@/ui/Screen";
import { useTheme } from "@/theme/ThemeContext";
import { radii, shadows, spacing, type ThemeColors } from "@/theme/tokens";
import type { RootStackParamList } from "@/navigation/types";

export function LiveGoLiveScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => createThemedStyles(colors), [colors]);

  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  return (
    <Screen>
      <AppHeader title="라이브 방송" leftLabel="뒤로" onLeftPress={() => navigation.goBack()} />
      <View style={styles.body}>
        <FolkCard>
          <Text style={styles.title}>외부 방송 연결 (웹)</Text>
          <Text style={styles.copy}>
            자체 송출은 종료되었습니다. 유튜브·트위치 등 외부 방송을 mocomo.net에서 연결하세요.
            앱에서는 목록·딥링크로 시청할 수 있습니다.
          </Text>
          <Pressable
            style={styles.btn}
            onPress={() => void Linking.openURL("https://mocomo.net/live/external/new")}
          >
            <Ionicons name="open-outline" size={18} color="#fff" />
            <Text style={styles.btnText}>웹에서 방송 연결</Text>
          </Pressable>
          <Pressable
            style={[styles.btn, styles.btnSecondary]}
            onPress={() => navigation.navigate("LiveList")}
          >
            <Text style={styles.btnSecondaryText}>진행 중 방송 보기</Text>
          </Pressable>
        </FolkCard>
      </View>
    </Screen>
  );
}

function createThemedStyles(colors: ThemeColors) {
  return StyleSheet.create({
  body: { padding: spacing.md },
  title: { fontSize: 20, fontWeight: "800", color: colors.cobalt },
  copy: { marginTop: spacing.sm, color: colors.text, lineHeight: 22, fontWeight: "600" },
  btn: {
    marginTop: spacing.md,
    backgroundColor: colors.cobalt,
    borderRadius: radii.md,
    paddingVertical: 12,
    paddingHorizontal: spacing.md,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    ...shadows.folkSm,
  },
  btnText: { color: "#fff", fontWeight: "800" },
  btnSecondary: {
    backgroundColor: colors.muted,
    borderWidth: 2,
    borderColor: "rgba(27, 74, 140, 0.22)",
  },
  btnSecondaryText: { color: colors.cobalt, fontWeight: "800" },
});
}

