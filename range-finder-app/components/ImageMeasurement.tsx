import React, { useState } from "react";
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
        backgroundColor: "#fffaf2",
        borderRadius: 20,
        padding: 16,
        borderWidth: 1,
        borderColor: "#d8cfbf",
      }}
    >
      <Text style={{ fontWeight: "700", marginBottom: 4, color: "#1f1a14", fontSize: 17 }}>
        Measurement
      </Text>
      <Text style={{ color: "#6f665b", fontSize: 13, marginBottom: 12, lineHeight: 18 }}>
        Keep the current two-tap flow, but make it easier to read: first tap the top of the object, then tap the bottom.
      </Text>

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
                borderRadius: 16,
                borderWidth: 1,
                borderColor: "#bfb29b",
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
                      backgroundColor: index === 0 ? "#2f855a" : "#c05621",
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
                    backgroundColor: "#c05621",
                    transform: [{ rotate: `${lineAngle}rad` }],
                  }}
                />
              )}
            </View>
          </View>

          <Text
            style={{
              textAlign: "center",
              color: "#6f665b",
              fontSize: 12,
              marginTop: 10,
              lineHeight: 18,
            }}
          >
            Tap once for the top point, then once for the bottom point. A fresh tap after two points starts a new measurement.
          </Text>

          <Pressable
            onPress={onClearPoints}
            style={{
              marginTop: 12,
              backgroundColor: "#efe7da",
              paddingVertical: 12,
              borderRadius: 14,
            }}
          >
            <Text style={{ textAlign: "center", fontWeight: "700", color: "#1f1a14" }}>
              Clear points
            </Text>
          </Pressable>
        </>
      ) : (
        <View
          style={{
            borderRadius: 16,
            borderWidth: 1,
            borderStyle: "dashed",
            borderColor: "#d8cfbf",
            padding: 16,
            backgroundColor: "#ffffff",
          }}
        >
          <Text style={{ color: "#6f665b" }}>Choose an image first.</Text>
        </View>
      )}
    </View>
  );
}
