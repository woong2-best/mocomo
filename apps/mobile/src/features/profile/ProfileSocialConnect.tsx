import { useMemo, useState } from "react";
import { Image, Linking, Pressable, Text, useWindowDimensions, View } from "react-native";
import * as WebBrowser from "expo-web-browser";
import { FolkCard } from "@/ui/FolkCard";
import { showIslandError, showIslandToast } from "@/ui/IslandToast";
import { useTheme } from "@/theme/ThemeContext";
import { useI18n } from "@/i18n/I18nProvider";
import { startProfileSocialConnect } from "@/api/profile";
import {
  PROFILE_SOCIAL_IDS,
  PROFILE_SOCIAL_META,
  socialIconSize,
  type ProfileSocialId,
} from "@/features/profile/profile-social";

WebBrowser.maybeCompleteAuthSession();

const OAUTH_REDIRECT = "mocomo://oauth";

type SocialItem = { id: ProfileSocialId; href: string | null };

export function ProfileSocialConnect({
  connected,
  available,
  items,
  onConnected,
}: {
  connected: ProfileSocialId[];
  available: Record<ProfileSocialId, boolean>;
  items: SocialItem[];
  onConnected?: () => void;
}) {
  const { t } = useI18n();
  const { colors } = useTheme();
  const { width } = useWindowDimensions();
  const size = socialIconSize(width);
  const gap = Math.max(10, Math.round(size * 0.32));
  const [busy, setBusy] = useState<ProfileSocialId | null>(null);
  const connectedSet = useMemo(() => new Set(connected), [connected]);
  const itemById = useMemo(() => new Map(items.map((row) => [row.id, row])), [items]);

  async function connect(id: ProfileSocialId) {
    if (busy) return;
    setBusy(id);
    try {
      const { url } = await startProfileSocialConnect(id);
      const result = await WebBrowser.openAuthSessionAsync(url, OAUTH_REDIRECT, {
        showInRecents: true,
      });
      if (result.type === "success") {
        showIslandToast("Saved", t("m.profile.social_connected"));
        onConnected?.();
      }
    } catch (e) {
      showIslandError(
        t("m.common.error"),
        e instanceof Error ? e.message : t("m.profile.could_not_connect_social")
      );
    } finally {
      setBusy(null);
    }
  }

  async function openPage(href: string | null) {
    if (!href) return;
    await Linking.openURL(href);
  }

  return (
    <FolkCard>
      <Text style={{ fontSize: 16, fontWeight: "800", color: colors.brand, marginBottom: 12 }}>
        More Connect Moment
      </Text>
      <View style={{ flexDirection: "row", flexWrap: "wrap", alignItems: "flex-start", gap }}>
        {PROFILE_SOCIAL_IDS.map((id) => {
          const meta = PROFILE_SOCIAL_META[id];
          const isOn = connectedSet.has(id);
          const item = itemById.get(id);
          const canConnect = available[id] || Boolean(item);
          const Mark = meta.Mark;
          return (
            <Pressable
              key={id}
              onPress={() =>
                isOn && item?.href
                  ? void openPage(item.href)
                  : canConnect
                    ? void connect(id)
                    : undefined
              }
              disabled={(!canConnect && !item?.href) || busy !== null}
              accessibilityRole="button"
              accessibilityLabel={meta.label}
            >
              {Mark ? (
                <View style={{ opacity: canConnect || isOn ? 1 : 0.4 }}>
                  <Mark height={size} />
                </View>
              ) : meta.icon ? (
                <Image
                  source={meta.icon}
                  style={{
                    width: size,
                    height: size,
                    opacity: canConnect || isOn ? 1 : 0.4,
                  }}
                  resizeMode="contain"
                />
              ) : null}
            </Pressable>
          );
        })}
      </View>
    </FolkCard>
  );
}
