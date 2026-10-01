import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
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
import { useNavigation, useRoute, type RouteProp } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useQueryClient } from "@tanstack/react-query";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useScrollFieldAboveKeyboard } from "@/lib/use-scroll-field-above-keyboard";
import {
  createMarketplaceListing,
  fetchMarketplaceDetail,
  fetchUsedPhoneStatus,
  updateMarketplaceListing,
} from "@/api/marketplace";
import { uploadLocalFile } from "@/api/upload-file";
import { ApiError } from "@/api/client";
import { MeetMap } from "@/maps/MeetMap";
import type { MeetCoords } from "@/maps/types";
import { MarketCheckOption } from "@/features/marketplace/MarketCheckOption";
import { Screen } from "@/ui/Screen";
import {
  showIslandError,
  showIslandInfo,
  showIslandPrompt,
  showIslandSuccess,
} from "@/ui/IslandToast";
import { useI18n } from "@/i18n/I18nProvider";
import { useTheme } from "@/theme/ThemeContext";
import { spacing, type ThemeColors } from "@/theme/tokens";
import type { RootStackParamList } from "@/navigation/types";
import {
  EMPTY_MOBILE_SUBCULTURE,
  UsedSubcultureFormSection,
  type MobileSubcultureFormState,
} from "@/features/marketplace/UsedSubcultureFormSection";
import {
  formatUsedRegion,
  inferUsedRegionFromGeocodeLabel,
  homeCurrencyForCountry,
  KOREA_SIDO,
  KOREA_SIGUNGU_BY_SIDO,
  listingCurrencyChoices,
  parseListingPriceInput,
  productTypeForSellKind,
  usedCurrencyLabel,
  USED_CURRENCY_META,
  USED_SHIPPING_REGION,
} from "@/features/marketplace/used-catalog";

const MAX_LISTING_IMAGES = 10;

type LocalListingImage = {
  id: string;
  uri: string;
  mime: string;
  filename: string;
  kind: "image" | "video";
};

