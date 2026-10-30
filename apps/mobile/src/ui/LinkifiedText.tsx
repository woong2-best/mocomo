import { useMemo } from "react";
import {
  Text,
  type StyleProp,
  type TextStyle,
  type NativeSyntheticEvent,
  type TextLayoutEventData,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { parseLinkifyParts } from "@/lib/linkify";

type MentionState = "active" | "blocked" | "denied";

function parseMentionStates(raw: unknown): Record<string, MentionState> | undefined {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return undefined;
  const out: Record<string, MentionState> = {};
  for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
    if (value === "active" || value === "blocked" || value === "denied") {
      out[key.toLowerCase()] = value;
    }
  }
  return Object.keys(out).length ? out : undefined;
}
import { useUserProfileNav } from "@/features/profile/user-profile-nav";
import { openUserLink } from "@/lib/open-user-link";
import { useTheme } from "@/theme/ThemeContext";
import type { RootStackParamList } from "@/navigation/types";

type Props = {
  text: string;
  style?: StyleProp<TextStyle>;
  numberOfLines?: number;
  ellipsizeMode?: "head" | "middle" | "tail" | "clip";
  linkStyle?: StyleProp<TextStyle>;
  mentionStyle?: StyleProp<TextStyle>;
  /** Reels / video overlay captions */
  lightLinks?: boolean;
  /** Tap on non-link text (e.g. open post detail). */
  onBackgroundPress?: () => void;
  mentionStates?: unknown;
  onTextLayout?: (e: NativeSyntheticEvent<TextLayoutEventData>) => void;
};

export function LinkifiedText({
  text,
  style,
  numberOfLines,
  linkStyle,
  mentionStyle,
  lightLinks = false,
  onBackgroundPress,
  onTextLayout,
  ellipsizeMode,
  mentionStates,
}: Props) {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { open: openUserProfile, prefetch: prefetchUserProfile } = useUserProfileNav();
  const { colors } = useTheme();
  const parts = useMemo(() => parseLinkifyParts(text), [text]);
  const states = useMemo(() => parseMentionStates(mentionStates), [mentionStates]);

  const linkColor = lightLinks ? "#BFDBFE" : colors.cobalt;
  const mentionColor = lightLinks ? "#FDE68A" : colors.cobalt;

  return (
    <Text
      style={style}
      numberOfLines={numberOfLines}
      ellipsizeMode={ellipsizeMode}
      onPress={onBackgroundPress}
      onTextLayout={onTextLayout}
    >
      {parts.map((part, i) => {
        if (part.type === "text") {
          return <Text key={`t-${i}`}>{part.value}</Text>;
        }
        if (part.type === "link") {
          return (
            <Text
              key={`l-${i}-${part.href}`}
              style={[{ color: linkColor, textDecorationLine: "underline" }, linkStyle]}
              onPress={() => void openUserLink(part.href, navigation)}
            >
              {part.label}
            </Text>
          );
        }
        if (part.type === "hashtag") {
          return (
            <Text
              key={`h-${i}`}
              style={[{ color: mentionColor, fontWeight: "700" }, mentionStyle]}
              onPress={() => navigation.navigate("Search", { q: part.label })}
            >
              {part.label}
            </Text>
          );
        }
        const state = states?.[part.username.toLowerCase()];
        if (state === "blocked" || state === "denied") {
          return <Text key={`m-${i}`}>{part.label}</Text>;
        }
        return (
          <Text
            key={`m-${i}`}
            style={[{ color: mentionColor, fontWeight: "700" }, mentionStyle]}
              onPressIn={() => prefetchUserProfile({ username: part.username })}
              onPress={() => openUserProfile({ username: part.username })}
          >
            {part.label}
          </Text>
        );
      })}
    </Text>
  );
}
