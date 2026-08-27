import { useCallback, useMemo, useState } from "react";
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRoute, useNavigation, type RouteProp } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AppHeader } from "@/ui/AppHeader";
import { Screen } from "@/ui/Screen";
import { useTheme } from "@/theme/ThemeContext";
import { radii, spacing, type ThemeColors } from "@/theme/tokens";
import type { RootStackParamList } from "@/navigation/types";

/** Community voice uses WebRTC mesh on web — open mocomo.net in browser for now. */
export function CommunityVoiceScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const route = useRoute<RouteProp<RootStackParamList, "CommunityVoice">>();
  const { channelName } = route.params;

  const [loading] = useState(false);

  const showWebHint = useCallback(() => {
    Alert.alert(
      "웹에서 이용",
      "커뮤니티 음성 채널은 현재 mocomo.net 웹에서 이용할 수 있습니다. 앱 내 WebRTC 음성은 다음 업데이트 예정입니다."
    );
  }, []);

  return (
    <Screen style={styles.screen}>
      <AppHeader title={channelName} leftLabel="뒤로" onLeftPress={() => navigation.goBack()} />
      <View style={[styles.body, { paddingBottom: insets.bottom + spacing.lg }]}>
        <View style={styles.hero}>
          <View style={styles.iconWrap}>
            <Ionicons name="volume-high" size={36} color={colors.brand} />
          </View>
          <Text style={styles.title}>{channelName}</Text>
          <Text style={styles.sub}>음성 채널 · Cloudflare TURN</Text>
          <Text style={styles.hint}>
            모바일 앱에서는 아직 음성 입장 UI가 없습니다. PC 또는 모바일 브라우저에서 커뮤니티
            음성 채널에 참가해 주세요.
          </Text>
        </View>

        <Pressable
          style={[styles.primaryBtn, loading && styles.btnDisabled]}
          disabled={loading}
          onPress={showWebHint}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Ionicons name="globe-outline" size={20} color="#fff" />
              <Text style={styles.primaryBtnText}>웹에서 열기 안내</Text>
            </>
          )}
        </Pressable>
      </View>
    </Screen>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.background },
    body: {
      flex: 1,
      paddingHorizontal: spacing.lg,
      justifyContent: "center",
      gap: spacing.md,
    },
    hero: { alignItems: "center", gap: spacing.sm, marginBottom: spacing.lg },
    iconWrap: {
      width: 72,
      height: 72,
      borderRadius: radii.xl,
      backgroundColor: `${colors.brand}22`,
      alignItems: "center",
      justifyContent: "center",
    },
    title: { fontSize: 22, fontWeight: "800", color: colors.text, textAlign: "center" },
    sub: { fontSize: 14, fontWeight: "600", color: colors.textMuted },
    hint: {
      fontSize: 13,
      lineHeight: 20,
      color: colors.textMuted,
      textAlign: "center",
      marginTop: spacing.sm,
    },
    primaryBtn: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
      backgroundColor: colors.brand,
      paddingVertical: 16,
      borderRadius: radii.lg,
    },
    primaryBtnText: { color: "#fff", fontWeight: "800", fontSize: 16 },
    btnDisabled: { opacity: 0.7 },
  });
}
