import type { ComponentType } from "react";
import { ActivityIndicator, Pressable, StyleSheet, View } from "react-native";
import type { MobileAuthProvider } from "@/auth/oauth";
import {
  DiscordIcon,
  GoogleIcon,
  LineIcon,
  NaverIcon,
  XIcon,
} from "@/features/auth/SocialBrandIcons";
import { radii } from "@/theme/tokens";

type ProviderTile = {
  id: MobileAuthProvider;
  bg: string;
  Icon: ComponentType<{ size?: number; color?: string }>;
  iconColor?: string;
  label: string;
};

const TILES: ProviderTile[] = [
  { id: "gmail", bg: "#FFFFFF", Icon: GoogleIcon, label: "Google" },
  { id: "naver", bg: "#03C75A", Icon: NaverIcon, label: "Naver" },
  { id: "twitter", bg: "#0F1419", Icon: XIcon, label: "X" },
  { id: "discord", bg: "#5865F2", Icon: DiscordIcon, label: "Discord" },
  { id: "line", bg: "#06C755", Icon: LineIcon, label: "LINE" },
];

type Props = {
  busyProvider: MobileAuthProvider | null;
  disabled?: boolean;
  onPress: (provider: MobileAuthProvider) => void;
};

/** Brand tiles with even spacing — all rounded squares. */
export function WelcomeSocialAuthRow({ busyProvider, disabled, onPress }: Props) {
  return (
    <View style={styles.row}>
      {TILES.map((tile) => {
        const busy = busyProvider === tile.id;
        return (
          <Pressable
            key={tile.id}
            style={styles.tileWrap}
            disabled={disabled || busyProvider !== null}
            accessibilityLabel={tile.label}
            onPress={() => onPress(tile.id)}
          >
            <View style={[styles.tile, { backgroundColor: tile.bg }]}>
              {busy ? (
                <ActivityIndicator color={tile.id === "gmail" ? "#4285F4" : "#fff"} />
              ) : (
                <tile.Icon size={24} color={tile.iconColor ?? "#fff"} />
              )}
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}

const TILE = 52;

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 2,
  },
  tileWrap: {
    width: TILE,
    height: TILE,
  },
  tile: {
    width: TILE,
    height: TILE,
    borderRadius: radii.md,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(27, 74, 140, 0.12)",
    shadowColor: "#1B4A8C",
    shadowOpacity: 0.1,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
});
