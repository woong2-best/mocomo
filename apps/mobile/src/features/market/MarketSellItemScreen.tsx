import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { createCommerceListing, fetchMarketSellAccess } from "@/api/commerce-market";
import { AppHeader } from "@/ui/AppHeader";
import { FolkButton } from "@/ui/FolkButton";
import { Screen } from "@/ui/Screen";
import { useTheme } from "@/theme/ThemeContext";
import { radii, spacing, type ThemeColors } from "@/theme/tokens";
import type { RootStackParamList } from "@/navigation/types";

const TYPES = [
  { id: "PHYSICAL" as const, label: "일반상품" },
  { id: "CUSTOM_ORDER" as const, label: "주문제작" },
  { id: "PREORDER" as const, label: "예약판매" },
];

export function MarketSellItemScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const insets = useSafeAreaInsets();

  const [gateLoading, setGateLoading] = useState(true);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState<(typeof TYPES)[number]["id"]>("PHYSICAL");
  const [category, setCategory] = useState("굿즈");
  const [price, setPrice] = useState("");
  const [stock, setStock] = useState("1");
  const [productionDays, setProductionDays] = useState("7");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    void (async () => {
      try {
        const gate = await fetchMarketSellAccess();
        if (!gate.allowed) {
          if (gate.redirectTo === "register") {
            navigation.replace("SellerRegister");
          } else {
            navigation.replace("SellerListings");
          }
          return;
        }
      } catch {
        navigation.replace("SellerRegister");
        return;
      } finally {
        setGateLoading(false);
      }
    })();
  }, [navigation]);

  async function submit() {
    setError("");
    const priceAmount = parseInt(price.replace(/\D/g, ""), 10);
    if (!title.trim() || !description.trim() || !priceAmount) {
      setError("제목, 설명, 가격을 입력해 주세요.");
      return;
    }
    setBusy(true);
    try {
      const result = await createCommerceListing({
        title: title.trim(),
        description: description.trim(),
        type,
        category: category.trim() || "굿즈",
        priceAmount,
        stock: type === "PHYSICAL" || type === "PREORDER" ? parseInt(stock, 10) || 1 : undefined,
        productionDays:
          type === "CUSTOM_ORDER" ? parseInt(productionDays, 10) || 7 : undefined,
      });
      Alert.alert("등록 완료", "상품이 등록되었습니다.", [
        {
          text: "확인",
          onPress: () =>
            navigation.replace("StarMarketDetail", { id: result.listingId }),
        },
      ]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "등록에 실패했습니다.");
    } finally {
      setBusy(false);
    }
  }

  if (gateLoading) {
    return (
      <Screen>
        <ActivityIndicator style={{ marginTop: 80 }} color={colors.terracotta} />
      </Screen>
    );
  }

  return (
    <Screen>
      <AppHeader title="판매 등록" leftLabel="뒤로" onLeftPress={() => navigation.goBack()} />
      <ScrollView
        contentContainerStyle={{
          padding: spacing.md,
          paddingBottom: insets.bottom + 32,
          gap: 12,
        }}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.label}>상품 유형</Text>
        <View style={styles.typeRow}>
          {TYPES.map((t) => (
            <FolkButton
              key={t.id}
              label={t.label}
              variant={type === t.id ? "primary" : "secondary"}
              onPress={() => setType(t.id)}
              style={{ flex: 1 }}
            />
          ))}
        </View>

        <Text style={styles.label}>제목</Text>
        <TextInput style={styles.input} value={title} onChangeText={setTitle} maxLength={120} />

        <Text style={styles.label}>설명</Text>
        <TextInput
          style={[styles.input, styles.multiline]}
          value={description}
          onChangeText={setDescription}
          multiline
          textAlignVertical="top"
        />

        <Text style={styles.label}>카테고리</Text>
        <TextInput style={styles.input} value={category} onChangeText={setCategory} />

        <Text style={styles.label}>가격 (원)</Text>
        <TextInput
          style={styles.input}
          value={price}
          onChangeText={setPrice}
          keyboardType="number-pad"
        />

        {type !== "CUSTOM_ORDER" ? (
          <>
            <Text style={styles.label}>재고</Text>
            <TextInput
              style={styles.input}
              value={stock}
              onChangeText={setStock}
              keyboardType="number-pad"
            />
          </>
        ) : (
          <>
            <Text style={styles.label}>제작 일수</Text>
            <TextInput
              style={styles.input}
              value={productionDays}
              onChangeText={setProductionDays}
              keyboardType="number-pad"
            />
          </>
        )}

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <FolkButton
          label={busy ? "등록 중…" : "상품 등록"}
          onPress={() => void submit()}
          disabled={busy}
        />

        <Text style={styles.hint}>
          이미지·배송 설정 등 상세 옵션은 웹 판매자 센터에서 수정할 수 있습니다.
        </Text>
      </ScrollView>
    </Screen>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    label: { fontWeight: "800", color: colors.text, fontSize: 14 },
    typeRow: { flexDirection: "row", gap: 8 },
    input: {
      borderWidth: 2,
      borderColor: "rgba(27, 74, 140, 0.2)",
      borderRadius: radii.lg,
      paddingHorizontal: 14,
      paddingVertical: 12,
      fontSize: 15,
      color: colors.text,
      backgroundColor: colors.surfaceRaised,
    },
    multiline: { minHeight: 120 },
    error: { color: colors.danger, fontWeight: "600" },
    hint: { fontSize: 12, color: colors.textMuted, lineHeight: 18 },
  });
}
