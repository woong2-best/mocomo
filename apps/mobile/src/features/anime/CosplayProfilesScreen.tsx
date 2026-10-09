import { useMemo } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { fetchOnboardingCosplayers, type OnboardingCosplayer } from "@/api/onboarding";
import { useUserProfileNav } from "@/features/profile/user-profile-nav";
import { useI18n } from "@/i18n/I18nProvider";
import { FolkAvatar } from "@/ui/FolkAvatar";
import { Screen } from "@/ui/Screen";
import type { RootStackParamList } from "@/navigation/types";

const WIKI = {
  woodDeep: "#1A100C",
  woodHeader: "#241610",
  text: "#F5F0E8",
  textMuted: "#A89888",
  searchBtn: "#C45A1A",
} as const;

const H_PAD = 14;
const GRID_GAP = 12;

export function CosplayProfilesScreen() {
  const { t } = useI18n();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const insets = useSafeAreaInsets();
  const { width: winW } = useWindowDimensions();
  const { open: openUserProfile, prefetch: prefetchUserProfile } = useUserProfileNav();

  const query = useQuery({
    queryKey: ["mobile-cosplay-profiles"],
    queryFn: () => fetchOnboardingCosplayers(24),
    staleTime: 60_000,
  });

  const items = query.data?.items ?? [];
  const cardW = (winW - H_PAD * 2 - GRID_GAP) / 2;

  const header = useMemo(
    () => (
      <View style={[styles.header, { paddingTop: insets.top + 4 }]}>
        <View style={styles.titleRow}>
          <Pressable
            onPress={() => navigation.goBack()}
            hitSlop={12}
            style={styles.backHit}
            accessibilityRole="button"
            accessibilityLabel={t("m.common.back")}
          >
            <Ionicons name="chevron-back" size={26} color={WIKI.text} />
          </Pressable>
          <Text style={styles.title}>Cosplayer</Text>
        </View>
      </View>
    ),
    [insets.top, navigation, t]
  );

  return (
    <Screen safeTop={false} style={styles.screen}>
      {header}
      {query.isLoading && !query.data ? (
        <View style={styles.centerState}>
          <ActivityIndicator color={WIKI.searchBtn} />
        </View>
      ) : query.isError && !query.data ? (
        <View style={styles.centerState}>
          <Text style={styles.errorText}>{t("m.auth.could_not_load_cosplayers")}</Text>
          <Pressable onPress={() => void query.refetch()} style={styles.retryBtn}>
            <Text style={styles.retryLabel}>{t("m.common.try_again")}</Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => item.userId}
          numColumns={2}
          columnWrapperStyle={styles.row}
          contentContainerStyle={[
            styles.list,
            { paddingBottom: 28 + insets.bottom },
            items.length === 0 ? styles.listEmpty : null,
          ]}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.centerState}>
              <Text style={styles.emptyHint}>{t("m.auth.no_cosplayers_listed_yet_you_can")}</Text>
            </View>
          }
          renderItem={({ item }) => (
            <CosplayerCard
              item={item}
              width={cardW}
              onPressIn={() =>
                prefetchUserProfile({
                  username: item.username,
                  name: item.displayName,
                  image: item.image,
                })
              }
              onPress={() =>
                openUserProfile({
                  username: item.username,
                  name: item.displayName,
                  image: item.image,
                })
              }
            />
          )}
        />
      )}
    </Screen>
  );
}

function CosplayerCard({
  item,
  width,
  onPress,
  onPressIn,
}: {
  item: OnboardingCosplayer;
  width: number;
  onPress: () => void;
  onPressIn: () => void;
}) {
  return (
    <Pressable style={{ width }} onPress={onPress} onPressIn={onPressIn}>
      <View style={styles.frameShadow}>
        <View style={styles.frameBevel}>
          <View style={styles.frameRecess}>
            {item.photoUrl ? (
              <Image source={{ uri: item.photoUrl }} style={styles.photo} contentFit="cover" />
            ) : (
              <View style={styles.photoFallback}>
                <Ionicons name="camera-outline" size={28} color={WIKI.textMuted} />
              </View>
            )}
          </View>
        </View>
      </View>
      <View style={styles.meta}>
        <FolkAvatar uri={item.image} name={item.displayName} size={28} />
        <View style={styles.metaText}>
          <Text style={styles.name} numberOfLines={1}>
            {item.displayName}
          </Text>
          {item.bio ? (
            <Text style={styles.sub} numberOfLines={1}>
              {item.bio}
            </Text>
          ) : null}
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: WIKI.woodDeep,
  },
  header: {
    backgroundColor: WIKI.woodHeader,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0,0,0,0.45)",
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    minHeight: 40,
    paddingLeft: 2,
    paddingRight: 14,
  },
  backHit: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    color: WIKI.text,
    fontSize: 18,
    fontWeight: "800",
  },
  list: {
    paddingHorizontal: H_PAD,
    paddingTop: 14,
  },
  listEmpty: {
    flexGrow: 1,
  },
  row: {
    gap: GRID_GAP,
    marginBottom: GRID_GAP,
    justifyContent: "space-between",
  },
  centerState: {
    minHeight: 280,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20,
    gap: 12,
  },
  emptyHint: {
    color: "rgba(245,240,232,0.4)",
    fontSize: 13,
    fontWeight: "600",
    textAlign: "center",
  },
  errorText: {
    color: "#E8A090",
    fontWeight: "700",
    fontSize: 13,
  },
  retryBtn: {
    backgroundColor: WIKI.searchBtn,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 4,
  },
  retryLabel: {
    color: "#fff",
    fontWeight: "800",
    fontSize: 13,
  },
  frameShadow: {
    borderRadius: 2,
    backgroundColor: "#0A0705",
    shadowColor: "#000",
    shadowOpacity: 0.65,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 3 },
    elevation: 6,
  },
  frameBevel: {
    borderWidth: 5,
    borderTopColor: "#5A4638",
    borderLeftColor: "#4A382C",
    borderBottomColor: "#120E0A",
    borderRightColor: "#1A1410",
    backgroundColor: "#2A1E16",
    padding: 2,
  },
  frameRecess: {
    borderWidth: 1.5,
    borderTopColor: "#0A0806",
    borderLeftColor: "#0A0806",
    borderBottomColor: "#3A2E24",
    borderRightColor: "#3A2E24",
    overflow: "hidden",
    aspectRatio: 4 / 3,
    backgroundColor: "#12100E",
  },
  photo: {
    width: "100%",
    height: "100%",
  },
  photoFallback: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#1A1612",
  },
  meta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 8,
  },
  metaText: {
    flex: 1,
    minWidth: 0,
  },
  name: {
    color: WIKI.text,
    fontSize: 13,
    fontWeight: "800",
  },
  sub: {
    marginTop: 1,
    color: "rgba(245,240,232,0.72)",
    fontSize: 11,
    fontWeight: "500",
  },
});
