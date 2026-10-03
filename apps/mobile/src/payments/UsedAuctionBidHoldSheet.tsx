import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import * as WebBrowser from "expo-web-browser";
import * as Linking from "expo-linking";
import {
  payMarketplaceBidHold,
  placeMarketplaceBid,
  prepareMarketplaceBidHold,
} from "@/api/marketplace";
import { FolkButton } from "@/ui/FolkButton";
import { useTheme } from "@/theme/ThemeContext";
import { spacing, type ThemeColors } from "@/theme/tokens";
import { formatUsedPrice } from "@/features/marketplace/used-catalog";
import { useI18n } from "@/i18n/I18nProvider";

const RETURN_PREFIX = Linking.createURL("payment/success");

type Props = {
  visible: boolean;
  listingId: string;
  bidAmount: number;
  currency?: string | null;
  onClose: () => void;
  onSuccess: (result: { amount: number; extended?: boolean }) => void;
};

export function UsedAuctionBidHoldSheet({
  visible,
  listingId,
  bidAmount,
  currency,
  onClose,
  onSuccess,
}: Props) {
  const { t } = useI18n();
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [loading, setLoading] = useState(false);
  const [paying, setPaying] = useState(false);
  const [error, setError] = useState("");
  const [orderId, setOrderId] = useState<string | null>(null);
  const [holdAmount, setHoldAmount] = useState(0);
  const [methods, setMethods] = useState<
    Array<{ id: string; brand: string; last4: string; isDefault: boolean }>
  >([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    if (!visible) return;
    setError("");
    setLoading(true);
    void prepareMarketplaceBidHold(listingId, bidAmount)
      .then((res) => {
        setOrderId(res.orderId);
        setHoldAmount(res.holdAmount);
        setMethods(res.methods);
        const def = res.methods.find((m) => m.isDefault) ?? res.methods[0];
        setSelectedId(def?.id ?? null);
      })
      .catch((e: unknown) => {
        setError(e instanceof Error ? e.message : t("m.payments.could_not_prepare_bid_hold"));
      })
      .finally(() => setLoading(false));
  }, [visible, listingId, bidAmount, t]);

  async function placeBidWithHold(paymentIntentDbId: string) {
    const placed = await placeMarketplaceBid(listingId, bidAmount, {
      termsAccepted: true,
      paymentIntentDbId,
    });
    if (placed.error) throw new Error(placed.error);
    if (!placed.amount) throw new Error(t("m.common.bid_failed"));
    onSuccess({ amount: placed.amount, extended: placed.extended });
    onClose();
  }

  async function openAuthenticate(clientSecret: string, oid: string) {
    const pk = process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY;
    if (!pk) throw new Error(t("m.payments.stripe_is_not_configured"));
    const returnTo = encodeURIComponent(`/market/${listingId}`);
    const authUrl = `${process.env.EXPO_PUBLIC_API_BASE_URL ?? ""}/payments/authenticate?order_id=${encodeURIComponent(oid)}&client_secret=${encodeURIComponent(clientSecret)}&return_to=${returnTo}`;
    const result = await WebBrowser.openAuthSessionAsync(authUrl, RETURN_PREFIX, {
      preferEphemeralSession: false,
      showInRecents: true,
    });
    if (result.type !== "success" || !result.url) {
      throw new Error(t("m.payments.card_verification_was_canceled"));
    }
    await placeBidWithHold(oid);
  }

  async function paySelected() {
    if (!orderId || !selectedId) {
      setError(t("m.payments.select_a_card"));
      return;
    }
    setPaying(true);
    setError("");
    try {
      const res = await payMarketplaceBidHold(listingId, orderId, selectedId);
      if (res.requiresAction && res.clientSecret && res.orderId) {
        await openAuthenticate(res.clientSecret, res.orderId);
        return;
      }
      if (res.error) {
        setError(res.error);
        return;
      }
      await placeBidWithHold(orderId);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : t("m.payments.card_authorization_failed"));
    } finally {
      setPaying(false);
    }
  }

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={[styles.sheet, { backgroundColor: colors.surfaceRaised }]}>
          <Text style={[styles.title, { color: colors.text }]}>{t("m.payments.bid_card_hold")}</Text>
          <Text style={[styles.subtitle, { color: colors.textMuted }]}>
            {t("m.payments.bid")} {formatUsedPrice(bidAmount, currency)} · hold {formatUsedPrice(holdAmount, "usd")}
          </Text>

          {loading ? (
            <ActivityIndicator style={{ marginVertical: spacing.lg }} color={colors.terracotta} />
          ) : (
            <ScrollView style={styles.list} showsVerticalScrollIndicator={false}>
              {methods.map((pm) => (
                <Pressable
                  key={pm.id}
                  onPress={() => setSelectedId(pm.id)}
                  style={[
                    styles.cardRow,
                    {
                      borderColor: selectedId === pm.id ? colors.cobalt : colors.hairline,
                      backgroundColor: selectedId === pm.id ? `${colors.cobalt}18` : colors.surface,
                    },
                  ]}
                >
                  <Text style={[styles.cardTitle, { color: colors.text }]}>
                    {pm.brand} •••• {pm.last4}
                    {pm.isDefault ? t("m.payments.default") : ""}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
          )}

          {error ? <Text style={[styles.error, { color: colors.danger }]}>{error}</Text> : null}

          <View style={styles.actions}>
            <FolkButton label={t("toast.cancel")} variant="ghost" onPress={onClose} disabled={paying} />
            <FolkButton
              label={paying ? t("m.common.processing") : t("m.payments.authorize_and_bid")}
              onPress={() => void paySelected()}
              loading={paying}
              disabled={!selectedId || loading}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    backdrop: {
      flex: 1,
      justifyContent: "flex-end",
      backgroundColor: "rgba(0,0,0,0.45)",
    },
    sheet: {
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      padding: spacing.lg,
      maxHeight: "70%",
    },
    title: { fontSize: 20, fontWeight: "900" },
    subtitle: { fontSize: 13, fontWeight: "600", marginTop: 4, marginBottom: spacing.md },
    list: { maxHeight: 220 },
    cardRow: {
      borderWidth: 1,
      borderRadius: 14,
      padding: spacing.md,
      marginBottom: spacing.sm,
    },
    cardTitle: { fontWeight: "800", fontSize: 15 },
    error: { fontSize: 13, fontWeight: "700", marginTop: spacing.sm },
    actions: { flexDirection: "row", gap: spacing.sm, marginTop: spacing.md },
  });
}
