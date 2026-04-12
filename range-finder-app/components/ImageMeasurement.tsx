import React, { useMemo, useState } from "react";
import {
  GestureResponderEvent,
  Image,
  Pressable,
  Text,
  View,
} from "react-native";
import { Point } from "../types";

type Props = {
  imageUri: string | null;
  imageWidth: number;
  imageHeight: number;
  points: Point[];
  onAddPoint: (point: Point) => void;
  onClearPoints: () => void;
};

export function ImageMeasurement({
  imageUri,
  imageWidth,
  imageHeight,
  points,
  onAddPoint,
  onClearPoints,
}: Props) {
  const [containerWidth, setContainerWidth] = useState(320);

  const displayWidth = Math.max(1, containerWidth);
  const displayHeight =
    imageWidth > 0 ? displayWidth * (imageHeight / imageWidth) : 320;

  const lineLengthPixels = useMemo(() => {
    if (points.length !== 2) return null;
    const dx = points[1].x - points[0].x;
    const dy = points[1].y - points[0].y;
    return Math.round(Math.hypot(dx, dy) * 100) / 100;
  }, [points]);

  const handleImagePress = (event: GestureResponderEvent) => {
    if (!imageUri || imageWidth <= 0 || imageHeight <= 0) return;

    const { locationX, locationY } = event.nativeEvent;
    const scaleX = imageWidth / displayWidth;
    const scaleY = imageHeight / displayHeight;

    const rawX = Math.round(locationX * scaleX);
    const rawY = Math.round(locationY * scaleY);

    const x = Math.max(0, Math.min(imageWidth - 1, rawX));
    const y = Math.max(0, Math.min(imageHeight - 1, rawY));

    onAddPoint({ x, y });
  };

  const point1 = points[0];
  const point2 = points[1];

  const p1x = point1 ? (point1.x / imageWidth) * displayWidth : 0;
  const p1y = point1 ? (point1.y / imageHeight) * displayHeight : 0;
  const p2x = point2 ? (point2.x / imageWidth) * displayWidth : 0;
  const p2y = point2 ? (point2.y / imageHeight) * displayHeight : 0;

  const lineWidth =
    points.length === 2 ? Math.hypot(p2x - p1x, p2y - p1y) : 0;
  const lineThickness = 2;

  const lineAngle =
    points.length === 2 ? Math.atan2(p2y - p1y, p2x - p1x) : 0;

  const lineLeft = points.length === 2 ? (p1x + p2x) / 2 - lineWidth / 2 : 0;
  const lineTop =
    points.length === 2 ? (p1y + p2y) / 2 - lineThickness / 2 : 0;

  return (
    <View
      style={{
        backgroundColor: "white",
        borderRadius: 16,
        padding: 16,
        borderWidth: 1,
        borderColor: "#e5e5e5",
      }}
    >
      <Text style={{ fontWeight: "600", marginBottom: 12 }}>Measurement</Text>

      {imageUri ? (
        <>
          <View
            onLayout={(event) => {
              const nextWidth = Math.floor(event.nativeEvent.layout.width);
              if (nextWidth > 0 && nextWidth !== containerWidth) {
                setContainerWidth(nextWidth);
              }
            }}
            style={{
              width: "100%",
              alignSelf: "center",
            }}
          >
            <View
              onStartShouldSetResponder={() => true}
              onResponderRelease={handleImagePress}
              style={{
                width: displayWidth,
                height: displayHeight,
                alignSelf: "center",
                overflow: "hidden",
                borderRadius: 12,
                borderWidth: 1,
                borderColor: "#ccc",
                backgroundColor: "#fff",
              }}
            >
              <Image
                source={{ uri: imageUri }}
                style={{ width: displayWidth, height: displayHeight }}
                resizeMode="contain"
              />

              {points.map((point, index) => {
                const left = (point.x / imageWidth) * displayWidth - 8;
                const top = (point.y / imageHeight) * displayHeight - 8;

                return (
                  <View
                    key={`${point.x}-${point.y}-${index}`}
                    pointerEvents="none"
                    style={{
                      position: "absolute",
                      left,
                      top,
                      width: 16,
                      height: 16,
                      borderRadius: 8,
                      borderWidth: 2,
                      borderColor: "white",
                      backgroundColor: index === 0 ? "green" : "red",
                    }}
                  />
                );
              })}

              {points.length === 2 && (
                <View
                  pointerEvents="none"
                  style={{
                    position: "absolute",
                    left: lineLeft,
                    top: lineTop,
                    width: lineWidth,
                    height: lineThickness,
                    backgroundColor: "red",
                    transform: [{ rotate: `${lineAngle}rad` }],
                  }}
                />
              )}
            </View>
          </View>

          <Text
            style={{
              textAlign: "center",
              color: "#666",
              fontSize: 12,
              marginTop: 8,
            }}
          >
            Tap once for the top point, then once for the bottom point.
          </Text>

          <View style={{ marginTop: 12 }}>
            <Text style={{ fontSize: 14 }}>
              Top point: {point1 ? `${point1.x}, ${point1.y}` : "not set"}
            </Text>
            <Text style={{ fontSize: 14 }}>
              Bottom point: {point2 ? `${point2.x}, ${point2.y}` : "not set"}
            </Text>
            <Text style={{ fontSize: 14 }}>
              Line length: {lineLengthPixels ?? "not set"}
            </Text>
          </View>

          <Pressable
            onPress={onClearPoints}
            style={{
              marginTop: 12,
              backgroundColor: "#e5e5e5",
              paddingVertical: 12,
              borderRadius: 12,
            }}
          >
            <Text style={{ textAlign: "center", fontWeight: "600" }}>
              Clear points
            </Text>
          </Pressable>
        </>
      ) : (
        <Text style={{ color: "#666" }}>Choose an image first.</Text>
      )}
    </View>
  );
}
