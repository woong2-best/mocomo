import { useMemo } from "react";
import { Text, type StyleProp, type TextStyle } from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { parseLinkifyParts } from "@/lib/linkify";
import { openUserLink } from "@/lib/open-user-link";
import { useTheme } from "@/theme/ThemeContext";
import type { RootStackParamList } from "@/navigation/types";

type Props = {
  text: string;
  style?: StyleProp<TextStyle>;
  numberOfLines?: number;
  linkStyle?: StyleProp<TextStyle>;
  mentionStyle?: StyleProp<TextStyle>;
  /** Reels / video overlay captions */
  lightLinks?: boolean;
  /** Tap on non-link text (e.g. open post detail). */
  onBackgroundPress?: () => void;
};

export function LinkifiedText({
  text,
  style,
  numberOfLines,
  linkStyle,
  mentionStyle,
  lightLinks = false,
  onBackgroundPress,
}: Props) {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { colors } = useTheme();
  const parts = useMemo(() => parseLinkifyParts(text), [text]);

  const linkColor = lightLinks ? "#BFDBFE" : colors.cobalt;
  const mentionColor = lightLinks ? "#FDE68A" : colors.cobalt;

  return (
    <Text style={style} numberOfLines={numberOfLines} onPress={onBackgroundPress}>
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
              onPress={() => navigation.navigate("Search")}
            >
              {part.label}
            </Text>
          );
        }
        return (
          <Text
            key={`m-${i}`}
            style={[{ color: mentionColor, fontWeight: "700" }, mentionStyle]}
            onPress={() => navigation.navigate("UserProfile", { username: part.username })}
          >
            {part.label}
          </Text>
        );
      })}
    </Text>
  );
}
