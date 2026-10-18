import { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation, useRoute } from "@react-navigation/native";
import type { RouteProp } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { uploadLocalFile } from "@/api/upload-file";
import { fetchStudio, joinStudioWaitlist, lateCancelStudio, orderStudio, type StudioCard } from "@/api/studios";
import { parseStudioPortfolio } from "@/features/marketplace/studio-portfolio";
import { StudioPortfolioView } from "@/features/marketplace/StudioPortfolioView";
import { formatUsedPrice } from "@/features/marketplace/used-catalog";
import { studioCategoryDisplay } from "@/features/marketplace/studio-categories";
import { useAuth } from "@/auth/AuthContext";
import { useI18n } from "@/i18n/I18nProvider";
import type { RootStackParamList } from "@/navigation/types";
import { useTheme } from "@/theme/ThemeContext";
import { KeyboardAwareScrollView, KeyboardAwareTextInput } from "@/ui/KeyboardAwareScrollView";
import { Screen } from "@/ui/Screen";
import { showIslandError, showIslandSuccess } from "@/ui/IslandToast";

function quoteTotal(studio: StudioCard, tierId: string, addonIds: string[]) {
  const tier = studio.tiers.find((item) => item.id === tierId) ?? studio.tiers[0];
  if (!tier) return { tier: null, total: 0 };
  let total = tier.price;
  for (const addon of studio.addons) {
    if (!addonIds.includes(addon.id)) continue;
    total += addon.mode === "percent" ? Math.round((tier.price * addon.amount) / 100) : addon.amount;
  }
  return { tier, total };
}

