import { useMemo, useRef } from "react";
import { PanResponder, Text, View } from "react-native";
import type { VideoTextOverlay } from "@/features/compose/compose-types";
import {
  clamp,
  computeContainRect,
  getTextOverlayTextStyle,
  snapOverlayPosition,
  textOverlayFontSize,
} from "@/features/compose/text-overlay-utils";

type Props = {
  overlay: VideoTextOverlay;
  selected: boolean;
  containerW: number;
  containerH: number;
  imageW: number;
  imageH: number;
  onSelect: () => void;
  onMove: (x: number, y: number) => void;
};

export function TextOverlayDraggable({
  overlay,
  selected,
  containerW,
  containerH,
  imageW,
  imageH,
  onSelect,
  onMove,
}: Props) {
  const imageRect = useMemo(
    () => computeContainRect(containerW, containerH, imageW, imageH),
    [containerW, containerH, imageW, imageH]
  );

  const overlayRef = useRef(overlay);
  const imageRectRef = useRef(imageRect);
  const onMoveRef = useRef(onMove);
  const onSelectRef = useRef(onSelect);
  overlayRef.current = overlay;
  imageRectRef.current = imageRect;
  onMoveRef.current = onMove;
  onSelectRef.current = onSelect;

  const dragStart = useRef({ x: overlay.x, y: overlay.y });

  const pan = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderTerminationRequest: () => false,
        onPanResponderGrant: () => {
          onSelectRef.current();
          dragStart.current = { x: overlayRef.current.x, y: overlayRef.current.y };
        },
        onPanResponderMove: (_, g) => {
          const rect = imageRectRef.current;
          if (rect.w <= 0 || rect.h <= 0) return;
          const rawX = dragStart.current.x + g.dx / rect.w;
          const rawY = dragStart.current.y + g.dy / rect.h;
          const snapped = snapOverlayPosition(rawX, rawY);
          onMoveRef.current(clamp(snapped.x, 0, 0.94), clamp(snapped.y, 0, 0.94));
        },
      }),
    []
  );

  const fontSize = textOverlayFontSize(imageRect.h, overlay.scale);
  const anchorX = imageRect.x + overlay.x * imageRect.w;
  const anchorY = imageRect.y + overlay.y * imageRect.h;

  return (
    <View
      {...pan.panHandlers}
      style={{
        position: "absolute",
        left: anchorX,
        top: anchorY,
        transform: [{ translateX: "-50%" }, { translateY: "-50%" }],
        padding: 6,
        borderWidth: selected ? 1.5 : 0,
        borderColor: "rgba(255,255,255,0.9)",
        borderRadius: 6,
        maxWidth: imageRect.w * 0.92,
      }}
    >
      <Text style={getTextOverlayTextStyle(overlay.color, fontSize)}>{overlay.text}</Text>
    </View>
  );
}
