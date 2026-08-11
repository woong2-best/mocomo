import { useCallback, useEffect, useRef, useState } from "react";
import {
  Dimensions,
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
  type ListRenderItem,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from "react-native";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { formatLightboxTime } from "@/features/messages/chat-display";
import { FolkAvatar } from "@/ui/FolkAvatar";
import { IMAGE_CACHE_POLICY, feedMediaDecodeWidth } from "@/perf/image";

export type DmLightboxImage = {
  id: string;
  url: string;
};

export type DmLightboxMeta = {
  senderName: string;
  senderImage: string | null;
  createdAt: string;
  /** When viewing your own photo, Instagram shows "나" */
  selfLabel?: string;
};

type Props = {
  visible: boolean;
  images: DmLightboxImage[];
  initialIndex?: number;
  meta: DmLightboxMeta | null;
  onClose: () => void;
};

/**
 * Instagram DM photo viewer — black fullscreen, header with avatar + relative time.
 */
export function DmImageLightbox({
  visible,
  images,
  initialIndex = 0,
  meta,
  onClose,
}: Props) {
  const insets = useSafeAreaInsets();
  const { width, height } = Dimensions.get("window");
  const [index, setIndex] = useState(initialIndex);
  const listRef = useRef<FlatList<DmLightboxImage>>(null);
  const decode = feedMediaDecodeWidth(width);

  useEffect(() => {
    if (!visible) return;
    const next = Math.min(Math.max(0, initialIndex), Math.max(0, images.length - 1));
    setIndex(next);
    requestAnimationFrame(() => {
      listRef.current?.scrollToIndex({ index: next, animated: false });
    });
  }, [visible, initialIndex, images.length]);

  const onMomentumEnd = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      const x = e.nativeEvent.contentOffset.x;
      const next = Math.round(x / width);
      if (next >= 0 && next < images.length) setIndex(next);
    },
    [images.length, width]
  );

  const renderItem: ListRenderItem<DmLightboxImage> = useCallback(
    ({ item }) => (
      <View style={{ width, height, alignItems: "center", justifyContent: "center" }}>
        <Image
          source={{ uri: item.url, width: decode, height: decode }}
          style={{ width: width * 0.92, height: height * 0.72, borderRadius: 4 }}
          contentFit="contain"
          cachePolicy={IMAGE_CACHE_POLICY}
          recyclingKey={item.url}
          transition={0}
        />
      </View>
    ),
    [decode, height, width]
  );

  const keyExtractor = useCallback((item: DmLightboxImage) => item.id, []);

  const getItemLayout = useCallback(
    (_: ArrayLike<DmLightboxImage> | null | undefined, i: number) => ({
      length: width,
      offset: width * i,
      index: i,
    }),
    [width]
  );

  if (!images.length) return null;

  const headerName = meta?.selfLabel ?? meta?.senderName ?? "";
  const headerTime = meta ? formatLightboxTime(meta.createdAt) : "";

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent={false}
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View style={styles.root}>
        <View style={[styles.header, { paddingTop: insets.top + 6 }]}>
          <Pressable
            onPress={onClose}
            hitSlop={12}
            style={styles.close}
            accessibilityLabel="닫기"
          >
            <Ionicons name="close" size={26} color="#fff" />
          </Pressable>

          {meta ? (
            <View style={styles.identity}>
              <FolkAvatar uri={meta.senderImage} name={headerName} size={32} />
              <View style={styles.identityText}>
                <Text style={styles.name} numberOfLines={1}>
                  {headerName}
                </Text>
                <Text style={styles.time} numberOfLines={1}>
                  {headerTime}
                </Text>
              </View>
            </View>
          ) : (
            <View style={styles.identity} />
          )}
        </View>

        <FlatList
          ref={listRef}
          data={images}
          keyExtractor={keyExtractor}
          renderItem={renderItem}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={onMomentumEnd}
          getItemLayout={getItemLayout}
          initialScrollIndex={Math.min(initialIndex, images.length - 1)}
          onScrollToIndexFailed={({ index: failed }) => {
            requestAnimationFrame(() => {
              listRef.current?.scrollToIndex({ index: failed, animated: false });
            });
          }}
        />

        {images.length > 1 ? (
          <Text style={[styles.counter, { bottom: insets.bottom + 16 }]}>
            {index + 1} / {images.length}
          </Text>
        ) : null}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#000" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingBottom: 10,
    gap: 8,
    zIndex: 20,
  },
  close: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  identity: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    minWidth: 0,
  },
  identityText: { flex: 1, minWidth: 0 },
  name: { color: "#fff", fontSize: 15, fontWeight: "800" },
  time: { color: "rgba(255,255,255,0.65)", fontSize: 12, marginTop: 2, fontWeight: "600" },
  counter: {
    position: "absolute",
    alignSelf: "center",
    textAlign: "center",
    color: "rgba(255,255,255,0.9)",
    fontSize: 13,
    fontWeight: "700",
    backgroundColor: "rgba(0,0,0,0.55)",
    borderRadius: 999,
    paddingVertical: 6,
    paddingHorizontal: 14,
  },
});