export function StudioDetailScreen() {
  const { t } = useI18n();
  const { colors } = useTheme();
  const { user } = useAuth();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<RootStackParamList, "StudioDetail">>();
  const queryClient = useQueryClient();
  const query = useQuery({ queryKey: ["studio", route.params.id], queryFn: () => fetchStudio(route.params.id) });
  const studio = query.data?.studio;
  const [tierId, setTierId] = useState("");
  const [addonIds, setAddonIds] = useState<string[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [agreedRules, setAgreedRules] = useState(false);
  const [agreedPay, setAgreedPay] = useState(false);
  const [busy, setBusy] = useState(false);
  const selectedTier = tierId || studio?.tiers[0]?.id || "";
  const quote = useMemo(
    () => (studio ? quoteTotal(studio, selectedTier, addonIds) : { tier: null, total: 0 }),
    [studio, selectedTier, addonIds]
  );
  const owner = !!studio && studio.sellerId === user?.id;
  const portfolio = studio
    ? parseStudioPortfolio({
        coverUrl: studio.coverUrl,
        blocks: studio.blocks,
        portfolio: studio.portfolio,
      })
    : null;

  async function attach(fieldId: string) {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) return;
    const picked = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], quality: 0.85 });
    if (picked.canceled || !picked.assets[0]) return;
    const asset = picked.assets[0];
    setBusy(true);
    try {
      const url = await uploadLocalFile({
        uri: asset.uri,
        filename: asset.fileName || "reference.jpg",
        contentType: asset.mimeType || "image/jpeg",
        category: "image",
      });
      setAnswers((prev) => ({ ...prev, [fieldId]: url }));
    } catch (error) {
      showIslandError(t("m.studio.form"), error instanceof Error ? error.message : t("m.common.request_failed"));
    } finally {
      setBusy(false);
    }
  }

  async function submit() {
    if (!studio || !quote.tier) return;
    setBusy(true);
    try {
      const result = await orderStudio(studio.id, {
        tierId: quote.tier.id,
        addonIds,
        answers,
        agreed: true,
      });
      showIslandSuccess(t("m.studio.order"), formatUsedPrice(result.price, studio.currency, t));
      navigation.navigate("MarketplaceDetail", { id: result.listingId });
    } catch (error) {
      showIslandError(t("m.studio.order"), error instanceof Error ? error.message : t("m.common.request_failed"));
    } finally {
      setBusy(false);
    }
  }

  async function wait() {
    if (!studio) return;
    setBusy(true);
    try {
      await joinStudioWaitlist(studio.id);
      showIslandSuccess(t("m.studio.waitlist"), t("m.studio.waitlist_sent"));
    } catch (error) {
      showIslandError(t("m.studio.waitlist"), error instanceof Error ? error.message : t("m.common.request_failed"));
    } finally {
      setBusy(false);
    }
  }

  async function lateCancel() {
    const order = query.data?.myOrder;
    if (!order) return;
    setBusy(true);
    try {
      await lateCancelStudio(order.id);
      await queryClient.invalidateQueries({ queryKey: ["studio", route.params.id] });
      showIslandSuccess(t("m.studio.late"), t("m.studio.late_sent"));
    } catch (error) {
      showIslandError(t("m.studio.late"), error instanceof Error ? error.message : t("m.common.request_failed"));
    } finally {
      setBusy(false);
    }
  }

  if (!studio) {
    return (
      <Screen>
        <ActivityIndicator color={colors.terracotta} />
      </Screen>
    );
  }

  return (
    <Screen>
      <KeyboardAwareScrollView contentContainerStyle={styles.page}>
        <StudioPortfolioView coverUrl={portfolio?.coverUrl} blocks={portfolio?.blocks} />

        <Text style={[styles.title, { color: colors.text }]}>{studio.title}</Text>
        {studio.category ? (
          <Text style={[styles.meta, { color: colors.brand }]}>{studioCategoryDisplay(studio.category)}</Text>
        ) : null}
        <Text style={[styles.meta, { color: colors.textMuted }]}>@{studio.seller.username}</Text>
        <Text style={[styles.about, { color: colors.text }]}>{studio.about}</Text>
        <Text style={[styles.slot, { color: studio.accepting ? "#1f8a4c" : colors.terracotta }]}>
          {studio.accepting
            ? `${t("m.studio.open")} ${studio.slotsUsed}/${studio.slotCap}`
            : `${t("m.studio.closed")} ${studio.slotsUsed}/${studio.slotCap}`}
        </Text>

        <Text style={[styles.section, { color: colors.text }]}>{t("m.studio.tiers")}</Text>
        {studio.tiers.map((tier) => {
          const on = (quote.tier?.id ?? selectedTier) === tier.id;
          return (
            <Pressable
              key={tier.id}
              onPress={() => setTierId(tier.id)}
              style={[styles.choice, { borderColor: on ? colors.brand : colors.border, backgroundColor: on ? colors.brand : colors.surface }]}
            >
              <Text style={{ color: on ? colors.textOnAccent : colors.text, fontWeight: "800" }}>{tier.name}</Text>
              <Text style={{ color: on ? colors.textOnAccent : colors.terracotta, fontWeight: "800" }}>
                {formatUsedPrice(tier.price, studio.currency, t)}
              </Text>
            </Pressable>
          );
        })}

        {studio.addons.length > 0 ? <Text style={[styles.section, { color: colors.text }]}>{t("m.studio.addons")}</Text> : null}
        {studio.addons.map((addon) => {
          const on = addonIds.includes(addon.id);
          const label = addon.mode === "percent" ? `+${addon.amount}%` : `+${formatUsedPrice(addon.amount, studio.currency, t)}`;
          return (
            <Pressable
              key={addon.id}
              onPress={() =>
                setAddonIds((prev) => (prev.includes(addon.id) ? prev.filter((id) => id !== addon.id) : [...prev, addon.id]))
              }
              style={[styles.choice, { borderColor: on ? colors.brand : colors.border }]}
            >
              <Text style={{ color: colors.text, fontWeight: "700", flex: 1 }}>{addon.name}</Text>
              <Text style={{ color: colors.terracotta, fontWeight: "800" }}>{label}</Text>
            </Pressable>
          );
        })}

        <Text style={[styles.section, { color: colors.text }]}>{t("m.studio.rules")}</Text>
        <Text style={[styles.about, { color: colors.text }]}>
          {t("m.studio.days")}: {studio.deliveryDays}
        </Text>
        <Text style={[styles.about, { color: colors.text }]}>{studio.revisionNote}</Text>

        {!owner ? (
          <>
            <Text style={[styles.section, { color: colors.text }]}>{t("m.studio.form")}</Text>
            {studio.formFields.map((field) => (
              <View key={field.id} style={styles.field}>
                <Text style={[styles.label, { color: colors.textMuted }]}>
                  {field.label}
                  {field.required ? " *" : ""}
                </Text>
                {field.kind === "image" ? (
                  <Pressable style={[styles.choice, { borderColor: colors.border }]} onPress={() => void attach(field.id)}>
                    <Text style={{ color: colors.brand, fontWeight: "800" }}>
                      {answers[field.id] ? t("m.studio.image_added") : t("m.studio.add_image")}
                    </Text>
                  </Pressable>
                ) : (
                  <KeyboardAwareTextInput
                    value={answers[field.id] || ""}
                    onChangeText={(value) => setAnswers((prev) => ({ ...prev, [field.id]: value }))}
                    style={[styles.input, { borderColor: colors.border, color: colors.text }]}
                    placeholder={field.label}
                    placeholderTextColor={colors.textMuted}
                    multiline
                  />
                )}
              </View>
            ))}
            <Check
              on={agreedRules}
              label={t("m.studio.agree_rules")}
              onPress={() => setAgreedRules((value) => !value)}
              color={colors.text}
            />
            <Check
              on={agreedPay}
              label={t("m.market.track.digital_consent")}
              onPress={() => setAgreedPay((value) => !value)}
              color={colors.text}
            />
            <Text style={[styles.total, { color: colors.terracotta }]}>
              {formatUsedPrice(quote.total, studio.currency, t)}
            </Text>
            {studio.accepting ? (
              <Pressable
                style={[styles.primary, { backgroundColor: colors.terracotta }, (!agreedRules || !agreedPay || busy) && styles.off]}
                disabled={!agreedRules || !agreedPay || busy}
                onPress={() => void submit()}
              >
                <Text style={styles.primaryText}>{t("m.studio.order")}</Text>
              </Pressable>
            ) : (
              <Pressable style={[styles.primary, { backgroundColor: colors.brand }]} disabled={busy} onPress={() => void wait()}>
                <Text style={styles.primaryText}>{t("m.studio.waitlist")}</Text>
              </Pressable>
            )}
            {query.data?.myOrder?.lateCancel ? (
              <Pressable onPress={() => void lateCancel()} disabled={busy}>
                <Text style={[styles.late, { color: colors.terracotta }]}>{t("m.studio.late")}</Text>
              </Pressable>
            ) : null}
          </>
        ) : (
          <Pressable
            style={[styles.primary, { backgroundColor: colors.brand }]}
            onPress={() => navigation.navigate("StudioEditor")}
          >
            <Text style={styles.primaryText}>{t("m.studio.edit")}</Text>
          </Pressable>
        )}
      </KeyboardAwareScrollView>
    </Screen>
  );
}

