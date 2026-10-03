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
  DEFAULT_SIGUNGU,
  DEFAULT_SIDO_SHORT,
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
  const { t } = useI18n();
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
  const [sigungu, setSigungu] = useState<string>(KOREA_SIGUNGU_BY_SIDO.seoul?.[0] ?? DEFAULT_SIGUNGU);
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
          showIslandError(t("m.marketplace.can_t_edit"), t("m.marketplace.you_can_only_edit_your_own"));
          navigation.goBack();
          return;
        }
        if (item.status !== "SELLING") {
          showIslandError(t("m.marketplace.can_t_edit"), t("m.marketplace.this_listing_can_t_be_edited"));
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
        if (alive) showIslandError(t("m.common.error"), t("m.marketplace.could_not_load_listing_details"));
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
          const firstCity = KOREA_SIGUNGU_BY_SIDO[firstSido.id]?.[0] ?? DEFAULT_SIGUNGU;
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
        t("m.marketplace.photo_limit"),
        t("m.marketplace.you_can_add_up_to_max", { MAX_LISTING_IMAGES: String(MAX_LISTING_IMAGES) })
      );
      return;
    }
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      showIslandError(t("m.common.permission_needed"), t("m.marketplace.allow_access_to_your_photo_library"));
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
        t("m.marketplace.photo_limit"),
        t("m.marketplace.added_remaining_photos_only_max_max", { remaining: String(remaining), MAX_LISTING_IMAGES: String(MAX_LISTING_IMAGES) })
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
      showIslandError(t("m.common.product_type"), t("m.marketplace.choose_a_product_type"));
      return;
    }
    if (!title.trim()) {
      showIslandError(t("m.marketplace.title_required"), t("m.common.enter_a_title"));
      return;
    }
    const priceNum =
      giveaway || isTrade ? 0 : parseListingPriceInput(price, currency);
    if (priceNum < 0) {
      showIslandError(t("m.marketplace.price"), t("m.marketplace.enter_a_valid_price"));
      return;
    }
    if (!giveaway && !isTrade && priceNum <= 0) {
      showIslandError(t("m.marketplace.price"), t("m.marketplace.enter_a_price"));
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
        showIslandError(t("m.marketplace.photos_required"), t("m.marketplace.add_at_least_one_product_photo"));
        setBusy(false);
        return;
      }

      const submitRegion =
        countryCode.toUpperCase() === "KR"
          ? sidoId === "__shipping__"
            ? USED_SHIPPING_REGION
            : formatUsedRegion(
                KOREA_SIDO.find((s) => s.id === sidoId)?.short ?? DEFAULT_SIDO_SHORT,
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
        categories: [subculture.productType] as string[],
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
      };

      const listingId = editId
        ? (await updateMarketplaceListing(editId, payload)).listingId
        : (await createMarketplaceListing(payload)).listingId;
      await queryClient.invalidateQueries({ queryKey: ["mobile-marketplace"] });
      await queryClient.invalidateQueries({ queryKey: ["mobile-marketplace-mine"] });
      showIslandSuccess(
        editId ? t("m.marketplace.updated") : t("m.marketplace.posted"),
        editId ? t("m.marketplace.your_listing_was_updated") : t("m.marketplace.your_listing_is_live")
      );
      navigation.replace("MarketplaceDetail", { id: listingId });
    } catch (e) {
      const msg =
        e instanceof ApiError && e.body && typeof e.body === "object" && "error" in e.body
          ? String((e.body as { error: string }).error)
          : e instanceof Error
            ? e.message
            : t("m.marketplace.could_not_publish_listing");
      if (
        countryCode.toUpperCase() !== "KR" &&
        (/phone/i.test(msg) || /verif/i.test(msg))
      ) {
        showIslandPrompt(t("m.marketplace.verification_required"), msg, {
          label: t("m.marketplace.verify_phone"),
          onPress: () =>
            navigation.replace("UsedPhoneVerify", { next: "UsedCreate" }),
        });
      } else {
        showIslandError(t("m.common.error"), msg);
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
        ? t("m.marketplace.nationwide_shipping")
        : `${KOREA_SIDO.find((s) => s.id === sidoId)?.short ?? ""} ${sigungu}`.trim()
      : region === "Shipping"
        ? t("m.common.shipping")
        : regionText.trim() || t("m.marketplace.enter_city");

  return (
    <Screen safeBottom>
      <View style={styles.topBar}>
        <Pressable onPress={() => navigation.goBack()} hitSlop={10} accessibilityRole="button">
          <Ionicons name="chevron-back" size={26} color={ink} />
        </Pressable>
      </View>
      {checking ? (
        <Text style={{ padding: spacing.md, color: muted, fontWeight: "600" }}>{t("m.marketplace.checking")}</Text>
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
                  accessibilityLabel={t("m.common.add_photo")}
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
                    accessibilityLabel={t("m.marketplace.remove_photo")}
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
                    accessibilityLabel={t("m.marketplace.remove_photo")}
                  >
                    <Ionicons name="close" size={14} color="#fff" />
                  </Pressable>
                </View>
              ))}
            </ScrollView>

            <View style={styles.block}>
              <Text style={styles.label}>{t("m.common.title")}</Text>
              <TextInput
                style={styles.input}
                value={title}
                onChangeText={setTitle}
                placeholder={t("m.common.enter_a_title")}
                placeholderTextColor={muted}
              />
            </View>

            <View style={styles.block}>
              <Text style={styles.label}>{t("m.common.description")}</Text>
              <TextInput
                style={[styles.input, styles.multi]}
                value={description}
                onChangeText={setDescription}
                multiline
                placeholder={t("m.marketplace.describe_your_item_in_detail_for")}
                placeholderTextColor={muted}
              />
            </View>

            <View style={styles.block}>
              <Text style={styles.label}>{t("m.marketplace.listing_type")}</Text>
              <View style={styles.checkWrap}>
                <MarketCheckOption
                  label={t("m.marketplace.sell")}
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
                  label={t("m.marketplace.give_away")}
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
                  label={t("m.marketplace.trade")}
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
                  <Text style={[styles.label, styles.priceSectionLabel]}>{t("m.marketplace.price")}</Text>
                  <View style={styles.checkWrap}>
                    {listingCurrencyChoices(countryCode).map((c) => (
                      <MarketCheckOption
                        key={c.id}
                        label={usedCurrencyLabel(c.id, t)}
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
                      placeholder={t("m.marketplace.enter_price")}
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
              <Text style={styles.label}>{t("m.marketplace.trade_settings")}</Text>
              <View style={styles.placeRow}>
                <Text style={styles.placeTitle}>{t("m.marketplace.preferred_meetup")}</Text>
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
                      label={t("m.marketplace.nationwide_shipping")}
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
                      label={t("m.common.shipping")}
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
                      label={t("m.marketplace.local_meetup_city")}
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
                      placeholder={t("m.marketplace.e_g_tokyo_los_angeles")}
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
                placeholder={t("m.marketplace.meetup_details_e_g_in_front")}
                placeholderTextColor={muted}
                onFocus={() => onInputFocus(meetPlaceRef.current)}
              />
            </View>

            <View style={styles.block}>
              <MarketCheckOption
                label={t("m.marketplace.nsfw_sensitive_content")}
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
              <Text style={styles.submitText}>{busy ? t("m.marketplace.posting") : t("m.common.done")}</Text>
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
