import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
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
import { cachedImageSource, IMAGE_CACHE_POLICY, feedMediaDecodeWidth } from "@/perf/image";
import { useVideoPlayer, VideoView } from "expo-video";

export type FeedLightboxImage = {
  id: string;
  url: string;
  kind?: "image" | "video";
};

function LightboxVideoSlide({
  url,
  width,
  height,
  active,
}: {
  url: string;
  width: number;
  height: number;
  active: boolean;
}) {
  const player = useVideoPlayer(active ? url : null, (p) => {
    p.loop = false;
  });

  useEffect(() => {
    if (!active) {
      player.pause();
      return;
    }
    player.play();
  }, [active, player]);

  return (
    <VideoView
      player={player}
      style={{ width, height: height * 0.78 }}
      contentFit="contain"
      nativeControls
    />
  );
}

type Props = {
  visible: boolean;
  images: FeedLightboxImage[];
  initialIndex?: number;
  onClose: () => void;
};

/**
 * Web PostMediaLightbox parity — fullscreen black viewer, swipe between photos.
 */
export function FeedImageLightbox({
  visible,
  images,
  initialIndex = 0,
  onClose,
}: Props) {
  const insets = useSafeAreaInsets();
  const { width, height } = Dimensions.get("window");
  const [index, setIndex] = useState(initialIndex);
  const listRef = useRef<FlatList<FeedLightboxImage>>(null);
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

  const renderItem: ListRenderItem<FeedLightboxImage> = useCallback(
    ({ item, index: slideIndex }) => {
      const slideHeight = height * 0.78;
      let body: ReactNode;
      if (item.kind === "video") {
        body = (
          <LightboxVideoSlide
            url={item.url}
            width={width}
            height={height}
            active={visible && slideIndex === index}
          />
        );
      } else {
        body = (
          <Image
            source={cachedImageSource(item.url, decode)}
            style={{ width, height: slideHeight }}
            contentFit="contain"
            cachePolicy={IMAGE_CACHE_POLICY}
            recyclingKey={item.url}
            transition={0}
          />
        );
      }
      return (
        <View style={{ width, height, alignItems: "center", justifyContent: "center" }}>{body}</View>
      );
    },
    [decode, height, index, visible, width]
  );

  const keyExtractor = useCallback((item: FeedLightboxImage) => item.id, []);

  const getItemLayout = useCallback(
    (_: ArrayLike<FeedLightboxImage> | null | undefined, i: number) => ({
      length: width,
      offset: width * i,
      index: i,
    }),
    [width]
  );

  if (!images.length) return null;

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent={false}
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View style={styles.root}>
        <Pressable
          style={[styles.close, { top: insets.top + 8 }]}
          onPress={onClose}
          hitSlop={12}
          accessibilityLabel="닫기"
        >
          <Ionicons name="close" size={22} color="#fff" />
        </Pressable>

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

        <Text style={[styles.counter, { bottom: insets.bottom + 16 }]}>
          {index + 1} / {images.length}
        </Text>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#000",
  },
  close: {
    position: "absolute",
    left: 12,
    zIndex: 20,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(0,0,0,0.5)",
    alignItems: "center",
    justifyContent: "center",
  },
  counter: {
    position: "absolute",
    alignSelf: "center",
    textAlign: "center",
    color: "rgba(255,255,255,0.9)",
    fontSize: 13,
    fontWeight: "700",
    backgroundColor: "rgba(0,0,0,0.55)",
    overflow: "hidden",
    borderRadius: 999,
    paddingVertical: 6,
    paddingHorizontal: 14,
  },
});
