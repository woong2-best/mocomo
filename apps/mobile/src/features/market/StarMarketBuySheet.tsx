import { useEffect, useMemo, useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { showIslandSuccess } from "@/ui/IslandToast";
import type { StarMarketDetail, MarketplaceCheckoutBody } from "@/api/star-market";
import { fetchMarketplaceCheckoutMode } from "@/api/star-market";
import { MarketplacePaymentSheet } from "@/payments/MarketplacePaymentSheet";
import { FolkButton } from "@/ui/FolkButton";
import { KeyboardSheet } from "@/ui/KeyboardSheet";
import { useI18n } from "@/i18n/I18nProvider";
import { useTheme } from "@/theme/ThemeContext";
import { radii, spacing, type ThemeColors } from "@/theme/tokens";
import { formatUsd } from "@/lib/money";
import {
  listingShipsToCountry,
  MARKETPLACE_SHIP_COUNTRIES,
  shipCountryLabel,
  UNSUPPORTED_SHIP_COUNTRY_MESSAGE,
} from "@/lib/marketplace-shipping";

type Props = {
  visible: boolean;
  onClose: () => void;
  item: StarMarketDetail;
  onSuccess?: () => void;
};

export function StarMarketBuySheet({ visible, onClose, item, onSuccess }: Props) {
  const { colors } = useTheme();
  const { locale, t } = useI18n();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const needsShip = item.type !== "DIGITAL";
  const shipLocale = locale.startsWith("en") ? "en" : "ko";
  const defaultCountry =
    item.shipToCountries?.[0]?.toUpperCase() ?? MARKETPLACE_SHIP_COUNTRIES[0]?.code ?? "US";

  const [quantity, setQuantity] = useState("1");
  const [shipName, setShipName] = useState("");
  const [shipCountry, setShipCountry] = useState(defaultCountry);
  const [shipPostal, setShipPostal] = useState("");
  const [shipAddress1, setShipAddress1] = useState("");
  const [shipAddress2, setShipAddress2] = useState("");
  const [shipPhone, setShipPhone] = useState("");
  const [error, setError] = useState("");
  const [payVisible, setPayVisible] = useState(false);
  const [checkoutBody, setCheckoutBody] = useState<MarketplaceCheckoutBody | null>(null);
  const [buyLabel, setBuyLabel] = useState("구매하기");
  const [disclaimer, setDisclaimer] = useState("");
  const [blocked, setBlocked] = useState(false);

  const shippingExtra =
    item.type === "DIGITAL" || item.shippingFeeType === "FREE"
      ? 0
      : (item.shippingFeeFixed ?? 0);
  const qty = Math.max(1, parseInt(quantity, 10) || 1);
  const total = item.priceAmount * qty + shippingExtra;

  const shipsHere = useMemo(
    () =>
      !needsShip ||
      listingShipsToCountry(item.shipToCountries, item.shipsWorldwide, shipCountry),
    [needsShip, item.shipToCountries, item.shipsWorldwide, shipCountry]
  );

  useEffect(() => {
    if (!visible) return;
    void fetchMarketplaceCheckoutMode(
      item.id,
      needsShip ? shipCountry : undefined,
      locale.split("-")[0]
    )
      .then((eligibility) => {
        setBuyLabel(eligibility.primaryButtonLabel);
        setDisclaimer(eligibility.disclaimer);
        setBlocked(eligibility.mode === "BLOCKED" || !!eligibility.blocked);
        if (!eligibility.sellerReady && eligibility.sellerReadyMessage) {
          setError(eligibility.sellerReadyMessage);
        } else {
          setError("");
        }
      })
      .catch(() => {
        setBlocked(false);
        setBuyLabel("바로 구매 / Checkout");
      });
  }, [visible, item.id, shipCountry, needsShip, locale]);

  function buy() {
    setError("");
    if (blocked) {
      setError(disclaimer || t("market.unavailable"));
      return;
    }
    if (needsShip && !shipsHere) {
      setError(UNSUPPORTED_SHIP_COUNTRY_MESSAGE);
      return;
    }
    const body: MarketplaceCheckoutBody = {
      quantity: needsShip ? qty : 1,
      shipName: needsShip ? shipName.trim() : undefined,
      shipCountry: needsShip ? shipCountry : undefined,
      shipPostal: needsShip ? shipPostal.trim() : undefined,
      shipAddress1: needsShip ? shipAddress1.trim() : undefined,
      shipAddress2: needsShip ? shipAddress2.trim() : undefined,
      shipPhone: needsShip ? shipPhone.trim() : undefined,
    };
    setCheckoutBody(body);
    setPayVisible(true);
  }

  function handlePaySuccess() {
    onSuccess?.();
    onClose();
    showIslandSuccess("결제 완료", "주문이 접수되었습니다.");
  }

  return (
    <>
      <KeyboardSheet
        visible={visible}
        onClose={onClose}
        maxHeight="88%"
        sheetStyle={{
          backgroundColor: colors.surface,
          borderTopLeftRadius: radii.xl,
          borderTopRightRadius: radii.xl,
        }}
      >
        <ScrollView keyboardShouldPersistTaps="handled" automaticallyAdjustKeyboardInsets>
          <Text style={styles.title}>{item.title}</Text>
          <Text style={styles.price}>
            {formatUsd(total)}
            {shippingExtra > 0
              ? ` (상품 ${formatUsd(item.priceAmount * qty)} + 배송 ${formatUsd(shippingExtra)})`
              : ""}
          </Text>

          {disclaimer ? (
            <Text
              style={[
                styles.disclaimer,
                { color: blocked ? colors.terracotta : colors.textMuted },
              ]}
            >
              {disclaimer}
            </Text>
          ) : null}

          {needsShip ? (
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>배송지</Text>
              <TextInput
                style={styles.input}
                placeholder="이름"
                placeholderTextColor={colors.textMuted}
                value={shipName}
                onChangeText={setShipName}
              />
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chips}>
                {MARKETPLACE_SHIP_COUNTRIES.map((c) => (
                  <Pressable
                    key={c.code}
                    style={[styles.chip, shipCountry === c.code && styles.chipActive]}
                    onPress={() => setShipCountry(c.code)}
                  >
                    <Text
                      style={[
                        styles.chipText,
                        shipCountry === c.code && styles.chipTextActive,
                      ]}
                    >
                      {shipCountryLabel(c.code, shipLocale)}
                    </Text>
                  </Pressable>
                ))}
              </ScrollView>
              {needsShip && !shipsHere ? (
                <Text style={styles.error}>{UNSUPPORTED_SHIP_COUNTRY_MESSAGE}</Text>
              ) : null}
              <TextInput
                style={styles.input}
                placeholder="우편번호"
                placeholderTextColor={colors.textMuted}
                value={shipPostal}
                onChangeText={setShipPostal}
              />
              <TextInput
                style={styles.input}
                placeholder="주소"
                placeholderTextColor={colors.textMuted}
                value={shipAddress1}
                onChangeText={setShipAddress1}
              />
              <TextInput
                style={styles.input}
                placeholder="상세 주소 (선택)"
                placeholderTextColor={colors.textMuted}
                value={shipAddress2}
                onChangeText={setShipAddress2}
              />
              <TextInput
                style={styles.input}
                placeholder="연락처 (선택)"
                placeholderTextColor={colors.textMuted}
                value={shipPhone}
                onChangeText={setShipPhone}
              />
              <TextInput
                style={styles.input}
                placeholder="수량"
                placeholderTextColor={colors.textMuted}
                value={quantity}
                onChangeText={setQuantity}
                keyboardType="number-pad"
              />
            </View>
          ) : null}

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <FolkButton
            label={`${formatUsd(total)} · ${buyLabel}`}
            onPress={buy}
            disabled={item.isOwner || !item.paymentsEnabled || !!error || blocked}
          />
          <Pressable onPress={onClose} style={styles.cancel}>
            <Text style={styles.cancelText}>닫기</Text>
          </Pressable>
        </ScrollView>
      </KeyboardSheet>
      {checkoutBody ? (
        <MarketplacePaymentSheet
          visible={payVisible}
          listingId={item.id}
          body={checkoutBody}
          onClose={() => setPayVisible(false)}
          onSuccess={() => handlePaySuccess()}
        />
      ) : null}
    </>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    title: { fontSize: 18, fontWeight: "800", color: colors.text },
    price: { marginTop: 6, fontSize: 16, fontWeight: "800", color: colors.cobalt },
    disclaimer: {
      marginTop: spacing.sm,
      fontSize: 12,
      fontWeight: "600",
      lineHeight: 18,
    },
    section: { marginTop: spacing.md, gap: spacing.sm },
    sectionLabel: { fontWeight: "700", color: colors.textMuted, fontSize: 12 },
    input: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: radii.md,
      paddingHorizontal: 14,
      paddingVertical: 12,
      color: colors.text,
      backgroundColor: colors.background,
    },
    chips: { flexDirection: "row", marginVertical: 4 },
    chip: {
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: radii.pill,
      borderWidth: 1,
      borderColor: colors.border,
      marginRight: 8,
    },
    chipActive: { backgroundColor: colors.cobalt, borderColor: colors.cobalt },
    chipText: { fontWeight: "700", color: colors.text, fontSize: 12 },
    chipTextActive: { color: "#fff" },
    error: { color: colors.danger, fontWeight: "600", marginVertical: 8 },
    cancel: { alignItems: "center", paddingVertical: 12 },
    cancelText: { color: colors.textMuted, fontWeight: "600" },
  });
}
