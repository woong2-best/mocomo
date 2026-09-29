import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { createCommerceListing, fetchMarketSellAccess } from "@/api/commerce-market";
import { openMarketSellerWebFlow } from "@/lib/open-market-seller-web";
import { AppHeader } from "@/ui/AppHeader";
import { FolkButton } from "@/ui/FolkButton";
import { Screen } from "@/ui/Screen";
import { showIslandSuccess } from "@/ui/IslandToast";
import { useTheme } from "@/theme/ThemeContext";
import { radii, spacing, type ThemeColors } from "@/theme/tokens";
import type { RootStackParamList } from "@/navigation/types";
import { useI18n } from "@/i18n/I18nProvider";

const TYPES = [
  { id: "PHYSICAL" as const },
  { id: "CUSTOM_ORDER" as const },
  { id: "PREORDER" as const },
] as const;

function listingTypeLabel(id: (typeof TYPES)[number]["id"], u: (ko: string, en: string) => string): string {
  switch (id) {
    case "PHYSICAL":
      return u("일반상품", "Physical");
    case "CUSTOM_ORDER":
      return u("주문제작", "Custom order");
    case "PREORDER":
      return u("예약판매", "Pre-order");
  }
}

export function MarketSellItemScreen() {
  const { u, t } = useI18n();
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
  const [isNsfw, setIsNsfw] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    void (async () => {
      try {
        const gate = await fetchMarketSellAccess();
        if (!gate.allowed) {
          if (gate.redirectTo === "register") {
            await openMarketSellerWebFlow(navigation);
            if (navigation.canGoBack()) navigation.goBack();
          } else {
            navigation.replace("SellerListings");
          }
          return;
        }
      } catch {
        await openMarketSellerWebFlow(navigation);
        if (navigation.canGoBack()) navigation.goBack();
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
      setError(u("제목, 설명, 가격을 입력해 주세요.", "Enter title, description, and price."));
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
        isNsfw,
      });
      showIslandSuccess(u("등록 완료", "Listed"), u("상품이 등록되었습니다.", "Your listing was created."));
      navigation.replace("StarMarketDetail", { id: result.listingId });
    } catch (e) {
      setError(e instanceof Error ? e.message : u("등록에 실패했습니다.", "Could not create listing."));
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
      <AppHeader title={u("판매 등록", "New listing")} leftLabel={t("common.back")} onLeftPress={() => navigation.goBack()} />
      <ScrollView
        contentContainerStyle={{
          padding: spacing.md,
          paddingBottom: insets.bottom + 32,
          gap: 12,
        }}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.label}>{u("상품 유형", "Product type")}</Text>
        <View style={styles.typeRow}>
          {TYPES.map((item) => (
            <FolkButton
              key={item.id}
              label={listingTypeLabel(item.id, u)}
              variant={type === item.id ? "primary" : "secondary"}
              onPress={() => setType(item.id)}
              style={{ flex: 1 }}
            />
          ))}
        </View>

        <Text style={styles.label}>{u("제목", "Title")}</Text>
        <TextInput style={styles.input} value={title} onChangeText={setTitle} maxLength={120} />

        <Text style={styles.label}>{u("설명", "Description")}</Text>
        <TextInput
          style={[styles.input, styles.multiline]}
          value={description}
          onChangeText={setDescription}
          multiline
          textAlignVertical="top"
        />

        <Text style={styles.label}>{u("카테고리", "Category")}</Text>
        <TextInput style={styles.input} value={category} onChangeText={setCategory} />

        <Text style={styles.label}>{u("가격 (USD)", "Price (USD)")}</Text>
        <TextInput
          style={styles.input}
          value={price}
          onChangeText={setPrice}
          keyboardType="number-pad"
        />

        {type !== "CUSTOM_ORDER" ? (
          <>
            <Text style={styles.label}>{u("재고", "Stock")}</Text>
            <TextInput
              style={styles.input}
              value={stock}
              onChangeText={setStock}
              keyboardType="number-pad"
            />
          </>
        ) : (
          <>
            <Text style={styles.label}>{u("제작 일수", "Production days")}</Text>
            <TextInput
              style={styles.input}
              value={productionDays}
              onChangeText={setProductionDays}
              keyboardType="number-pad"
            />
          </>
        )}

        <View style={styles.nsfwRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.nsfwLabel}>NSFW</Text>
            <Text style={styles.nsfwHint}>{u("민감한 콘텐츠가 포함되면 켜 주세요", "Turn on if the listing includes sensitive content.")}</Text>
          </View>
          <Switch
            value={isNsfw}
            onValueChange={setIsNsfw}
            disabled={busy}
            trackColor={{ true: "#c80000" }}
          />
        </View>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <FolkButton
          label={busy ? u("등록 중…", "Listing…") : u("상품 등록", "Publish listing")}
          onPress={() => void submit()}
          disabled={busy}
        />

        <Text style={styles.hint}>
          {u(
            "이미지·배송 설정 등 상세 옵션은 웹 판매자 센터에서 수정할 수 있습니다.",
            "Edit images, shipping, and more in the web seller center."
          )}
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
    nsfwRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      paddingVertical: 4,
    },
    nsfwLabel: { fontWeight: "800", color: colors.text, fontSize: 14 },
    nsfwHint: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  });
}
