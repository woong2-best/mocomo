import { useEffect, useState, useMemo } from "react";
import {
  Alert,
  Image as RNImage,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useQueryClient } from "@tanstack/react-query";
import { createMarketplaceListing, fetchUsedPhoneStatus } from "@/api/marketplace";
import { uploadLocalFile } from "@/api/upload-file";
import { ApiError } from "@/api/client";
import { MeetMap } from "@/maps/MeetMap";
import type { MeetCoords } from "@/maps/types";
import { AppHeader } from "@/ui/AppHeader";
import { FolkButton } from "@/ui/FolkButton";
import { Screen } from "@/ui/Screen";
import { useTheme } from "@/theme/ThemeContext";
import { radii, spacing, type ThemeColors } from "@/theme/tokens";
import type { RootStackParamList } from "@/navigation/types";

const CATEGORIES = [
  { id: "FIGURE", label: "피규어/프라모" },
  { id: "GOODS", label: "굿즈/콜렉" },
  { id: "COSPLAY", label: "코스프레" },
  { id: "BOOK", label: "도서/음반" },
  { id: "DIGITAL", label: "디지털" },
  { id: "FASHION", label: "패션/잡화" },
  { id: "OTHER", label: "기타" },
] as const;

const REGIONS = [
  "전국 택배",
  "서울 강남구",
  "서울 마포구",
  "서울 송파구",
  "부산 해운대구",
  "경기 성남시 분당구",
] as const;

