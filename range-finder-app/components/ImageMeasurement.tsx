import React, { useState } from "react";
import {
  GestureResponderEvent,
  Image,
  Modal,
  Pressable,
  ScrollView,
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
  const [selectorOpen, setSelectorOpen] = useState(false);
  const [zoomScale, setZoomScale] = useState(2);

  const markerSize = 10;
  const markerRadius = markerSize / 2;
  const lineThickness = 2;

  const previewMaxWidth = 600;
  const previewMaxHeight = 420;

  let displayWidth = previewMaxWidth;
  let displayHeight = 320;

  if (imageWidth > 0 && imageHeight > 0) {
    const scale = Math.min(
      previewMaxWidth / imageWidth,
      previewMaxHeight / imageHeight
    );

    displayWidth = Math.max(1, Math.round(imageWidth * scale));
    displayHeight = Math.max(1, Math.round(imageHeight * scale));
  }

  const selectorWidth = Math.max(displayWidth * zoomScale, displayWidth);
  const selectorHeight =
    imageWidth > 0
      ? selectorWidth * (imageHeight / imageWidth)
      : displayHeight * zoomScale;

  const handleImagePress = (
    event: GestureResponderEvent,
    targetWidth: number,
    targetHeight: number
  ) => {
    if (!imageUri || imageWidth <= 0 || imageHeight <= 0) return;

    const { locationX, locationY } = event.nativeEvent;
    const scaleX = imageWidth / targetWidth;
    const scaleY = imageHeight / targetHeight;

    const rawX = Math.round(locationX * scaleX);
    const rawY = Math.round(locationY * scaleY);

    const x = Math.max(0, Math.min(imageWidth - 1, rawX));
    const y = Math.max(0, Math.min(imageHeight - 1, rawY));

    onAddPoint({ x, y });
  };

  const point1 = points[0];
  const point2 = points[1];

  function renderMeasurementCanvas(
    targetWidth: number,
    targetHeight: number,
    interactive: boolean
  ) {
    const scaledP1x = point1 ? (point1.x / imageWidth) * targetWidth : 0;
    const scaledP1y = point1 ? (point1.y / imageHeight) * targetHeight : 0;
    const scaledP2x = point2 ? (point2.x / imageWidth) * targetWidth : 0;
    const scaledP2y = point2 ? (point2.y / imageHeight) * targetHeight : 0;

    const scaledLineWidth =
      points.length === 2
        ? Math.hypot(scaledP2x - scaledP1x, scaledP2y - scaledP1y)
        : 0;

    const scaledLineAngle =
      points.length === 2
        ? Math.atan2(scaledP2y - scaledP1y, scaledP2x - scaledP1x)
        : 0;

    const scaledLineLeft =
      points.length === 2
        ? (scaledP1x + scaledP2x) / 2 - scaledLineWidth / 2
        : 0;

    const scaledLineTop =
      points.length === 2
        ? (scaledP1y + scaledP2y) / 2 - lineThickness / 2
        : 0;

    return (
      <View
        onStartShouldSetResponder={() => interactive}
        onResponderRelease={
          interactive
            ? (event) => handleImagePress(event, targetWidth, targetHeight)
            : undefined
        }
        style={{
          width: targetWidth,
          height: targetHeight,
          alignSelf: "center",
          overflow: "hidden",
          borderRadius: interactive ? 0 : 16,
          borderWidth: 1,
          borderColor: "#bfb29b",
          backgroundColor: "#fff",
        }}
      >
        <Image
          source={{ uri: imageUri! }}
          style={{ width: targetWidth, height: targetHeight }}
          resizeMode="contain"
        />

        {points.map((point, index) => {
          const left = (point.x / imageWidth) * targetWidth - markerRadius;
          const top = (point.y / imageHeight) * targetHeight - markerRadius;

          return (
            <View
              key={`${point.x}-${point.y}-${index}`}
              pointerEvents="none"
              style={{
                position: "absolute",
                left,
                top,
                width: markerSize,
                height: markerSize,
                borderRadius: markerRadius,
                borderWidth: 1.5,
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
              left: scaledLineLeft,
              top: scaledLineTop,
              width: scaledLineWidth,
              height: lineThickness,
              backgroundColor: "#c05621",
              transform: [{ rotate: `${scaledLineAngle}rad` }],
            }}
          />
        )}
      </View>
    );
  }

  return (
    <View
      style={{
        backgroundColor: "#fffaf2",
        borderRadius: 20,
        padding: 16,
        borderWidth: 1,
        borderColor: "#d8cfbf",
        overflow: "hidden",
      }}
    >
      {imageUri ? (
        <>
          <View
            style={{
              width: "100%",
              maxWidth: previewMaxWidth,
              alignSelf: "center",
              overflow: "hidden",
            }}
          >
            <Pressable
              onPress={() => setSelectorOpen(true)}
              style={{
                alignSelf: "center",
              }}
            >
              {renderMeasurementCanvas(displayWidth, displayHeight, false)}
            </Pressable>
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
            Tap the image to open precision selection. In the selector, zoom in,
            pan, and place the top and bottom points more accurately.
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
            <Text
              style={{
                textAlign: "center",
                fontWeight: "700",
                color: "#1f1a14",
              }}
            >
              Clear points
            </Text>
          </Pressable>

          <Modal
            visible={selectorOpen}
            animationType="slide"
            onRequestClose={() => setSelectorOpen(false)}
          >
            <View style={{ flex: 1, backgroundColor: "#16130f" }}>
              <View
                style={{
                  paddingHorizontal: 16,
                  paddingTop: 18,
                  paddingBottom: 14,
                  borderBottomWidth: 1,
                  borderBottomColor: "rgba(255, 255, 255, 0.12)",
                  backgroundColor: "rgba(22, 19, 15, 0.92)",
                  gap: 12,
                }}
              >
                <View
                  style={{
                    flexDirection: "row",
                    justifyContent: "space-between",
                    alignItems: "center",
                    gap: 12,
                  }}
                >
                  <View style={{ flex: 1 }}>
                    <Text
                      style={{
                        fontWeight: "800",
                        color: "#ffffff",
                        fontSize: 18,
                      }}
                    >
                      Precision Selection
                    </Text>
                    <Text
                      style={{
                        color: "rgba(255, 255, 255, 0.72)",
                        marginTop: 4,
                        lineHeight: 18,
                      }}
                    >
                      Zoom in, drag to the target, then tap the top and bottom
                      points.
                    </Text>
                  </View>
                  <Pressable
                    onPress={() => setSelectorOpen(false)}
                    style={{
                      backgroundColor: "rgba(255, 255, 255, 0.14)",
                      borderRadius: 14,
                      paddingHorizontal: 14,
                      paddingVertical: 10,
                    }}
                  >
                    <Text style={{ color: "#ffffff", fontWeight: "700" }}>
                      Done
                    </Text>
                  </Pressable>
                </View>

                <View style={{ flexDirection: "row", gap: 8 }}>
                  <Pressable
                    onPress={() =>
                      setZoomScale((current) => Math.max(1.5, current - 0.5))
                    }
                    style={{
                      flex: 1,
                      backgroundColor: "rgba(255, 255, 255, 0.14)",
                      borderRadius: 12,
                      paddingVertical: 10,
                    }}
                  >
                    <Text
                      style={{
                        textAlign: "center",
                        color: "#ffffff",
                        fontWeight: "700",
                      }}
                    >
                      Zoom out
                    </Text>
                  </Pressable>
                  <Pressable
                    onPress={() =>
                      setZoomScale((current) => Math.min(5, current + 0.5))
                    }
                    style={{
                      flex: 1,
                      backgroundColor: "#c56238",
                      borderRadius: 12,
                      paddingVertical: 10,
                    }}
                  >
                    <Text
                      style={{
                        textAlign: "center",
                        color: "white",
                        fontWeight: "700",
                      }}
                    >
                      Zoom in
                    </Text>
                  </Pressable>
                </View>
              </View>

              <View style={{ flex: 1 }}>
                <ScrollView
                  maximumZoomScale={5}
                  minimumZoomScale={1}
                  contentContainerStyle={{
                    flexGrow: 1,
                    justifyContent: "center",
                  }}
                >
                  <ScrollView
                    horizontal
                    contentContainerStyle={{
                      minWidth: "100%",
                      minHeight: "100%",
                      justifyContent: "center",
                      alignItems: "center",
                    }}
                  >
                    {renderMeasurementCanvas(
                      selectorWidth,
                      selectorHeight,
                      true
                    )}
                  </ScrollView>
                </ScrollView>
              </View>
            </View>
          </Modal>
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