import { useMemo } from "react";
import { Linking, StyleSheet, Text } from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { wikiLinkSlug } from "@/features/anime/wiki-link-slug";
import { useTheme } from "@/theme/ThemeContext";
import type { ThemeColors } from "@/theme/tokens";
import type { RootStackParamList } from "@/navigation/types";

type FootnoteMap = Map<string, string>;

const INLINE_RE =
  /(\{\{([^}]+)\}\}|\[\[(?:[^\]|]+\|)?([^\]|]+)\]\]|\[([^\]]+)\]\(([^)]+)\)|\[\^(\d+)\]|!\[([^\]]*)\]\(([^)]+)\)|\*\*([^*]+)\*\*)/g;

type Props = {
  text: string;
  notes?: FootnoteMap;
  keyPrefix?: string;
  style?: object;
};

export function WikiInline({ text, notes = new Map(), keyPrefix = "wi", style }: Props) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  const parts: React.ReactNode[] = [];
  let last = 0;
  let i = 0;
  let m: RegExpExecArray | null;
  const re = new RegExp(INLINE_RE.source, INLINE_RE.flags);

  while ((m = re.exec(text)) !== null) {
    if (m.index > last) {
      parts.push(
        <Text key={`${keyPrefix}-t-${i++}`} style={styles.text}>
          {text.slice(last, m.index)}
        </Text>
      );
    }

    if (m[2] !== undefined) {
      parts.push(
        <Text key={`${keyPrefix}-badge-${i++}`} style={styles.badge}>
          {m[2].trim()}
        </Text>
      );
    } else if (m[0].startsWith("[[")) {
      const label = m[0].includes("|") ? m[0].slice(2, m[0].indexOf("|")) : m[3];
      const target = (m[3] ?? label).trim();
      const slug = wikiLinkSlug(target);
      parts.push(
        <Text
          key={`${keyPrefix}-wl-${i++}`}
          style={styles.link}
          onPress={() => navigation.push("AnimeDetail", { slug })}
        >
          {label.trim()}
        </Text>
      );
    } else if (m[4] !== undefined && m[5]) {
      const href = m[5].trim();
      parts.push(
        <Text
          key={`${keyPrefix}-ext-${i++}`}
          style={styles.link}
          onPress={() => void Linking.openURL(href)}
        >
          {m[4]}
        </Text>
      );
    } else if (m[6]) {
      parts.push(
        <Text key={`${keyPrefix}-fn-${i++}`} style={styles.fn}>
          [{m[6]}]
        </Text>
      );
    } else if (m[7] !== undefined && m[8]) {
      const alt = (m[7] || "이미지").trim();
      const href = m[8].trim();
      parts.push(
        <Text
          key={`${keyPrefix}-img-${i++}`}
          style={styles.link}
          onPress={() => void Linking.openURL(href)}
        >
          [{alt}]
        </Text>
      );
    } else if (m[9]) {
      parts.push(
        <Text key={`${keyPrefix}-b-${i++}`} style={styles.bold}>
          {m[9]}
        </Text>
      );
    }

    last = m.index + m[0].length;
  }

  if (last < text.length) {
    parts.push(
      <Text key={`${keyPrefix}-tail`} style={styles.text}>
        {text.slice(last)}
      </Text>
    );
  }

  if (!parts.length) {
    return <Text style={[styles.text, style]}>{text}</Text>;
  }

  return <Text style={[styles.text, style]}>{parts}</Text>;
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    text: { color: colors.text, fontSize: 15, lineHeight: 24, fontWeight: "400" },
    bold: { color: colors.text, fontSize: 15, lineHeight: 24, fontWeight: "800" },
    link: { color: colors.brand, fontSize: 15, lineHeight: 24, fontWeight: "700" },
    badge: {
      color: colors.gold,
      fontSize: 12,
      lineHeight: 24,
      fontWeight: "700",
      backgroundColor: "rgba(201, 160, 58, 0.18)",
    },
    fn: { color: colors.brand, fontSize: 11, fontWeight: "700" },
  });
}

export type { FootnoteMap };