export function UsedCreateScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => createThemedStyles(colors), [colors]);

  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const queryClient = useQueryClient();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [category, setCategory] = useState<string>("OTHER");
  const [region, setRegion] = useState<string>("전국 택배");
  const [meetPlace, setMeetPlace] = useState("");
  const [meetCoords, setMeetCoords] = useState<MeetCoords | null>(null);
  const [countryCode, setCountryCode] = useState("KR");
  const [localUri, setLocalUri] = useState<string | null>(null);
  const [mime, setMime] = useState("image/jpeg");
  const [filename, setFilename] = useState("photo.jpg");
  const [busy, setBusy] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    let alive = true;
    void (async () => {
      try {
        const status = await fetchUsedPhoneStatus();
        if (!alive) return;
        if (status.countryCode) setCountryCode(status.countryCode);
        if (!status.eligible) {
          navigation.replace("UsedPhoneVerify");
          return;
        }
      } catch {
        if (alive) navigation.replace("UsedPhoneVerify");
        return;
      } finally {
        if (alive) setChecking(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [navigation]);

  async function pickImage() {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert("권한 필요", "사진 라이브러리 접근을 허용해 주세요.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      quality: 0.85,
    });
    if (result.canceled || !result.assets[0]) return;
    const asset = result.assets[0];
    setLocalUri(asset.uri);
    setMime(asset.mimeType || "image/jpeg");
    setFilename(asset.fileName || `used-${Date.now()}.jpg`);
  }

  async function submit() {
    if (!title.trim()) {
      Alert.alert("제목 필요", "제목을 입력해 주세요.");
      return;
    }
    const priceNum = Math.floor(Number(price) || 0);
    if (priceNum < 0) {
      Alert.alert("가격", "가격이 올바르지 않습니다.");
      return;
    }
    setBusy(true);
    try {
      const images: string[] = [];
      if (localUri) {
        const publicUrl = await uploadLocalFile({
          uri: localUri,
          filename,
          contentType: mime,
          category: "image",
        });
        images.push(publicUrl);
      }

      const res = await createMarketplaceListing({
        title: title.trim(),
        description: description.trim(),
        price: priceNum,
        category,
        region,
        meetPlace: meetPlace.trim() || undefined,
        meetLat: meetCoords?.lat,
        meetLng: meetCoords?.lng,
        meetCountry: countryCode,
        images,
        saleType: "FIXED",
      });
      await queryClient.invalidateQueries({ queryKey: ["mobile-marketplace"] });
      Alert.alert("등록됨", "중고거래 글이 올라갔습니다.", [
        {
          text: "확인",
          onPress: () => navigation.replace("MarketplaceDetail", { id: res.listingId }),
        },
      ]);
    } catch (e) {
      const msg =
        e instanceof ApiError && e.body && typeof e.body === "object" && "error" in e.body
          ? String((e.body as { error: string }).error)
          : e instanceof Error
            ? e.message
            : "등록에 실패했습니다.";
      if (msg.includes("휴대폰")) {
        Alert.alert("휴대폰 인증 필요", msg, [
          { text: "취소", style: "cancel" },
          { text: "인증하기", onPress: () => navigation.replace("UsedPhoneVerify") },
        ]);
      } else {
        Alert.alert("오류", msg);
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen>
      <AppHeader title="중고 판매" leftLabel="닫기" onLeftPress={() => navigation.goBack()} />
      {checking ? (
        <Text style={{ padding: spacing.md, color: colors.textMuted, fontWeight: "600" }}>
          인증 상태 확인 중…
        </Text>
      ) : (
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView contentContainerStyle={styles.body}>
          <Text style={styles.label}>제목</Text>
          <TextInput style={styles.input} value={title} onChangeText={setTitle} />
          <Text style={styles.label}>가격 (원)</Text>
          <TextInput
            style={styles.input}
            value={price}
            onChangeText={setPrice}
            keyboardType="number-pad"
            placeholder="0 = 나눔"
            placeholderTextColor={colors.textMuted}
          />
          <Text style={styles.label}>설명</Text>
          <TextInput
            style={[styles.input, styles.multi]}
            value={description}
            onChangeText={setDescription}
            multiline
          />
          <Text style={styles.label}>카테고리</Text>
          <View style={styles.chips}>
            {CATEGORIES.map((c) => (
              <Pressable
                key={c.id}
                style={[styles.chip, category === c.id && styles.chipOn]}
                onPress={() => setCategory(c.id)}
              >
                <Text style={[styles.chipText, category === c.id && styles.chipTextOn]}>
                  {c.label}
                </Text>
              </Pressable>
            ))}
          </View>
          <Text style={styles.label}>지역</Text>
          <View style={styles.chips}>
            {REGIONS.map((r) => (
              <Pressable
                key={r}
                style={[styles.chip, region === r && styles.chipOn]}
                onPress={() => {
                  setRegion(r);
                  setMeetCoords(null);
                }}
              >
                <Text style={[styles.chipText, region === r && styles.chipTextOn]}>{r}</Text>
              </Pressable>
            ))}
          </View>
          <Text style={styles.label}>직거래 위치</Text>
          <MeetMap
            mode="pick"
            country={countryCode}
            region={region}
            meetPlace={meetPlace}
            coords={meetCoords}
            onCoordsChange={setMeetCoords}
            onMeetPlaceChange={setMeetPlace}
            height={240}
          />
          <TextInput
            style={styles.input}
            value={meetPlace}
            onChangeText={setMeetPlace}
            placeholder="상세 설명 (예: 신호등 앞)"
            placeholderTextColor={colors.textMuted}
          />
          <FolkButton label="사진 추가" variant="secondary" onPress={() => void pickImage()} />
          {localUri ? <RNImage source={{ uri: localUri }} style={styles.preview} /> : null}
          <FolkButton label="등록하기" loading={busy} onPress={() => void submit()} />
        </ScrollView>
      </KeyboardAvoidingView>
      )}
    </Screen>
  );
}

function createThemedStyles(colors: ThemeColors) {
  return StyleSheet.create({
  body: { padding: spacing.md, gap: spacing.sm, paddingBottom: 48 },
  label: { fontWeight: "800", color: colors.cobalt, marginTop: spacing.xs },
  input: {
    borderWidth: 2,
    borderColor: "rgba(27, 74, 140, 0.22)",
    borderRadius: radii.md,
    paddingHorizontal: spacing.sm,
    paddingVertical: 12,
    backgroundColor: colors.surfaceRaised,
    color: colors.text,
    fontWeight: "600",
  },
  multi: { minHeight: 100, textAlignVertical: "top" },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  chip: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: radii.md,
    borderWidth: 2,
    borderColor: "rgba(27, 74, 140, 0.2)",
    backgroundColor: colors.muted,
  },
  chipOn: { backgroundColor: colors.cobalt, borderColor: colors.cobalt },
  chipText: { fontWeight: "700", color: colors.cobalt, fontSize: 13 },
  chipTextOn: { color: "#fff" },
  preview: {
    width: "100%",
    height: 180,
    borderRadius: radii.md,
    backgroundColor: colors.muted,
  },
});
}

