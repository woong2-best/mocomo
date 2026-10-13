import { useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Image } from "expo-image";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigation, useRoute, type RouteProp } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { fetchAuctionBidRoom, placeMarketplaceBid, type AuctionBidRoom } from "@/api/marketplace";
import { ApiError } from "@/api/client";
import { formatUsedPrice, parseListingPriceInput } from "@/features/marketplace/used-catalog";
import { useI18n } from "@/i18n/I18nProvider";
import type { RootStackParamList } from "@/navigation/types";
import { IMAGE_CACHE_POLICY } from "@/perf/image";
import { useTheme } from "@/theme/ThemeContext";
import { spacing, type ThemeColors } from "@/theme/tokens";

export function AuctionBidRoomScreen() {
  const { t } = useI18n();
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<RootStackParamList, "AuctionRoom">>();
  const queryClient = useQueryClient();
  const [text, setText] = useState("");
  const [note, setNote] = useState<string | null>(null);

  const query = useQuery({
    queryKey: ["mobile-auction-room", route.params.id],
    queryFn: () => fetchAuctionBidRoom(route.params.id),
    refetchInterval: 4000,
  });
  const room = query.data;
  const listing = room?.listing;

  const bid = useMutation({
    mutationFn: (amount: number) => placeMarketplaceBid(route.params.id, amount, { termsAccepted: true }),
    onSuccess: async (res) => {
      if (res.error) {
        setNote(res.error);
        return;
      }
      setText("");
      setNote(null);
      await queryClient.invalidateQueries({ queryKey: ["mobile-auction-room", route.params.id] });
    },
    onError: (err) => {
      const message =
        err instanceof ApiError && err.body && typeof err.body === "object" && "error" in err.body
          ? String((err.body as { error: string }).error)
          : t("m.common.bid_failed");
      setNote(message);
    },
  });

  function submit() {
    if (!listing || listing.isOwner || !listing.auctionLive) return;
    const amount = parseListingPriceInput(text, listing.currency);
    if (!Number.isFinite(amount) || amount <= 0) {
      setNote(t("m.marketplace.enter_a_bid"));
      return;
    }
    bid.mutate(amount);
  }

  return (
    <KeyboardAvoidingView
      style={[styles.root, { paddingTop: insets.top }]}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View style={styles.top}>
        <Pressable onPress={() => navigation.goBack()} hitSlop={8}>
          <Text style={styles.back}>{t("common.back")}</Text>
        </Pressable>
      </View>
      {query.isLoading || !listing ? (
        <ActivityIndicator color={colors.terracotta} style={{ marginTop: 24 }} />
      ) : (
        <>
          <View style={styles.item}>
            {listing.image ? (
              <Image source={{ uri: listing.image }} style={styles.photo} cachePolicy={IMAGE_CACHE_POLICY} />
            ) : (
              <View style={[styles.photo, styles.photoEmpty]} />
            )}
            <View style={{ flex: 1 }}>
              <Text style={styles.title} numberOfLines={2}>
                {listing.title}
              </Text>
              <Text style={styles.price}>
                {formatUsedPrice(listing.currentBidAmount || listing.minNextBid || listing.price, listing.currency, t)}
              </Text>
            </View>
          </View>
          <FlatList
            data={room.bids}
            keyExtractor={(row) => row.id}
            contentContainerStyle={styles.list}
            ListEmptyComponent={<Text style={styles.muted}>{t("m.marketplace.no_active_bids")}</Text>}
            renderItem={({ item }: { item: AuctionBidRoom["bids"][number] }) => (
              <View style={[styles.bubbleRow, item.mine && styles.bubbleRowMine]}>
                <View style={[styles.bubble, item.mine && styles.bubbleMine]}>
                  <Text style={[styles.bubbleName, item.mine && styles.bubbleNameMine]}>{item.name}</Text>
                  <Text style={[styles.bubbleAmount, item.mine && styles.bubbleAmountMine]}>
                    {formatUsedPrice(item.amount, listing.currency, t)}
                  </Text>
                </View>
              </View>
            )}
          />
          {listing.isLeader && listing.messageRoomId ? (
            <Pressable
              style={styles.messageLink}
              onPress={() =>
                navigation.navigate("MessageRoom", {
                  roomId: listing.messageRoomId!,
                  title: listing.title,
                })
              }
            >
              <Text style={styles.messageLinkText}>{t("m.common.message")}</Text>
            </Pressable>
          ) : null}
          {note ? <Text style={styles.note}>{note}</Text> : null}
          {listing.auctionLive && !listing.isOwner ? (
            <View style={[styles.composer, { paddingBottom: Math.max(insets.bottom, spacing.sm) }]}>
              <TextInput
                style={styles.input}
                value={text}
                onChangeText={(value) => setText(value.replace(/[^\d.]/g, ""))}
                keyboardType="number-pad"
                placeholder={t("m.marketplace.enter_a_bid")}
                placeholderTextColor={colors.textMuted}
              />
              <Pressable style={styles.send} disabled={bid.isPending} onPress={submit}>
                <Text style={styles.sendText}>{t("m.marketplace.place_bid")}</Text>
              </Pressable>
            </View>
          ) : (
            <View style={{ height: insets.bottom + 12 }} />
          )}
        </>
      )}
    </KeyboardAvoidingView>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: colors.background },
    top: { paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
    back: { color: colors.text, fontWeight: "700" },
    item: {
      flexDirection: "row",
      gap: spacing.sm,
      paddingHorizontal: spacing.md,
      paddingBottom: spacing.sm,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.border,
    },
    photo: { width: 64, height: 64, borderRadius: 12 },
    photoEmpty: { backgroundColor: colors.border },
    title: { color: colors.text, fontWeight: "800", fontSize: 16 },
    price: { color: colors.textMuted, marginTop: 4, fontWeight: "700" },
    list: { padding: spacing.md, gap: 8 },
    muted: { color: colors.textMuted, textAlign: "center", marginTop: 24 },
    bubbleRow: { alignItems: "flex-start" },
    bubbleRowMine: { alignItems: "flex-end" },
    bubble: {
      maxWidth: "80%",
      backgroundColor: colors.surface,
      borderRadius: 16,
      paddingHorizontal: 12,
      paddingVertical: 8,
    },
    bubbleMine: { backgroundColor: colors.terracotta },
    bubbleName: { color: colors.textMuted, fontSize: 12 },
    bubbleNameMine: { color: "#fff" },
    bubbleAmount: { color: colors.text, fontWeight: "800", fontSize: 16 },
    bubbleAmountMine: { color: "#fff" },
    messageLink: { paddingHorizontal: spacing.md, paddingBottom: spacing.xs },
    messageLinkText: { color: colors.terracotta, fontWeight: "800" },
    note: { color: colors.terracotta, textAlign: "center", paddingHorizontal: spacing.md },
    composer: {
      flexDirection: "row",
      gap: 8,
      paddingHorizontal: spacing.md,
      paddingTop: spacing.sm,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: colors.border,
    },
    input: {
      flex: 1,
      height: 48,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
      paddingHorizontal: 12,
      color: colors.text,
      fontSize: 16,
    },
    send: {
      height: 48,
      borderRadius: 12,
      backgroundColor: colors.terracotta,
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: 14,
    },
    sendText: { color: "#fff", fontWeight: "800" },
  });
}