function Check({ on, label, onPress, color }: { on: boolean; label: string; onPress: () => void; color: string }) {
  return (
    <Pressable style={styles.check} onPress={onPress}>
      <Ionicons name={on ? "checkbox" : "square-outline"} size={20} color={color} />
      <Text style={[styles.checkText, { color }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  page: { paddingBottom: 40, gap: 8 },
  hero: { width: "100%", height: 280, backgroundColor: "#111" },
  thumbs: { gap: 8, paddingHorizontal: 16 },
  mini: { width: 64, height: 64, borderRadius: 10 },
  miniTag: { color: "#fff", fontWeight: "800", textAlign: "center", marginTop: 22, fontSize: 11 },
  title: { fontSize: 22, fontWeight: "800", paddingHorizontal: 16 },
  meta: { fontWeight: "700", paddingHorizontal: 16 },
  about: { paddingHorizontal: 16, lineHeight: 20, fontWeight: "600" },
  slot: { paddingHorizontal: 16, fontWeight: "800" },
  section: { fontSize: 16, fontWeight: "800", paddingHorizontal: 16, marginTop: 8 },
  choice: {
    marginHorizontal: 16,
    borderWidth: 1.5,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 8,
  },
  field: { paddingHorizontal: 16, gap: 4 },
  label: { fontSize: 12, fontWeight: "700" },
  input: { borderWidth: 1, borderRadius: 12, minHeight: 72, padding: 10, textAlignVertical: "top" },
  check: { flexDirection: "row", gap: 8, paddingHorizontal: 16, alignItems: "flex-start" },
  checkText: { flex: 1, fontSize: 13, fontWeight: "600", lineHeight: 18 },
  total: { fontSize: 22, fontWeight: "800", paddingHorizontal: 16 },
  primary: { marginHorizontal: 16, borderRadius: 12, minHeight: 48, alignItems: "center", justifyContent: "center" },
  primaryText: { color: "#fff", fontWeight: "800", fontSize: 16 },
  off: { opacity: 0.45 },
  late: { textAlign: "center", fontWeight: "800", padding: 8 },
});
