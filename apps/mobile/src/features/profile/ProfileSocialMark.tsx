import { Image } from "react-native";
import Svg, { Circle, Defs, Path, RadialGradient, Rect, Stop } from "react-native-svg";
import { API_BASE_URL } from "@/config/env";
import type { ProfileSocialId } from "@/features/profile/profile-social";

export function ProfileSocialMark({
  id,
  size,
}: {
  id: ProfileSocialId;
  size: number;
}) {
  const r = Math.round(size * 0.25);

  if (id === "facebook") {
    return (
      <Svg width={size} height={size} viewBox="0 0 40 40">
        <Rect width="40" height="40" rx="10" fill="#1877F2" />
        <Path
          fill="#fff"
          d="M22.9 32.8v-11h3.7l.6-4.3h-4.3v-2.7c0-1.3.4-2.1 2.2-2.1H27V8.8c-.4-.1-1.8-.2-3.4-.2-3.4 0-5.7 2-5.7 5.8v3.2h-3.8V21.8h3.8v11h4z"
        />
      </Svg>
    );
  }

  if (id === "instagram") {
    return (
      <Svg width={size} height={size} viewBox="0 0 40 40">
        <Defs>
          <RadialGradient id="ig" cx="30%" cy="107%" rx="150%" ry="150%">
            <Stop offset="0%" stopColor="#fdf497" />
            <Stop offset="45%" stopColor="#fd5949" />
            <Stop offset="60%" stopColor="#d6249f" />
            <Stop offset="90%" stopColor="#285AEB" />
          </RadialGradient>
        </Defs>
        <Rect width="40" height="40" rx="12" fill="url(#ig)" />
        <Rect
          x="9"
          y="9"
          width="22"
          height="22"
          rx="7"
          fill="none"
          stroke="#fff"
          strokeWidth="2.4"
        />
        <Circle cx="20" cy="20" r="5.4" fill="none" stroke="#fff" strokeWidth="2.4" />
        <Circle cx="26.6" cy="13.4" r="1.6" fill="#fff" />
      </Svg>
    );
  }

  if (id === "twitter") {
    return (
      <Svg width={size} height={size} viewBox="0 0 40 40">
        <Rect width="40" height="40" rx="10" fill="#1DA1F2" />
        <Path
          fill="#fff"
          d="M31.2 14.2c-.7.3-1.5.6-2.3.7.8-.5 1.5-1.3 1.8-2.2-.8.5-1.7.8-2.6 1-1.5-1.6-4.1-1.7-5.7-.2-1 1-1.4 2.4-1.1 3.8-3.3-.2-6.3-1.7-8.3-4.3-1.1 1.9-.6 4.3 1.2 5.5-.6 0-1.3-.2-1.8-.5v.1c0 2 1.4 3.7 3.3 4.1-.6.2-1.2.2-1.8.1.5 1.6 2 2.8 3.7 2.8-1.7 1.3-3.8 2-6 1.9 1.8 1.2 4 1.8 6.2 1.8 7.5 0 11.7-6.4 11.4-12.1.8-.6 1.5-1.3 2-2.1z"
        />
      </Svg>
    );
  }

  return (
    <Image
      source={{ uri: `${API_BASE_URL.replace(/\/$/, "")}/brand/chzzk.png` }}
      style={{ width: size, height: size, borderRadius: r }}
      resizeMode="contain"
    />
  );
}