export function UsedCreateScreen() {
  const { u } = useI18n();
  const { colors, isDark } = useTheme();
  const ink = isDark ? colors.text : colors.brand;
  const paper = colors.surfaceRaised;
  const muted = colors.textMuted;
  const line = colors.border;
  const styles = useMemo(() => createStyles(colors), [colors]);

  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<RootStackParamList, "UsedCreate">>();
  const editId = route.params?.editId;
  const [giveaway, setGiveaway] = useState(false);
  const queryClient = useQueryClient();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [currency, setCurrency] = useState("krw");
  const [region, setRegion] = useState<string>(USED_SHIPPING_REGION);
  const [regionText, setRegionText] = useState("");
  const [sidoId, setSidoId] = useState<string>(KOREA_SIDO[0]?.id ?? "seoul");
  const [sigungu, setSigungu] = useState<string>(KOREA_SIGUNGU_BY_SIDO.seoul?.[0] ?? "종로구");
  const [meetPlace, setMeetPlace] = useState("");
  const [meetCoords, setMeetCoords] = useState<MeetCoords | null>(null);
  const [countryCode, setCountryCode] = useState("KR");
  const [localImages, setLocalImages] = useState<LocalListingImage[]>([]);
  const [existingImages, setExistingImages] = useState<string[]>([]);
  const [isNsfw, setIsNsfw] = useState(false);
  const [subculture, setSubculture] = useState<MobileSubcultureFormState>(EMPTY_MOBILE_SUBCULTURE);
  const isTrade = !giveaway && subculture.tradeMode === "TRADE";
  const [busy, setBusy] = useState(false);
  const [checking, setChecking] = useState(true);
  const insets = useSafeAreaInsets();
  const { scrollRef, frameRef, keyboardLift, onScrollOffset, onInputFocus } =
    useScrollFieldAboveKeyboard();
  const meetPlaceRef = useRef<TextInput>(null);

  useEffect(() => {
    if (!editId) return;
    let alive = true;
    void (async () => {
      try {
        const detail = await fetchMarketplaceDetail(editId);
        if (!alive || !detail.item) return;
        const item = detail.item;
        if (!item.isOwner) {
          showIslandError(u("수정 불가", "Can't edit"), u("본인 글만 수정할 수 있습니다.", "You can only edit your own listing."));
          navigation.goBack();
          return;
        }
        if (item.status !== "SELLING") {
          showIslandError(u("수정 불가", "Can't edit"), u("거래가 진행 중이어서 수정할 수 없습니다.", "This listing can't be edited while a trade is in progress."));
          navigation.goBack();
          return;
        }
        setTitle(item.title);
        setDescription(item.description ?? "");
        setPrice(String(item.price ?? ""));
        setCurrency(item.currency ?? "krw");
        setRegion(item.region ?? region);
        setMeetPlace(item.meetPlace ?? "");
        if (item.meetLat != null && item.meetLng != null) {
          setMeetCoords({ lat: item.meetLat, lng: item.meetLng });
        }
        setIsNsfw(!!item.isNsfw);
        setExistingImages(item.images ?? []);
        setSubculture((prev) => ({
          ...prev,
          workTitle: item.workTitle ?? "",
          animeSlug: item.animeSlug ?? null,
          productType: item.productType ?? prev.productType,
          characterName: item.characterName ?? "",
          conditionGrade: item.conditionGrade ?? "",
          tradeMode: item.tradeMode === "TRADE" ? "TRADE" : "SELL",
        }));
      } catch {
        if (alive) showIslandError(u("오류", "Error"), u("글 정보를 불러오지 못했습니다.", "Could not load listing details."));
      }
    })();
    return () => {
      alive = false;
    };
  }, [editId, navigation, region]);

  useEffect(() => {
    let alive = true;
    void (async () => {
      try {
        const status = await fetchUsedPhoneStatus();
        if (!alive) return;
        if (status.countryCode) {
          setCountryCode(status.countryCode);
          setCurrency(homeCurrencyForCountry(status.countryCode));
        }
        if (status.countryCode?.toUpperCase() === "KR") {
          const firstSido = KOREA_SIDO[0];
          const firstCity = KOREA_SIGUNGU_BY_SIDO[firstSido.id]?.[0] ?? "종로구";
          setSidoId(firstSido.id);
          setSigungu(firstCity);
          setRegion(formatUsedRegion(firstSido.short, firstCity));
        } else {
          setRegion("Shipping");
        }
        if (!status.eligible && status.countryCode?.toUpperCase() !== "KR") {
          navigation.replace("UsedPhoneVerify", { next: "UsedCreate" });
          return;
        }
      } catch {
        return;
      } finally {
        if (alive) setChecking(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [navigation]);

  const imageCount = existingImages.length + localImages.length;

  async function pickImage() {
    if (imageCount >= MAX_LISTING_IMAGES) {
      showIslandInfo(
        u("사진 제한", "Photo limit"),
        u(
          `사진은 최대 ${MAX_LISTING_IMAGES}장까지 추가할 수 있습니다.`,
          `You can add up to ${MAX_LISTING_IMAGES} photos.`
        )
      );
      return;
    }
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      showIslandError(u("권한 필요", "Permission needed"), u("사진 라이브러리 접근을 허용해 주세요.", "Allow access to your photo library."));
      return;
    }
    const remaining = MAX_LISTING_IMAGES - imageCount;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images", "videos"],
      allowsMultipleSelection: remaining > 1,
      selectionLimit: remaining,
      quality: 0.85,
    });
    if (result.canceled || result.assets.length === 0) return;
    const batch = result.assets.slice(0, remaining);
    if (batch.length < result.assets.length) {
      showIslandInfo(
        u("사진 제한", "Photo limit"),
        u(
          `${remaining}장만 추가했습니다. (최대 ${MAX_LISTING_IMAGES}장)`,
          `Added ${remaining} photos only (max ${MAX_LISTING_IMAGES}).`
        )
      );
    }
    setLocalImages((prev) => [
      ...prev,
      ...batch.map((asset, i) => {
        const isVideo = asset.type === "video" || (asset.mimeType?.startsWith("video/") ?? false);
        return {
          id: `local-${Date.now()}-${i}-${Math.random().toString(36).slice(2, 8)}`,
          uri: asset.uri,
          mime: asset.mimeType || (isVideo ? "video/mp4" : "image/jpeg"),
          filename: asset.fileName || `used-${Date.now()}-${i}.${isVideo ? "mp4" : "jpg"}`,
          kind: isVideo ? ("video" as const) : ("image" as const),
        };
      }),
    ]);
  }

  function removeExistingImage(index: number) {
    setExistingImages((prev) => prev.filter((_, i) => i !== index));
  }

  function removeLocalImage(id: string) {
    setLocalImages((prev) => prev.filter((img) => img.id !== id));
  }

  async function submit() {
    if (!subculture.productType) {
      showIslandError(u("상품 종류", "Product type"), u("상품 종류를 선택해 주세요.", "Choose a product type."));
      return;
    }
    if (!title.trim()) {
      showIslandError(u("제목 필요", "Title required"), u("제목을 입력해 주세요.", "Enter a title."));
      return;
    }
    const priceNum =
      giveaway || isTrade ? 0 : parseListingPriceInput(price, currency);
    if (priceNum < 0) {
      showIslandError(u("가격", "Price"), u("가격이 올바르지 않습니다.", "Enter a valid price."));
      return;
    }
    if (!giveaway && !isTrade && priceNum <= 0) {
      showIslandError(u("가격", "Price"), u("가격을 입력해 주세요.", "Enter a price."));
      return;
    }
    setBusy(true);
    try {
      const uploaded: string[] = [...existingImages];
      for (const img of localImages) {
        const publicUrl = await uploadLocalFile({
          uri: img.uri,
          filename: img.filename,
          contentType: img.mime,
          category: img.kind === "video" ? "video" : "image",
        });
        uploaded.push(publicUrl);
      }
      const images = uploaded;
      if (images.length === 0) {
        showIslandError(u("사진 필요", "Photos required"), u("상품 사진을 추가해 주세요.", "Add at least one product photo."));
        setBusy(false);
        return;
      }

      const submitRegion =
        countryCode.toUpperCase() === "KR"
          ? sidoId === "__shipping__"
            ? USED_SHIPPING_REGION
            : formatUsedRegion(
                KOREA_SIDO.find((s) => s.id === sidoId)?.short ?? "서울",
                sigungu
              )
          : region === "Shipping"
            ? "Shipping"
            : regionText.trim() || region;

      const payload = {
        title: title.trim(),
        description: description.trim(),
        price: priceNum,
        currency,
        category: subculture.productType,
        categories: [subculture.productType],
        region: submitRegion,
        meetPlace: meetPlace.trim() || undefined,
        meetLat: meetCoords?.lat,
        meetLng: meetCoords?.lng,
        meetCountry: countryCode,
        images,
        saleType: "FIXED" as const,
        isNsfw,
        workTitle: subculture.workTitle.trim() || undefined,
        animeSlug: subculture.animeSlug ?? undefined,
        productType: productTypeForSellKind(subculture.productType),
        conditionGrade: subculture.conditionGrade || undefined,
        tradeMode: subculture.tradeMode === "TRADE" ? "TRADE" : "SELL",
      } as const;

      const listingId = editId
        ? (await updateMarketplaceListing(editId, payload)).listingId
        : (await createMarketplaceListing(payload)).listingId;
      await queryClient.invalidateQueries({ queryKey: ["mobile-marketplace"] });
      await queryClient.invalidateQueries({ queryKey: ["mobile-marketplace-mine"] });
      showIslandSuccess(
        editId ? u("수정됨", "Updated") : u("등록됨", "Posted"),
        editId ? u("글이 수정되었습니다.", "Your listing was updated.") : u("글이 올라갔습니다.", "Your listing is live.")
      );
      navigation.replace("MarketplaceDetail", { id: listingId });
    } catch (e) {
      const msg =
        e instanceof ApiError && e.body && typeof e.body === "object" && "error" in e.body
          ? String((e.body as { error: string }).error)
          : e instanceof Error
            ? e.message
            : u("등록에 실패했습니다.", "Could not publish listing.");
      if (
        countryCode.toUpperCase() !== "KR" &&
        (msg.includes("휴대폰") || msg.includes("인증"))
      ) {
        showIslandPrompt(u("본인 확인 필요", "Verification required"), msg, {
          label: u("휴대폰 인증", "Verify phone"),
          onPress: () =>
            navigation.replace("UsedPhoneVerify", { next: "UsedCreate" }),
        });
      } else {
        showIslandError(u("오류", "Error"), msg);
      }
    } finally {
      setBusy(false);
    }
  }

  const syncRegionFromMapLabel = useCallback(
    (label: string) => {
      if (countryCode.toUpperCase() !== "KR") return;
      const inferred = inferUsedRegionFromGeocodeLabel(label);
      if (!inferred) return;
      setSidoId(inferred.sidoId);
      setSigungu(inferred.sigungu);
      const short = KOREA_SIDO.find((s) => s.id === inferred.sidoId)?.short ?? "";
      setRegion(formatUsedRegion(short, inferred.sigungu));
    },
    [countryCode]
  );

  const locationLabel =
    countryCode.toUpperCase() === "KR"
      ? sidoId === "__shipping__"
        ? u(USED_SHIPPING_REGION, "Nationwide shipping")
        : `${KOREA_SIDO.find((s) => s.id === sidoId)?.short ?? ""} ${sigungu}`.trim()
      : region === "Shipping"
        ? u("배송", "Shipping")
        : regionText.trim() || u("도시 입력", "Enter city");

  return (
    <Screen safeBottom>
      <View style={styles.topBar}>
        <Pressable onPress={() => navigation.goBack()} hitSlop={10} accessibilityRole="button">
          <Ionicons name="chevron-back" size={26} color={ink} />
        </Pressable>
      </View>
      {checking ? (
        <Text style={{ padding: spacing.md, color: muted, fontWeight: "600" }}>{u("확인 중…", "Checking…")}</Text>
      ) : (
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
          <View style={{ flex: 1 }}>
            <View ref={frameRef} style={{ flex: 1, marginBottom: keyboardLift }}>
              <ScrollView
                ref={scrollRef}
                style={{ flex: 1 }}
                contentContainerStyle={[
                  styles.body,
                  { paddingBottom: insets.bottom + 88 + keyboardLift },
                ]}
                keyboardShouldPersistTaps="handled"
                keyboardDismissMode="on-drag"
                automaticallyAdjustKeyboardInsets={Platform.OS === "ios"}
                onScroll={(e) => onScrollOffset(e.nativeEvent.contentOffset.y)}
                scrollEventThrottle={16}
              >
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.photoRow}
              keyboardShouldPersistTaps="handled"
            >
              {imageCount < MAX_LISTING_IMAGES ? (
                <Pressable
                  style={styles.photoTile}
                  onPress={() => void pickImage()}
                  accessibilityRole="button"
                  accessibilityLabel={u("사진 추가", "Add photo")}
                >
                  <Ionicons name="camera-outline" size={26} color={ink} />
                  <Text style={styles.photoCount}>
                    {imageCount}/{MAX_LISTING_IMAGES}
                  </Text>
                </Pressable>
              ) : null}
              {existingImages.map((uri, index) => (
                <View key={`existing-${uri}-${index}`} style={styles.photoTile}>
                  <RNImage source={{ uri }} style={styles.photo} />
                  <Pressable
                    style={styles.photoRemove}
                    onPress={() => removeExistingImage(index)}
                    hitSlop={6}
                    accessibilityRole="button"
                    accessibilityLabel={u("사진 삭제", "Remove photo")}
                  >
                    <Ionicons name="close" size={14} color="#fff" />
                  </Pressable>
                </View>
              ))}
              {localImages.map((img) => (
                <View key={img.id} style={styles.photoTile}>
                  <RNImage source={{ uri: img.uri }} style={styles.photo} />
                  <Pressable
                    style={styles.photoRemove}
                    onPress={() => removeLocalImage(img.id)}
                    hitSlop={6}
                    accessibilityRole="button"
                    accessibilityLabel={u("사진 삭제", "Remove photo")}
                  >
                    <Ionicons name="close" size={14} color="#fff" />
                  </Pressable>
                </View>
              ))}
            </ScrollView>

            <View style={styles.block}>
              <Text style={styles.label}>{u("제목", "Title")}</Text>
              <TextInput
                style={styles.input}
                value={title}
                onChangeText={setTitle}
                placeholder={u("제목을 입력해 주세요.", "Enter a title.")}
                placeholderTextColor={muted}
              />
            </View>

            <View style={styles.block}>
              <Text style={styles.label}>{u("자세한 설명", "Description")}</Text>
              <TextInput
                style={[styles.input, styles.multi]}
                value={description}
                onChangeText={setDescription}
                multiline
                placeholder={u(
                  "올릴 물건의 내용을 작성해 주세요. 원활하고 안전한 트레이드를 위해 상세한 정보를 입력해 주세요.",
                  "Describe your item in detail for a smooth, safe trade."
                )}
                placeholderTextColor={muted}
              />
            </View>

            <View style={styles.block}>
              <Text style={styles.label}>{u("거래 방식", "Listing type")}</Text>
              <View style={styles.checkWrap}>
                <MarketCheckOption
                  label={u("판매하기", "Sell")}
                  checked={!giveaway && !isTrade}
                  onPress={() => {
                    setGiveaway(false);
                    setSubculture((s) => ({ ...s, tradeMode: "SELL" }));
                  }}
                  ink={ink}
                  paper={paper}
                  line={line}
                />
                <MarketCheckOption
                  label={u("나눔하기", "Give away")}
                  checked={giveaway}
                  onPress={() => {
                    setGiveaway(true);
                    setPrice("0");
                    setSubculture((s) => ({ ...s, tradeMode: "SELL" }));
                  }}
                  ink={ink}
                  paper={paper}
                  line={line}
                />
                <MarketCheckOption
                  label={u("교환", "Trade")}
                  checked={isTrade}
                  onPress={() => {
                    setGiveaway(false);
                    setPrice("0");
                    setSubculture((s) => ({ ...s, tradeMode: "TRADE" }));
                  }}
                  ink={ink}
                  paper={paper}
                  line={line}
                />
              </View>
              {!giveaway && !isTrade ? (
                <>
                  <Text style={[styles.label, styles.priceSectionLabel]}>{u("가격", "Price")}</Text>
                  <View style={styles.checkWrap}>
                    {listingCurrencyChoices(countryCode).map((c) => (
                      <MarketCheckOption
                        key={c.id}
                        label={usedCurrencyLabel(c.id, u)}
                        checked={currency === c.id}
                        onPress={() => {
                          setCurrency(c.id);
                          setPrice("");
                        }}
                        ink={ink}
                        paper={paper}
                        line={line}
                      />
                    ))}
                  </View>
                  <View style={styles.priceRow}>
                    <Text style={styles.pricePrefix}>
                      {(USED_CURRENCY_META[currency] ?? USED_CURRENCY_META.krw).symbol}
                    </Text>
                    <TextInput
                      style={styles.priceInput}
                      value={price}
                      onChangeText={setPrice}
                      keyboardType={currency === "usd" ? "decimal-pad" : "number-pad"}
                      placeholder={u("가격을 입력해 주세요.", "Enter price.")}
                      placeholderTextColor={muted}
                    />
                  </View>
                </>
              ) : null}
            </View>

            <UsedSubcultureFormSection
              value={subculture}
              onChange={setSubculture}
              ink={ink}
              paper={paper}
              muted={muted}
                    line={line}
            />

            <View style={styles.block}>
              <Text style={styles.label}>{u("거래 설정", "Trade settings")}</Text>
              <View style={styles.placeRow}>
                <Text style={styles.placeTitle}>{u("거래 희망 장소", "Preferred meetup")}</Text>
                <Text style={styles.placeValue}>{locationLabel}</Text>
              </View>
              {countryCode.toUpperCase() === "KR" ? (
                <>
                  <View style={styles.checkWrap}>
                    {KOREA_SIDO.map((s) => (
                      <MarketCheckOption
                        key={s.id}
                        label={s.short}
                        checked={sidoId === s.id}
                        onPress={() => {
                          setSidoId(s.id);
                          const first = KOREA_SIGUNGU_BY_SIDO[s.id]?.[0] ?? "";
                          setSigungu(first);
                          setRegion(formatUsedRegion(s.short, first));
                          setMeetCoords(null);
                        }}
                        ink={ink}
                        paper={paper}
                        line={line}
                      />
                    ))}
                    <MarketCheckOption
                      label={u("전국 배송", "Nationwide shipping")}
                      checked={sidoId === "__shipping__"}
                      onPress={() => {
                        setSidoId("__shipping__");
                        setRegion(USED_SHIPPING_REGION);
                        setMeetCoords(null);
                      }}
                      ink={ink}
                      paper={paper}
                      line={line}
                    />
                  </View>
                  {sidoId !== "__shipping__" ? (
                    <View style={styles.checkWrap}>
                      {(KOREA_SIGUNGU_BY_SIDO[sidoId] ?? []).map((unit) => (
                        <MarketCheckOption
                          key={unit}
                          label={unit}
                          checked={sigungu === unit}
                          onPress={() => {
                            setSigungu(unit);
                            const short = KOREA_SIDO.find((s) => s.id === sidoId)?.short ?? "";
                            setRegion(formatUsedRegion(short, unit));
                            setMeetCoords(null);
                          }}
                          ink={ink}
                          paper={paper}
                          line={line}
                        />
                      ))}
                    </View>
                  ) : null}
                </>
              ) : (
                <>
                  <View style={styles.checkWrap}>
                    <MarketCheckOption
                      label={u("배송", "Shipping")}
                      checked={region === "Shipping"}
                      onPress={() => {
                        setRegion("Shipping");
                        setMeetCoords(null);
                      }}
                      ink={ink}
                      paper={paper}
                      line={line}
                    />
                    <MarketCheckOption
                      label={u("직거래 도시", "Local meetup city")}
                      checked={region !== "Shipping"}
                      onPress={() => {
                        setRegion("");
                        setMeetCoords(null);
                      }}
                      ink={ink}
                      paper={paper}
                      line={line}
                    />
                  </View>
                  {region !== "Shipping" ? (
                    <TextInput
                      style={styles.input}
                      value={regionText}
                      onChangeText={setRegionText}
                      placeholder="예: Tokyo, Los Angeles"
                      placeholderTextColor={muted}
                    />
                  ) : null}
                </>
              )}
              <MeetMap
                mode="pick"
                country={countryCode}
                region={region}
                district={countryCode.toUpperCase() === "KR" && sidoId !== "__shipping__" ? sigungu : undefined}
                coords={meetCoords}
                onCoordsChange={setMeetCoords}
                onGeocodeLabel={syncRegionFromMapLabel}
                height={220}
              />
              <TextInput
                ref={meetPlaceRef}
                style={[styles.input, { marginTop: 10 }]}
                value={meetPlace}
                onChangeText={setMeetPlace}
                placeholder={u("주소 상세 (예: 2번 출구 스타벅스 앞)", "Meetup details (e.g. in front of café by exit 2)")}
                placeholderTextColor={muted}
                onFocus={() => onInputFocus(meetPlaceRef.current)}
              />
            </View>

            <View style={styles.block}>
              <MarketCheckOption
                label={u("NSFW · 민감한 콘텐츠", "NSFW · sensitive content")}
                checked={isNsfw}
                onPress={() => setIsNsfw((v) => !v)}
                ink={ink}
                paper={paper}
                    line={line}
              />
            </View>
              </ScrollView>
            </View>
          <View style={styles.bottomBar}>
            <Pressable
              style={[styles.submit, busy ? { opacity: 0.45 } : null]}
              disabled={busy}
              onPress={() => void submit()}
            >
              <Text style={styles.submitText}>{busy ? u("등록 중…", "Posting…") : u("작성 완료", "Done")}</Text>
            </Pressable>
          </View>
          </View>
        </KeyboardAvoidingView>
      )}
    </Screen>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    topBar: { paddingHorizontal: 12, paddingVertical: 8 },
    body: { paddingHorizontal: 16, paddingBottom: 24, gap: 22 },
    photoRow: { flexDirection: "row", alignItems: "center", gap: 10 },
    photoTile: {
      width: 84,
      height: 84,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: "center",
      justifyContent: "center",
      overflow: "hidden",
      backgroundColor: colors.surfaceRaised,
    },
    photo: { width: "100%", height: "100%" },
    photoCount: {
      position: "absolute",
      bottom: 6,
      color: colors.textOnAccent,
      fontSize: 11,
      fontWeight: "700",
      backgroundColor: "rgba(0,0,0,0.45)",
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: 999,
      overflow: "hidden",
    },
    photoRemove: {
      position: "absolute",
      top: 4,
      right: 4,
      width: 22,
      height: 22,
      borderRadius: 11,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: "rgba(0,0,0,0.55)",
    },
    block: { gap: 8 },
    label: { fontWeight: "700", color: colors.brand, fontSize: 15 },
    priceSectionLabel: { marginTop: 6 },
    input: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 10,
      paddingHorizontal: 14,
      paddingVertical: 14,
      backgroundColor: colors.surfaceRaised,
      color: colors.text,
      fontSize: 15,
    },
    multi: { minHeight: 140, textAlignVertical: "top" },
    checkWrap: { flexDirection: "row", flexWrap: "wrap" },
    priceRow: {
      flexDirection: "row",
      alignItems: "center",
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 10,
      paddingHorizontal: 14,
      minHeight: 50,
      backgroundColor: colors.surfaceRaised,
    },
    pricePrefix: { color: colors.brand, fontWeight: "700", fontSize: 16, marginRight: 8 },
    priceInput: { flex: 1, color: colors.text, fontSize: 15, paddingVertical: 12 },
    hint: { color: colors.textMuted, fontSize: 12, lineHeight: 18, marginBottom: 6 },
    placeRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 10,
      paddingHorizontal: 14,
      paddingVertical: 14,
      backgroundColor: colors.surfaceRaised,
    },
    placeTitle: { color: colors.text, fontWeight: "600", fontSize: 14 },
    placeValue: { color: colors.textMuted, fontWeight: "600", fontSize: 13 },
    bottomBar: {
      paddingHorizontal: 16,
      paddingTop: 10,
      paddingBottom: 16,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: colors.hairline,
      backgroundColor: colors.background,
    },
    submit: {
      height: 50,
      borderRadius: 999,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.terracotta,
    },
    submitText: { color: colors.textOnAccent, fontWeight: "800", fontSize: 16 },
  });
}
