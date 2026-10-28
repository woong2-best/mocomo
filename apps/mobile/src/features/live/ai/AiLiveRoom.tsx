import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";
import { setAudioModeAsync } from "expo-audio";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { fetchLiveDetail } from "@/api/live";
import { ApiError } from "@/api/client";
import { useAuth } from "@/auth/AuthContext";
import { AiDonationOverlay } from "@/features/live/ai/AiDonationOverlay";
import { AiVrmStage, type AiVrmHandle } from "@/features/live/ai/AiVrmStage";
import { defaultAiStage, fetchAiStage, speakAiHost, type AiStageFiles } from "@/features/live/ai/ai-speak";
import { LiveChatPanel } from "@/features/live/LiveChatPanel";
import { liveUi } from "@/features/live/live-ui";
import { useI18n } from "@/i18n/I18nProvider";
import type { RootStackParamList } from "@/navigation/types";
import { FolkAvatar } from "@/ui/FolkAvatar";

type Props = {
  channelId: string;
  poster: number;
  title: string;
  host: string;
  role: string;
  characterId?: string;
};

/**
 * Avatar room uses the same portrait shell as a real live:
 * stage on top, chat filling the rest, donations on the stage.
 * The stage is the website VRM (motion + voice), not a still poster.
 */
export function AiLiveRoom({ channelId, poster, title: _title, host, role: _role, characterId = "zelie" }: Props) {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const insets = useSafeAreaInsets();
  const { t } = useI18n();
  const copy = useMemo(() => liveUi(t), [t]);
  const { user } = useAuth();
  const stageRef = useRef<AiVrmHandle>(null);
  const [stage, setStage] = useState<AiStageFiles>(() => defaultAiStage(characterId));
  const query = useQuery({
    queryKey: ["mobile-live", channelId],
    queryFn: () => fetchLiveDetail(channelId),
    staleTime: 15_000,
  });
  const item = query.data?.item;
  const profileUsername = item?.host.username?.trim() || "";
  const profileName = item?.host.name?.trim() || host;
  const profileImage = item?.host.image ?? null;

  useEffect(() => {
    let alive = true;
    void fetchAiStage(characterId).then((next) => {
      if (alive) setStage(next);
    });
    void setAudioModeAsync({ playsInSilentMode: true, allowsRecording: false }).catch(() => undefined);
    return () => {
      alive = false;
    };
  }, [characterId]);

  const onLocalSend = useCallback(
    async (text: string) => {
      const who = stage?.characterId ?? characterId;
      stageRef.current?.setThinking(true);
      try {
        const spoken = await speakAiHost(text, who);
        stageRef.current?.play(spoken.audioBase64, spoken.emotion, spoken.text);
        return spoken.text ? { username: host, content: spoken.text } : null;
      } catch (err) {
        if (err instanceof ApiError && err.status === 401) {
          return { username: host, content: t("m.common.sign_in_required") };
        }
        return { username: host, content: t("m.live.could_not_connect_to_the_live") };
      } finally {
        stageRef.current?.setThinking(false);
      }
    },
    [characterId, host, stage?.characterId, t]
  );

  return (
    <View style={styles.root}>
      <View style={[styles.statusShield, { height: insets.top }]} />
      <View style={styles.stage}>
        <AiVrmStage
          ref={stageRef}
          vrmUrl={stage.vrmUrl}
          backdropUrl={stage.backdropUrl}
          characterId={stage.characterId}
          poster={poster}
        />
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
        {profileUsername ? (
          <Pressable
            onPress={() =>
              navigation.navigate("UserProfile", {
                username: profileUsername,
                name: profileName,
                image: profileImage,
              })
            }
            style={styles.hostChip}
            accessibilityRole="button"
            accessibilityLabel={`@${profileUsername}`}
          >
            <FolkAvatar uri={profileImage} name={profileName} size={26} framed={false} />
            <Text style={styles.hostChipText}>@{profileUsername}</Text>
          </Pressable>
        ) : null}
      </View>
      <View style={styles.chat}>
        <LiveChatPanel
          immersive
          channelId={channelId}
          viewerCount={item?.viewerCount ?? 0}
          isHost={false}
          paymentsEnabled={item?.paymentsEnabled}
          hostDisplayName={profileName}
          hostUserId={item?.host.id}
          hostUsername={profileUsername || host}
          pinnedMessage={item?.pinnedMessage}
          currentUserId={user?.id}
          streamStartedAt={item?.streamStartedAt}
          viewerSupportTier={item?.viewerSupportTier ?? null}
          onLocalSend={onLocalSend}
        />
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
    zIndex: 5,
  },
  hostChip: {
    position: "absolute",
    left: 8,
    bottom: 8,
    zIndex: 5,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    maxWidth: "70%",
    paddingVertical: 4,
    paddingLeft: 4,
    paddingRight: 10,
    borderRadius: 10,
    backgroundColor: "rgba(0,0,0,0.55)",
  },
  hostChipText: { color: "#fff", fontWeight: "800", fontSize: 13 },
  chat: { flex: 1, overflow: "visible" },
});
