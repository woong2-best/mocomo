import { Image, Linking, Pressable, View } from "react-native";
import type { ProfileSocialLink } from "@/features/profile/profile-social";
import { PROFILE_SOCIAL_META, socialIconSize } from "@/features/profile/profile-social";

export function ProfileSocialIcons({
  links,
  screenWidth,
}: {
  links: ProfileSocialLink[];
  screenWidth: number;
}) {
  if (links.length === 0) return null;
  const size = socialIconSize(screenWidth);
  const gap = Math.max(8, Math.round(size * 0.28));

  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap, flexShrink: 0 }}>
      {links.map((link) => {
        const meta = PROFILE_SOCIAL_META[link.id];
        const chip = meta.darkChip;
        const inner = (
          <View
            style={{
              width: size,
              height: size,
              borderRadius: chip ? 8 : 0,
              backgroundColor: chip ? "#000" : "transparent",
              alignItems: "center",
              justifyContent: "center",
              padding: chip ? 3 : 0,
            }}
          >
            <Image
              source={{ uri: meta.iconSrc }}
              style={{ width: "100%", height: "100%" }}
              resizeMode="contain"
            />
          </View>
        );
        if (!link.href) {
          return (
            <View key={link.id} accessibilityLabel={link.label}>
              {inner}
            </View>
          );
        }
        return (
          <Pressable
            key={link.id}
            onPress={() => void Linking.openURL(link.href!)}
            accessibilityRole="link"
            accessibilityLabel={link.label}
            hitSlop={6}
          >
            {inner}
          </Pressable>
        );
      })}
    </View>
  );
}
