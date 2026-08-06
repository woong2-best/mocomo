import { Pressable, Platform, StyleSheet, Text, View } from "react-native";
import { BlurView } from "expo-blur";
import * as Haptics from "expo-haptics";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { FLOATING_TAB } from "@/navigation/tab-layout";
import type { RootTabParamList } from "@/navigation/types";
import { useTheme } from "@/theme/ThemeContext";

type IconName = keyof typeof Ionicons.glyphMap;

const TAB_META: Record<
  keyof RootTabParamList,
  { active: IconName; inactive: IconName; label: string }
> = {
  Home: { active: "home", inactive: "home-outline", label: "홈" },
  Market: { active: "storefront", inactive: "storefront-outline", label: "마켓" },
  Used: { active: "pricetag", inactive: "pricetag-outline", label: "중고" },
  Messages: { active: "paper-plane", inactive: "paper-plane-outline", label: "메세지" },
};

/** Floating glass pill — solid on Android (GPU), Blur on iOS. */
export function FloatingGlassTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const bottom = Math.max(insets.bottom, 8) + FLOATING_TAB.bottomGap;

  const pillInner = (
    <>
      <View
        style={[styles.pillTint, { backgroundColor: colors.tabGlassTint }]}
        pointerEvents="none"
      />
      <View
        style={[
          styles.pillBorder,
          { borderColor: colors.tabGlassBorder, borderRadius: FLOATING_TAB.radius },
        ]}
        pointerEvents="none"
      />
      <View style={styles.row}>
        {state.routes.map((route, index) => {
          const focused = state.index === index;
          const meta = TAB_META[route.name as keyof RootTabParamList];
          const { options } = descriptors[route.key];
          const label = options.title ?? meta.label;

          const onPress = () => {
            const event = navigation.emit({
              type: "tabPress",
              target: route.key,
              canPreventDefault: true,
            });
            if (!focused && !event.defaultPrevented) {
              void Haptics.selectionAsync();
              navigation.navigate(route.name, route.params);
            }
          };

          return (
            <Pressable
              key={route.key}
              accessibilityRole="button"
              accessibilityState={focused ? { selected: true } : {}}
              accessibilityLabel={label}
              onPress={onPress}
              onLongPress={() => {
                navigation.emit({ type: "tabLongPress", target: route.key });
              }}
              style={styles.item}
            >
              {focused ? (
                <View style={[styles.activeGlow, { backgroundColor: colors.tabActiveGlow }]} />
              ) : null}
              <Ionicons
                name={focused ? meta.active : meta.inactive}
                size={22}
                color={focused ? colors.tabIconActive : colors.tabIcon}
              />
              <Text
                style={[
                  styles.label,
                  {
                    color: focused ? colors.tabLabelActive : colors.tabLabel,
                    fontWeight: focused ? "800" : "700",
                    opacity: focused ? 1 : 0.9,
                  },
                ]}
                numberOfLines={1}
              >
                {meta.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </>
  );

  return (
    <View pointerEvents="box-none" style={[styles.wrap, { bottom }]}>
      <View style={styles.pillShadow}>
        {Platform.OS === "ios" ? (
          <BlurView
            intensity={colors.blurTint === "dark" ? 64 : 72}
            tint={colors.blurTint}
            style={[styles.pill, { backgroundColor: colors.tabGlass }]}
          >
            {pillInner}
          </BlurView>
        ) : (
          <View style={[styles.pill, { backgroundColor: colors.tabGlass }]}>{pillInner}</View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: "absolute",
    left: FLOATING_TAB.horizontalInset,
    right: FLOATING_TAB.horizontalInset,
    alignItems: "center",
  },
  pillShadow: {
    width: "100%",
    borderRadius: FLOATING_TAB.radius,
    shadowColor: "#000",
    shadowOpacity: 0.22,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 10 },
    elevation: 14,
  },
  pill: {
    height: FLOATING_TAB.height,
    borderRadius: FLOATING_TAB.radius,
    overflow: "hidden",
  },
  pillTint: {
    ...StyleSheet.absoluteFill,
  },
  pillBorder: {
    ...StyleSheet.absoluteFill,
    borderWidth: StyleSheet.hairlineWidth * 2,
  },
  row: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    paddingHorizontal: 6,
  },
  item: {
    flex: 1,
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
    gap: 2,
  },
  activeGlow: {
    position: "absolute",
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  label: {
    fontSize: 11,
  },
});
