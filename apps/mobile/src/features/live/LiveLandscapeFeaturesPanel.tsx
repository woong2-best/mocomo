import { useCallback, useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toggleFollowUser } from "@/api/social";
import { FolkAvatar } from "@/ui/FolkAvatar";
import { LiveSupportPanels } from "@/features/live/LiveSupportPanels";
import { LiveSupportSheet } from "@/features/live/LiveSupportSheet";
import { LiveMocoDonationMenuSheet } from "@/features/live/LiveMocoDonationMenuSheet";
import { LiveMocoSfxDonationSheet } from "@/features/live/LiveMocoSfxDonationSheet";
import { LiveMocoVideoDonationSheet } from "@/features/live/LiveMocoVideoDonationSheet";
import { liveUi } from "@/features/live/live-ui";
import { useI18n } from "@/i18n/I18nProvider";
import { useMoneyAgeGate } from "@/hooks/useMoneyAgeGate";
import { useTheme } from "@/theme/ThemeContext";
import { radii, type ThemeColors } from "@/theme/tokens";

type Props = {
  channelId: string;
  hostUserId: string;
  hostUsername: string;
  hostDisplayName: string;
  hostImage?: string | null;
  hostFollowing?: boolean;
  isHost?: boolean;
  currentUserId?: string;
};

export function LiveLandscapeFeaturesPanel({
  channelId,
  hostUserId,
  hostUsername,
  hostDisplayName,
  hostImage,
  hostFollowing,
  isHost,
  currentUserId,
}: Props) {
  const { t } = useI18n();
  const copy = useMemo(() => liveUi(t), [t]);
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const queryClient = useQueryClient();
  const [following, setFollowing] = useState(!!hostFollowing);
  const [mocoMenuOpen, setMocoMenuOpen] = useState(false);
  const [mocoVideoOpen, setMocoVideoOpen] = useState(false);
  const [mocoSfxOpen, setMocoSfxOpen] = useState(false);
  const [cheerOpen, setCheerOpen] = useState(false);
  const [missionOpen, setMissionOpen] = useState(false);
  const moneyAge = useMoneyAgeGate();

  const followMut = useMutation({
    mutationFn: () => toggleFollowUser(hostUserId),
    onMutate: () => {
      setFollowing((prev) => !prev);
    },
    onSuccess: (res) => {
      if (typeof res.following === "boolean") setFollowing(res.following);
      queryClient.setQueryData(["mobile-live", channelId], (old: unknown) => {
        if (!old || typeof old !== "object" || !("item" in old)) return old;
        const data = old as { item: { hostFollowing?: boolean } };
        return {
          ...data,
          item: { ...data.item, hostFollowing: res.following ?? !following },
        };
      });
    },
    onError: () => setFollowing(!!hostFollowing),
  });

  const onSupportRefresh = useCallback(() => undefined, []);
  const canDonate = !isHost && !!hostUserId;

  return (
    <View style={styles.root}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollPad}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.hostRow}>
          <FolkAvatar uri={hostImage ?? null} name={hostUsername} size={36} framed={false} />
          <View style={styles.hostMeta}>
            <Text style={styles.hostName} numberOfLines={1}>
              {hostDisplayName}
            </Text>
            <Text style={styles.hostHandle} numberOfLines={1}>
              @{hostUsername}
            </Text>
          </View>
          {!isHost ? (
            <Pressable
              style={[styles.followBtn, following && styles.followBtnOn]}
              onPress={() => followMut.mutate()}
              disabled={followMut.isPending}
            >
              <Text style={[styles.followText, following && styles.followTextOn]}>
                {following ? t("m.common.following") : t("m.common.follow")}
              </Text>
            </Pressable>
          ) : null}
        </View>

        {canDonate ? (
          <View style={styles.actions}>
            <Pressable
              style={styles.actionBtn}
              onPress={() => {
                if (moneyAge.blocked) {
                  void moneyAge.ensureMoneyAge();
                  return;
                }
                setMocoMenuOpen(true);
              }}
            >
              <Ionicons name="gift" size={16} color="#F5C518" />
              <Text style={styles.actionText}>{copy.mocoDonation}</Text>
            </Pressable>
            <Pressable
              style={styles.actionBtn}
              onPress={() => {
                if (moneyAge.blocked) {
                  void moneyAge.ensureMoneyAge();
                  return;
                }
                setMocoVideoOpen(true);
              }}
            >
              <Ionicons name="logo-youtube" size={16} color="#86efac" />
              <Text style={styles.actionText}>{copy.videoDonation}</Text>
            </Pressable>
            <Pressable
              style={styles.actionBtn}
              onPress={() => {
                if (moneyAge.blocked) {
                  void moneyAge.ensureMoneyAge();
                  return;
                }
                setMocoSfxOpen(true);
              }}
            >
              <Ionicons name="musical-notes" size={16} color="#fb923c" />
              <Text style={styles.actionText}>{copy.sfxDonation}</Text>
            </Pressable>
            <Pressable style={styles.actionBtn} onPress={() => setCheerOpen(true)}>
              <Ionicons name="heart" size={16} color="#eab308" />
              <Text style={styles.actionText}>{copy.cheerCp}</Text>
            </Pressable>
            <Pressable style={styles.actionBtn} onPress={() => setMissionOpen(true)}>
              <Ionicons name="flag" size={16} color="#f97316" />
              <Text style={styles.actionText}>{copy.mission}</Text>
            </Pressable>
          </View>
        ) : null}

        <LiveSupportPanels
          channelId={channelId}
          isHost={isHost}
          currentUserId={currentUserId}
          onSupportEvent={onSupportRefresh}
        />
      </ScrollView>

      {canDonate ? (
        <>
          <LiveMocoDonationMenuSheet
            visible={mocoMenuOpen}
            onClose={() => setMocoMenuOpen(false)}
            hostDisplayName={hostDisplayName}
            onPickVideo={() => setMocoVideoOpen(true)}
            onPickSfx={() => setMocoSfxOpen(true)}
          />
          <LiveMocoVideoDonationSheet
            visible={mocoVideoOpen}
            onClose={() => setMocoVideoOpen(false)}
            channelId={channelId}
            onSuccess={onSupportRefresh}
          />
          <LiveMocoSfxDonationSheet
            visible={mocoSfxOpen}
            onClose={() => setMocoSfxOpen(false)}
            channelId={channelId}
            onSuccess={onSupportRefresh}
          />
          <LiveSupportSheet
            visible={cheerOpen}
            onClose={() => setCheerOpen(false)}
            channelId={channelId}
            hostDisplayName={hostDisplayName}
            onSuccess={onSupportRefresh}
          />
          <LiveSupportSheet
            visible={missionOpen}
            onClose={() => setMissionOpen(false)}
            channelId={channelId}
            hostDisplayName={hostDisplayName}
            initialTab="MISSION"
            onSuccess={onSupportRefresh}
          />
        </>
      ) : null}
    </View>
  );
}

