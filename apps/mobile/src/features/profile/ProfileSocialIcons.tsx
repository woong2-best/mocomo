import { Linking, Pressable, View } from "react-native";
import type { ProfileSocialLink } from "@/features/profile/profile-social";
import { PROFILE_SOCIAL_META, socialIconSize } from "@/features/profile/profile-social";
import { ProfileSocialMark } from "@/features/profile/ProfileSocialMark";

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
        if (!meta) return null;
        const mark = <ProfileSocialMark id={link.id} size={size} />;
        if (!link.href) {
          return (
            <View key={link.id} accessibilityLabel={link.label}>
              {mark}
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
            {mark}
          </Pressable>
        );
      })}
    </View>
  );
}
