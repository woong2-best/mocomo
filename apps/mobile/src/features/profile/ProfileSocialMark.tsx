import { Image, View } from "react-native";
import {
  PROFILE_SOCIAL_META,
  profileSocialIconScale,
  type ProfileSocialId,
} from "@/features/profile/profile-social";

export function ProfileSocialMark({
  id,
  size,
  opacity = 1,
}: {
  id: ProfileSocialId;
  size: number;
  opacity?: number;
}) {
  const meta = PROFILE_SOCIAL_META[id];
  const scale = profileSocialIconScale(id);
  const markSize = Math.round(size * scale);
  const Mark = meta.Mark;

  return (
    <View
      style={{
        width: size,
        height: size,
        alignItems: "center",
        justifyContent: "center",
        overflow: "visible",
      }}
    >
      {Mark ? (
        <Mark height={id === "youtube" ? Math.round((markSize * 48) / 68) : markSize} />
      ) : meta.icon ? (
        <Image
          source={meta.icon}
          style={{ width: markSize, height: markSize, opacity }}
          resizeMode="contain"
        />
      ) : null}
    </View>
  );
}