function createStyles(_colors: ThemeColors) {
  return StyleSheet.create({
    root: {
      width: 248,
      height: "100%",
      backgroundColor: "#101014",
      borderLeftWidth: StyleSheet.hairlineWidth,
      borderLeftColor: "#222228",
    },
    scroll: { flex: 1 },
    scrollPad: { padding: 10, paddingBottom: 16, gap: 10 },
    hostRow: { flexDirection: "row", alignItems: "center", gap: 8 },
    hostMeta: { flex: 1, minWidth: 0 },
    hostName: { color: "#f3f4f6", fontWeight: "800", fontSize: 13 },
    hostHandle: { color: "#9ca3af", fontWeight: "600", fontSize: 11, marginTop: 1 },
    followBtn: {
      backgroundColor: "#22c55e",
      borderRadius: 999,
      paddingHorizontal: 12,
      paddingVertical: 6,
    },
    followBtnOn: {
      backgroundColor: "transparent",
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: "#4b5563",
    },
    followText: { color: "#052e16", fontWeight: "800", fontSize: 12 },
    followTextOn: { color: "#d1d5db" },
    actions: { gap: 6 },
    actionBtn: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      backgroundColor: "#1a1a1f",
      borderRadius: radii.md,
      paddingHorizontal: 10,
      paddingVertical: 9,
    },
    actionText: { color: "#e5e7eb", fontWeight: "700", fontSize: 12 },
  });
}
