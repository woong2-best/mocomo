import { useMemo, useState } from "react";
import { Image } from "expo-image";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { fetchLiveDetail } from "@/api/live";
import { useAuth } from "@/auth/AuthContext";
import { AiDonationOverlay } from "@/features/live/ai/AiDonationOverlay";
import { LiveChatPanel } from "@/features/live/LiveChatPanel";
import { liveCategoryEnglish } from "@/features/live/live-categories";
import { liveUi } from "@/features/live/live-ui";
import { useI18n } from "@/i18n/I18nProvider";
import { FolkButton } from "@/ui/FolkButton";

type Props = {
  channelId: string;
  poster: number;
  title: string;
  host: string;
  role: string;
};

/** Always-on AI room: same shell as a normal live (stage, category, chat, tip). */
export function AiLiveRoom({ channelId, poster, title, host, role }: Props) {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { t } = useI18n();
  const copy = useMemo(() => liveUi(t), [t]);
  const { user } = useAuth();
  const query = useQuery({
    queryKey: ["mobile-live", channelId],
    queryFn: () => fetchLiveDetail(channelId),
    staleTime: 15_000,
  });
  const item = query.data?.item;
  const category = liveCategoryEnglish(item?.category ?? "JUST_CHATTING");
  const [stageH, setStageH] = useState(0);

  return (
    <View style={styles.root}>
      <View style={[styles.statusShield, { height: insets.top }]} />
      <View
        style={styles.stage}
        onLayout={(event) => {
          const next = Math.round(event.nativeEvent.layout.height);
          setStageH((prev) => (prev === next ? prev : next));
        }}
      >
        <Image source={poster} style={StyleSheet.absoluteFill} contentFit="cover" />
        <AiDonationOverlay channelId={channelId} />
        <Pressable
          onPress={() => navigation.goBack()}
          hitSlop={12}
          style={styles.back}
          accessibilityRole="button"
          accessibilityLabel={copy.back}
        >
          <Ionicons name="chevron-back" size={30} color="#fff" />
        </Pressable>
      </View>
      <View style={styles.meta}>
        <View style={styles.pills}>
          <Text style={styles.livePill}>LIVE</Text>
          <Text style={styles.catPill}>{category}</Text>
        </View>
        <Text style={styles.title} numberOfLines={1}>
          {title}
        </Text>
        <Text style={styles.sub} numberOfLines={1}>
          {host} · {role}
        </Text>
      </View>
      <View style={styles.chat}>
        {item ? (
          <LiveChatPanel
            immersive
            overlayHeight={stageH}
            channelId={channelId}
            viewerCount={item.viewerCount}
            isHost={false}
            paymentsEnabled={item.paymentsEnabled}
            hostDisplayName={host}
            hostUserId={item.host.id}
            hostUsername={item.host.username}
            pinnedMessage={item.pinnedMessage}
            currentUserId={user?.id}
            streamStartedAt={item.streamStartedAt}
          />
        ) : query.isError ? (
          <View style={styles.center}>
            <Text style={styles.error}>{copy.loadHubError}</Text>
            <FolkButton label={copy.retry} onPress={() => void query.refetch()} />
          </View>
        ) : (
          <ActivityIndicator style={styles.spinner} color="#F5C518" />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#131C2D" },
  statusShield: { width: "100%", backgroundColor: "#131C2D" },
  stage: {
    width: "100%",
    aspectRatio: 16 / 9,
    backgroundColor: "#000",
    overflow: "hidden",
  },
  back: {
    position: "absolute",
    top: 6,
    left: 6,
    padding: 4,
  },
  meta: {
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 8,
    gap: 4,
  },
  pills: { flexDirection: "row", alignItems: "center", gap: 6 },
  livePill: {
    color: "#fff",
    backgroundColor: "#e11d48",
    overflow: "hidden",
    borderRadius: 4,
    paddingHorizontal: 7,
    paddingVertical: 2,
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 0.6,
  },
  catPill: {
    color: "#fff",
    backgroundColor: "rgba(255,255,255,0.14)",
    overflow: "hidden",
    borderRadius: 4,
    paddingHorizontal: 7,
    paddingVertical: 2,
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.6,
  },
  title: { color: "#f3f4f6", fontSize: 16, fontWeight: "800" },
  sub: { color: "#9ca3af", fontSize: 13, fontWeight: "600" },
  chat: { flex: 1, overflow: "visible" },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12, padding: 20 },
  error: { color: "#f87171", fontWeight: "600", textAlign: "center" },
  spinner: { marginTop: 28 },
});
