import { Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useQueryClient } from "@tanstack/react-query";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { prefetchDrawerRoute, prefetchTabForRoute } from "@/navigation/tab-warmup";
import type { RootStackParamList, RootTabParamList } from "@/navigation/types";
import { useI18n } from "@/i18n/I18nProvider";
import {
  REELS_WIDE_NAV_ITEMS,
  type ReelsWideNavRoute,
} from "@/features/reels/reels-wide-layout";

type Props = {
  width: number;
  topInset: number;
  bottomInset: number;
};

function goWideNavRoute(
  navigation: NativeStackNavigationProp<RootStackParamList>,
  route: ReelsWideNavRoute
) {
  if (route === "Home" || route === "Used") {
    navigation.navigate("Main", { screen: route });
    return;
  }
  navigation.replace(route);
}

export function ReelsWideNavRail({ width, topInset, bottomInset }: Props) {
  const { t } = useI18n();
  const queryClient = useQueryClient();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const showLabel = width >= 72;

  return (
    <View
      style={[
        styles.rail,
        {
          width,
          paddingTop: topInset + 48,
          paddingBottom: Math.max(bottomInset, 16) + 8,
        },
      ]}
      pointerEvents="box-none"
    >
      {REELS_WIDE_NAV_ITEMS.map((item) => {
        const label = t(item.labelKey);
        return (
          <Pressable
            key={item.route}
            style={({ pressed }) => [styles.item, pressed && styles.itemPressed]}
            onPressIn={() => {
              void Haptics.selectionAsync();
              if (item.route === "Home" || item.route === "Used") {
                prefetchTabForRoute(queryClient, item.route as keyof RootTabParamList);
              } else {
                prefetchDrawerRoute(queryClient, item.route);
              }
            }}
            onPress={() => goWideNavRoute(navigation, item.route)}
            accessibilityRole="button"
            accessibilityLabel={label}
            hitSlop={6}
          >
            <Ionicons name={item.icon} size={26} color="#fff" />
            {showLabel ? (
              <Text style={styles.label} numberOfLines={2}>
                {label}
              </Text>
            ) : null}
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  rail: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    zIndex: 20,
    alignItems: "flex-start",
    justifyContent: "center",
    paddingHorizontal: 12,
    gap: 18,
  },
  item: {
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    minWidth: 48,
    paddingVertical: 4,
    paddingHorizontal: 4,
  },
  itemPressed: { opacity: 0.55 },
  label: {
    color: "rgba(255,255,255,0.88)",
    fontSize: 10,
    fontWeight: "700",
    textAlign: "center",
    maxWidth: 72,
  },
});
