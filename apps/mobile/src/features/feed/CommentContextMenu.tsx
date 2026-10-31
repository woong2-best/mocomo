import { useEffect, useRef } from "react";
import {
  Animated,
  Easing,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useI18n } from "@/i18n/I18nProvider";

export type CommentContextMenuHandlers = {
  handlePin?: () => void;
  handleShare?: () => void;
  handleQuite?: () => void;
  handleReport?: () => void;
  handleBlock?: () => void;
  handleDelete?: () => void;
};

type Props = CommentContextMenuHandlers & {
  visible: boolean;
  onClose: () => void;
};

const BACKDROP_MS = 200;
const MENU_MS = 250;
const MENU_EASE = Easing.bezier(0.25, 1, 0.5, 1);
const DESTRUCTIVE = "#ef4444";

export function CommentContextMenu({
  visible,
  onClose,
  handlePin,
  handleShare,
  handleQuite,
  handleReport,
  handleBlock,
  handleDelete,
}: Props) {
  const { t } = useI18n();
  const backdrop = useRef(new Animated.Value(0)).current;
  const menu = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(backdrop, {
        toValue: visible ? 0.4 : 0,
        duration: BACKDROP_MS,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }),
      Animated.timing(menu, {
        toValue: visible ? 1 : 0,
        duration: MENU_MS,
        easing: MENU_EASE,
        useNativeDriver: true,
      }),
    ]).start();
  }, [backdrop, menu, visible]);

  if (!visible) return null;

  const run = (fn?: () => void) => {
    fn?.();
    onClose();
  };

  const items: {
    id: string;
    label: string;
    icon: keyof typeof Ionicons.glyphMap;
    destructive?: boolean;
    onSelect: () => void;
  }[] = [
    { id: "pin", label: t("comments.pin"), icon: "pin-outline", onSelect: () => run(handlePin) },
    { id: "share", label: t("ui.share"), icon: "share-outline", onSelect: () => run(handleShare) },
    {
      id: "quite",
      label: t("post.menu.mute"),
      icon: "volume-mute-outline",
      onSelect: () => run(handleQuite),
    },
    {
      id: "report",
      label: t("post.menu.report"),
      icon: "flag-outline",
      destructive: true,
      onSelect: () => run(handleReport),
    },
    {
      id: "block",
      label: t("post.menu.block"),
      icon: "ban-outline",
      onSelect: () => run(handleBlock),
    },
    {
      id: "delete",
      label: t("post.menu.delete"),
      icon: "trash-outline",
      destructive: true,
      onSelect: () => run(handleDelete),
    },
  ];

  return (
    <Modal
      visible
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <View style={styles.root}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose}>
          <Animated.View style={[styles.backdrop, { opacity: backdrop }]} />
        </Pressable>
        <Animated.View
          style={[
            styles.menu,
            {
              opacity: menu,
              transform: [
                {
                  scale: menu.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.9, 1],
                  }),
                },
              ],
            },
          ]}
        >
          {items.map((item, index) => {
            const color = item.destructive ? DESTRUCTIVE : "#fff";
            return (
              <Pressable
                key={item.id}
                accessibilityRole="button"
                onPress={item.onSelect}
                style={({ pressed }) => [
                  styles.row,
                  index < items.length - 1 && styles.rowBorder,
                  pressed && styles.rowPressed,
                ]}
              >
                <Ionicons name={item.icon} size={20} color={color} />
                <Text style={[styles.label, { color }]}>{item.label}</Text>
              </Pressable>
            );
          })}
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 28,
  },
  backdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: "#000",
  },
  menu: {
    width: "100%",
    maxWidth: 280,
    backgroundColor: "#262626",
    borderRadius: 16,
    overflow: "hidden",
    paddingVertical: 4,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  rowBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "rgba(255,255,255,0.08)",
  },
  rowPressed: {
    backgroundColor: "rgba(255,255,255,0.1)",
  },
  label: {
    fontSize: 15,
    fontWeight: "600",
  },
});
