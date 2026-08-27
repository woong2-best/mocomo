import { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Linking,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRoute, useNavigation, type RouteProp } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as WebBrowser from "expo-web-browser";
import { fetchCommunityJitsiRoom } from "@/api/community";
import { AppHeader } from "@/ui/AppHeader";
import { Screen } from "@/ui/Screen";
import { useTheme } from "@/theme/ThemeContext";
import { radii, spacing, type ThemeColors } from "@/theme/tokens";
import type { RootStackParamList } from "@/navigation/types";

/** Opens Jitsi in system browser / Jitsi app — no in-app WebView embed. */
export function CommunityVoiceScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const route = useRoute<RouteProp<RootStackParamList, "CommunityVoice">>();
  const { channelName, voiceChannelId, channelType } = route.params;

  const [loading, setLoading] = useState(false);
  const [joined, setJoined] = useState(false);

  const join = useCallback(async () => {
    setLoading(true);
    try {
      const room = await fetchCommunityJitsiRoom(voiceChannelId);
      const opened = await WebBrowser.openBrowserAsync(room.joinUrl, {
        presentationStyle: WebBrowser.WebBrowserPresentationStyle.FULL_SCREEN,
        enableBarCollapsing: true,
      });
      setJoined(opened.type !== "cancel");
    } catch (e) {
      Alert.alert(
        "입장 실패",
        e instanceof Error ? e.message : "음성 채널에 연결할 수 없습니다."
      );
    } finally {
      setLoading(false);
    }
  }, [voiceChannelId]);

  const openJitsiApp = useCallback(async () => {
    try {
      const room = await fetchCommunityJitsiRoom(voiceChannelId);
      const deepLink = `org.jitsi.meet://${room.roomName}`;
      const canOpen = await Linking.canOpenURL(deepLink);
      if (canOpen) {
        await Linking.openURL(deepLink);
      } else {
        await join();
      }
    } catch {
      await join();
    }
  }, [join, voiceChannelId]);

  const isVideo = channelType === "VIDEO";

  return (
    <Screen style={styles.screen}>
      <AppHeader title={channelName} leftLabel="뒤로" onLeftPress={() => navigation.goBack()} />
      <View style={[styles.body, { paddingBottom: insets.bottom + spacing.lg }]}>
        <View style={styles.hero}>
          <View style={styles.iconWrap}>
            <Ionicons name={isVideo ? "videocam" : "volume-high"} size={36} color={colors.brand} />
          </View>
          <Text style={styles.title}>{channelName}</Text>
          <Text style={styles.sub}>
            {isVideo ? "영상 음성 채널" : "음성 채널"} · Jitsi SFU
          </Text>
          <Text style={styles.hint}>
            MoCoMo 앱 정책상 음성·영상은 Jitsi 앱 또는 시스템 브라우저에서 진행됩니다. 통화
            종료 후 이 화면으로 돌아옵니다.
          </Text>
        </View>

        <Pressable
          style={[styles.primaryBtn, loading && styles.btnDisabled]}
          disabled={loading}
          onPress={() => void openJitsiApp()}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Ionicons name="enter-outline" size={20} color="#fff" />
              <Text style={styles.primaryBtnText}>{joined ? "다시 입장" : "음성 채널 입장"}</Text>
            </>
          )}
        </Pressable>

        <Pressable style={styles.secondaryBtn} disabled={loading} onPress={() => void join()}>
          <Text style={styles.secondaryBtnText}>브라우저에서 열기</Text>
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
    secondaryBtn: {
      alignItems: "center",
      paddingVertical: 12,
    },
    secondaryBtnText: { color: colors.brand, fontWeight: "700" },
    btnDisabled: { opacity: 0.7 },
  });
}
