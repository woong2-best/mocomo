import { useMemo, useState } from "react";
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import type { StarMarketDetail, MarketplaceCheckoutBody } from "@/api/star-market";
import { MarketplacePaymentSheet } from "@/payments/MarketplacePaymentSheet";
import { FolkButton } from "@/ui/FolkButton";
import { KeyboardSheet } from "@/ui/KeyboardSheet";
import { useTheme } from "@/theme/ThemeContext";
import { radii, spacing, type ThemeColors } from "@/theme/tokens";

const SHIP_COUNTRIES = [
  { code: "KR", label: "대한민국" },
  { code: "US", label: "미국" },
  { code: "JP", label: "일본" },
  { code: "CN", label: "중국" },
] as const;

type Props = {
  visible: boolean;
  onClose: () => void;
  item: StarMarketDetail;
  onSuccess?: () => void;
};

export function StarMarketBuySheet({ visible, onClose, item, onSuccess }: Props) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const needsShip = item.type !== "DIGITAL";
  const defaultCountry =
    item.shipToCountries?.[0]?.toUpperCase() ?? (item.shipsWorldwide ? "KR" : "KR");

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

  const shippingExtra =
    item.type === "DIGITAL" || item.shippingFeeType === "FREE"
      ? 0
      : (item.shippingFeeFixed ?? 0);
  const qty = Math.max(1, parseInt(quantity, 10) || 1);
  const total = item.priceAmount * qty + shippingExtra;

  function buy() {
    setError("");
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
    Alert.alert("결제 완료", "주문이 접수되었습니다.");
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
              {total.toLocaleString()}원
              {shippingExtra > 0 ? ` (상품 ${(item.priceAmount * qty).toLocaleString()} + 배송 ${shippingExtra.toLocaleString()})` : ""}
            </Text>

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
                  {SHIP_COUNTRIES.map((c) => (
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
                        {c.label}
                      </Text>
                    </Pressable>
                  ))}
                </ScrollView>
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
                  keyboardType="phone-pad"
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
              label={`${total.toLocaleString()}원 구매하기`}
              onPress={buy}
              disabled={item.isOwner || !item.paymentsEnabled}
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
    backdrop: {
      flex: 1,
      backgroundColor: "rgba(0,0,0,0.45)",
      justifyContent: "flex-end",
    },
    sheet: {
      backgroundColor: colors.surface,
      borderTopLeftRadius: radii.xl,
      borderTopRightRadius: radii.xl,
      padding: spacing.lg,
      maxHeight: "88%",
    },
    title: { fontSize: 18, fontWeight: "800", color: colors.text },
    price: { marginTop: 6, fontSize: 16, fontWeight: "800", color: colors.cobalt },
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
