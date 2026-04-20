import React, { startTransition, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Image,
  LayoutChangeEvent,
  Platform,
  Pressable,
  SafeAreaView,
  Text,
  View,
} from "react-native";
import {
  Camera,
  useCameraDevice,
  useCameraPermission,
} from "react-native-vision-camera";

import { estimateGolfDistance } from "../services/api";
import {
  LiveGolfPreset,
  prepareLiveGolfSnapshot,
  projectGolfDetectionLine,
  resolveLiveGolfPresets,
} from "../services/liveGolf";
import { CalibrationProfile, GolfEstimateResponse } from "../types";
import { AppPalette } from "../theme";

type DetectionState = {
  result: GolfEstimateResponse;
  imageWidth: number;
  imageHeight: number;
  focalLengthPixels: number;
  presetLabel: string;
  capturedAt: number;
};

type Props = {
  apiBaseUrl: string;
  palette: AppPalette;
  profiles: CalibrationProfile[];
  onOpenMenu: () => void;
};

export function LiveGolfCamera({
  apiBaseUrl,
  palette,
  profiles,
  onOpenMenu,
}: Props) {
  function clampZoomValue(value: number, minZoom = 1, maxZoom = 1) {
    return Math.min(Math.max(value, minZoom), maxZoom);
  }

  function toCameraZoomValue(userZoomFactor: number, neutralZoom = 1, minZoom = 1, maxZoom = 1) {
    const requestedCameraZoom = neutralZoom * userZoomFactor;
    return clampZoomValue(requestedCameraZoom, minZoom, maxZoom);
  }

  function fromCameraZoomValue(cameraZoom: number, neutralZoom = 1) {
    if (!neutralZoom) {
      return cameraZoom;
    }

    return cameraZoom / neutralZoom;
  }

  const { hasPermission, requestPermission } = useCameraPermission();
  const [cameraReady, setCameraReady] = useState(false);
  const [selectedPresetId, setSelectedPresetId] = useState<string>("");
  const [currentZoomFactor, setCurrentZoomFactor] = useState(1);
  const [previewSize, setPreviewSize] = useState({ width: 0, height: 0 });
  const [statusMessage, setStatusMessage] = useState(
    "Frame the pin with a saved zoom calibration, then capture a snapshot to measure it."
  );
  const [mountError, setMountError] = useState<string | null>(null);
  const [detecting, setDetecting] = useState(false);
  const [detection, setDetection] = useState<DetectionState | null>(null);
  const [snapshotUri, setSnapshotUri] = useState<string | null>(null);

  const cameraRef = useRef<Camera | null>(null);
  const captureInFlightRef = useRef(false);

  const backDevice = useCameraDevice("back");
  const presets = useMemo(() => resolveLiveGolfPresets(profiles), [profiles]);
  const selectedPreset = useMemo(
    () => presets.find((preset) => preset.id === selectedPresetId) ?? presets[0] ?? null,
    [presets, selectedPresetId]
  );
  const cameraConfig = useMemo(() => {
    if (!selectedPreset || !backDevice) {
      return null;
    }

    const minZoom = backDevice.minZoom ?? 1;
    const maxZoom = backDevice.maxZoom ?? Math.max(1, selectedPreset.zoomFactor);
    const neutralZoom = backDevice.neutralZoom ?? 1;
    const zoom = toCameraZoomValue(currentZoomFactor, neutralZoom, minZoom, maxZoom);

    return {
      device: backDevice,
      minZoom,
      maxZoom,
      neutralZoom,
      zoom,
      userZoomFactor: fromCameraZoomValue(zoom, neutralZoom),
      zoomStep: 0.1,
    };
  }, [backDevice, currentZoomFactor, selectedPreset]);

  useEffect(() => {
    if (!selectedPreset && presets.length > 0) {
      setSelectedPresetId(presets[0].id);
    }
  }, [presets, selectedPreset]);

  useEffect(() => {
    if (!selectedPreset || !backDevice) {
      return;
    }

    setCurrentZoomFactor(Math.max(0.1, selectedPreset.zoomFactor));
  }, [backDevice, selectedPreset]);

  const projectedLine = useMemo(() => {
    if (!detection || !previewSize.width || !previewSize.height) return null;

    return projectGolfDetectionLine({
      detection: detection.result,
      imageWidth: detection.imageWidth,
      imageHeight: detection.imageHeight,
      previewWidth: previewSize.width,
      previewHeight: previewSize.height,
    });
  }, [detection, previewSize.height, previewSize.width]);

  function handlePreviewLayout(event: LayoutChangeEvent) {
    const { width, height } = event.nativeEvent.layout;
    setPreviewSize({ width, height });
  }

  async function getRenderedImageSize(uri: string, fallbackWidth: number, fallbackHeight: number) {
    return await new Promise<{ width: number; height: number }>((resolve) => {
      Image.getSize(
        uri,
        (width, height) => resolve({ width, height }),
        () => resolve({ width: fallbackWidth, height: fallbackHeight })
      );
    });
  }

  async function handleSnapshot() {
    if (!cameraReady || !hasPermission || !cameraRef.current || !cameraConfig || !selectedPreset) {
      return;
    }

    if (captureInFlightRef.current) {
      return;
    }

    captureInFlightRef.current = true;
    setDetecting(true);
    setStatusMessage("Analyzing snapshot...");
    const snapshotStart = Date.now();

    try {
      const captureStart = Date.now();
      const photo = await cameraRef.current.takePhoto({
        enableShutterSound: false,
      });
      const rawUri = photo.path.startsWith("file://") ? photo.path : `file://${photo.path}`;
      const preparedFrame = await prepareLiveGolfSnapshot({
        uri: rawUri,
        width: photo.width,
        height: photo.height,
      });
      const renderedFrameSize = await getRenderedImageSize(
        preparedFrame.uri,
        preparedFrame.width,
        preparedFrame.height
      );
      const captureMs = Date.now() - captureStart;

      const apiStart = Date.now();
      const result = await estimateGolfDistance({
        apiBaseUrl,
        imageUri: preparedFrame.uri,
        focalLengthPixels: String(selectedPreset.focalLengthPixels),
        // The captured image already reflects the selected native camera zoom.
        // Sending that zoom factor again would make the backend crop a second time
        // and shift the returned detection line off the displayed snapshot.
        zoomFactor: "1",
      });
      const apiMs = Date.now() - apiStart;
      const totalMs = Date.now() - snapshotStart;

      setSnapshotUri(preparedFrame.uri);

      startTransition(() => {
        setDetection({
          result,
          imageWidth: renderedFrameSize.width,
          imageHeight: renderedFrameSize.height,
          focalLengthPixels: selectedPreset.focalLengthPixels,
          presetLabel: selectedPreset.label,
          capturedAt: Date.now(),
        });
      });

      setStatusMessage("Snapshot measured.");
      setMountError(null);
      console.log("[LiveGolfCamera] Snapshot timing", {
        capture_ms: captureMs,
        api_ms: apiMs,
        total_ms: totalMs,
        image_width: preparedFrame.width,
        image_height: preparedFrame.height,
        rendered_image_width: renderedFrameSize.width,
        rendered_image_height: renderedFrameSize.height,
        preset_id: selectedPreset.id,
        selected_zoom: cameraConfig.userZoomFactor,
        camera_zoom_value: cameraConfig.zoom,
        requested_zoom: selectedPreset.zoomFactor,
        camera_device_id: cameraConfig.device.id,
        camera_mode: "back-camera",
        focal_length_pixels: selectedPreset.focalLengthPixels,
      });
    } catch (error: any) {
      setSnapshotUri(null);
      setDetection(null);
      setStatusMessage(
        error?.message || "Could not detect the flagpole in this snapshot."
      );
      console.log("[LiveGolfCamera] Snapshot timing failed", {
        total_ms: Date.now() - snapshotStart,
        preset_id: selectedPreset?.id ?? "none",
        selected_zoom: cameraConfig?.userZoomFactor ?? 1,
        camera_zoom_value: cameraConfig?.zoom ?? 1,
        requested_zoom: selectedPreset?.zoomFactor ?? 1,
        camera_device_id: cameraConfig?.device.id ?? "none",
        camera_mode: "back-camera",
        focal_length_pixels: selectedPreset?.focalLengthPixels ?? 0,
        error_message: error?.message || "Unknown error",
      });
    } finally {
      captureInFlightRef.current = false;
      setDetecting(false);
    }
  }

  function handleRetake() {
    setSnapshotUri(null);
    setDetection(null);
    setStatusMessage("Frame the pin with a saved zoom calibration, then capture a snapshot to measure it.");
    setMountError(null);
  }

  if (Platform.OS === "web") {
    return (
      <SafeAreaView
        style={{
          flex: 1,
          backgroundColor: palette.bg,
          padding: 22,
          justifyContent: "center",
        }}
      >
        <View
          style={{
            backgroundColor: palette.surfaceStrong,
            borderRadius: 28,
            padding: 22,
            borderWidth: 1,
            borderColor: palette.border,
            gap: 14,
          }}
        >
          <Text style={{ color: palette.accentDark, fontWeight: "800", fontSize: 12 }}>
            Live Golf
          </Text>
          <Text style={{ color: palette.text, fontWeight: "800", fontSize: 30 }}>
            Native Mobile Only
          </Text>
          <Text style={{ color: palette.muted, lineHeight: 22 }}>
            Accurate Golf mode depends on saved native zoom calibrations. Open this in the iOS or Android app.
          </Text>
          <Pressable
            onPress={onOpenMenu}
            style={{
              backgroundColor: palette.accent,
              borderRadius: 16,
              paddingVertical: 14,
            }}
          >
            <Text style={{ color: "#ffffff", textAlign: "center", fontWeight: "800" }}>
              Open menu
            </Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  if (!hasPermission) {
    return (
      <SafeAreaView
        style={{
          flex: 1,
          backgroundColor: palette.bg,
          padding: 22,
          justifyContent: "center",
        }}
      >
        <View
          style={{
            backgroundColor: palette.surfaceStrong,
            borderRadius: 28,
            padding: 22,
            borderWidth: 1,
            borderColor: palette.border,
            gap: 14,
          }}
        >
          <Text style={{ color: palette.accentDark, fontWeight: "800", fontSize: 12 }}>
            Live Golf
          </Text>
          <Text style={{ color: palette.text, fontWeight: "800", fontSize: 30 }}>
            Camera Access Needed
          </Text>
          <Text style={{ color: palette.muted, lineHeight: 22 }}>
            Camera access is needed so you can capture a flag snapshot and measure it with a saved zoom calibration.
          </Text>
          <Pressable
            onPress={() => {
              void requestPermission();
            }}
            style={{
              backgroundColor: palette.accent,
              borderRadius: 16,
              paddingVertical: 14,
            }}
          >
            <Text style={{ color: "#ffffff", textAlign: "center", fontWeight: "800" }}>
              Allow camera access
            </Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  if (!cameraConfig || !selectedPreset) {
    return (
      <SafeAreaView
        style={{
          flex: 1,
          backgroundColor: palette.bg,
          padding: 22,
          justifyContent: "center",
        }}
      >
        <View
          style={{
            backgroundColor: palette.surfaceStrong,
            borderRadius: 28,
            padding: 22,
            borderWidth: 1,
            borderColor: palette.border,
            gap: 14,
          }}
        >
          <Text style={{ color: palette.accentDark, fontWeight: "800", fontSize: 12 }}>
            Live Golf
          </Text>
          <Text style={{ color: palette.text, fontWeight: "800", fontSize: 30 }}>
            Camera Or Presets Loading
          </Text>
          <Text style={{ color: palette.muted, lineHeight: 22 }}>
            The native camera is still loading, or there are no saved zoom calibrations yet.
          </Text>
          <ActivityIndicator color={palette.accent} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: "#09110c" }}>
      <View style={{ flex: 1 }} onLayout={handlePreviewLayout}>
        {snapshotUri ? (
          <Image source={{ uri: snapshotUri }} style={{ flex: 1 }} resizeMode="cover" />
        ) : (
          <Camera
            key={cameraConfig.device.id}
            ref={cameraRef}
            style={{ flex: 1 }}
            device={cameraConfig.device}
            isActive
            photo
            zoom={cameraConfig.zoom}
            onInitialized={() => setCameraReady(true)}
            onError={(error) => {
              setMountError(error.message);
              setStatusMessage(error.message);
            }}
          />
        )}

        <SafeAreaView
          pointerEvents="box-none"
          style={{
            position: "absolute",
            top: 0,
            right: 0,
            bottom: 0,
            left: 0,
            padding: 16,
            justifyContent: "space-between",
          }}
        >
          <View style={{ gap: 12 }}>
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "center",
                gap: 16,
              }}
            >
              <Pressable
                onPress={onOpenMenu}
                style={{
                  backgroundColor: "rgba(255,255,255,0.12)",
                  borderRadius: 18,
                  paddingHorizontal: 14,
                  paddingVertical: 12,
                  minWidth: 88,
                  marginLeft: "auto",
                  borderWidth: 1,
                  borderColor: "rgba(255,255,255,0.12)",
                }}
              >
                <Text
                  style={{
                    color: "#ffffff",
                    fontWeight: "800",
                    textAlign: "center",
                    fontSize: 12,
                  }}
                >
                  MENU
                </Text>
                <Text
                  style={{
                    color: "rgba(255,255,255,0.78)",
                    fontWeight: "700",
                    textAlign: "center",
                    fontSize: 11,
                    marginTop: 3,
                  }}
                >
                  Live Golf
                </Text>
              </Pressable>
            </View>

            <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap" }}>
              <View
                style={{
                  backgroundColor: "rgba(8, 15, 11, 0.72)",
                  borderRadius: 999,
                  paddingHorizontal: 12,
                  paddingVertical: 8,
                }}
              >
                <Text style={{ color: "#ffffff", fontWeight: "700", fontSize: 12 }}>
                  Preset {selectedPreset.label}
                </Text>
              </View>
              <View
                style={{
                  backgroundColor: "rgba(8, 15, 11, 0.72)",
                  borderRadius: 999,
                  paddingHorizontal: 12,
                  paddingVertical: 8,
                }}
              >
                <Text style={{ color: "#ffffff", fontWeight: "700", fontSize: 12 }}>
                  Camera zoom {cameraConfig.userZoomFactor.toFixed(2)}x
                </Text>
              </View>
              <View
                style={{
                  backgroundColor: "rgba(8, 15, 11, 0.72)",
                  borderRadius: 999,
                  paddingHorizontal: 12,
                  paddingVertical: 8,
                }}
              >
                <Text style={{ color: "#ffffff", fontWeight: "700", fontSize: 12 }}>
                  Back camera
                </Text>
              </View>
              <View
                style={{
                  backgroundColor: "rgba(8, 15, 11, 0.72)",
                  borderRadius: 999,
                  paddingHorizontal: 12,
                  paddingVertical: 8,
                }}
              >
                <Text style={{ color: "#ffffff", fontWeight: "700", fontSize: 12 }}>
                  {Math.round(selectedPreset.focalLengthPixels)} px
                </Text>
              </View>
            </View>
          </View>

          {projectedLine ? (
            <View pointerEvents="none" style={{ position: "absolute", inset: 0 }}>
              <View
                style={{
                  position: "absolute",
                  left: projectedLine.midX - projectedLine.length / 2,
                  top: projectedLine.midY - 2,
                  width: projectedLine.length,
                  height: 4,
                  backgroundColor: "#ef5b2a",
                  borderRadius: 999,
                  transform: [{ rotate: `${projectedLine.angle}deg` }],
                }}
              />
              {[{ x: projectedLine.x1, y: projectedLine.y1 }, { x: projectedLine.x2, y: projectedLine.y2 }].map(
                (point, index) => (
                  <View
                    key={index}
                    style={{
                      position: "absolute",
                      left: point.x - 7,
                      top: point.y - 7,
                      width: 14,
                      height: 14,
                      borderRadius: 7,
                      backgroundColor: index === 0 ? "#2ea56e" : "#ef5b2a",
                      borderWidth: 2,
                      borderColor: "#ffffff",
                    }}
                  />
                )
              )}
            </View>
          ) : null}

          <View style={{ gap: 14 }}>
            <View
              style={{
                alignSelf: "center",
                minWidth: 220,
                backgroundColor: "rgba(8, 15, 11, 0.82)",
                borderRadius: 24,
                paddingHorizontal: 18,
                paddingVertical: 16,
                borderWidth: 1,
                borderColor: "rgba(255,255,255,0.12)",
                alignItems: "center",
              }}
            >
              <Text
                style={{
                  color: "#b7d6bf",
                  fontSize: 12,
                  fontWeight: "800",
                  textTransform: "uppercase",
                  letterSpacing: 1,
                }}
              >
                Snapshot distance
              </Text>
              <Text
                style={{
                  color: "#ffffff",
                  fontWeight: "800",
                  fontSize: 34,
                  marginTop: 6,
                }}
              >
                {detection ? `${detection.result.distance_m.toFixed(2)} m` : "--"}
              </Text>
              <Text
                style={{
                  color: "rgba(255,255,255,0.74)",
                  marginTop: 6,
                  textAlign: "center",
                  lineHeight: 18,
                }}
              >
                {statusMessage}
              </Text>
              {detecting ? (
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 8,
                    marginTop: 10,
                  }}
                >
                  <ActivityIndicator size="small" color="#ffffff" />
                  <Text style={{ color: "#ffffff", fontWeight: "700" }}>
                    Measuring
                  </Text>
                </View>
              ) : null}
            </View>

            <View
              style={{
                backgroundColor: "rgba(8, 15, 11, 0.82)",
                borderRadius: 24,
                padding: 16,
                gap: 14,
                borderWidth: 1,
                borderColor: "rgba(255,255,255,0.12)",
              }}
            >
              <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap" }}>
                {presets.map((preset) => {
                  const active = preset.id === selectedPreset.id;
                  return (
                    <Pressable
                      key={preset.id}
                      onPress={() => setSelectedPresetId(preset.id)}
                      disabled={!!snapshotUri}
                      style={{
                        borderRadius: 999,
                        paddingHorizontal: 14,
                        paddingVertical: 10,
                        backgroundColor: active ? palette.accent : "rgba(255,255,255,0.08)",
                        borderWidth: 1,
                        borderColor: active
                          ? palette.accent
                          : "rgba(255,255,255,0.12)",
                        opacity: snapshotUri ? 0.65 : 1,
                      }}
                    >
                      <Text
                        style={{
                          color: "#ffffff",
                          fontWeight: "800",
                        }}
                      >
                        {preset.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>

              <View style={{ flexDirection: "row", gap: 10 }}>
                <Pressable
                  onPress={() => {
                    void handleSnapshot();
                  }}
                  disabled={detecting || !!snapshotUri}
                  style={{
                    flex: 1,
                    borderRadius: 18,
                    paddingVertical: 14,
                    backgroundColor:
                      detecting || snapshotUri ? "rgba(255,255,255,0.08)" : palette.accent,
                    borderWidth: 1,
                    borderColor:
                      detecting || snapshotUri ? "rgba(255,255,255,0.12)" : palette.accent,
                    opacity: detecting || snapshotUri ? 0.75 : 1,
                  }}
                >
                  <Text
                    style={{
                      color: "#ffffff",
                      fontWeight: "800",
                      textAlign: "center",
                    }}
                  >
                    {detecting
                      ? "Capturing..."
                      : snapshotUri
                        ? "Snapshot locked"
                        : "Take snapshot"}
                  </Text>
                </Pressable>

                {snapshotUri ? (
                  <Pressable
                    onPress={handleRetake}
                    style={{
                      flex: 1,
                      borderRadius: 18,
                      paddingVertical: 14,
                      backgroundColor: "rgba(255,255,255,0.08)",
                      borderWidth: 1,
                      borderColor: "rgba(255,255,255,0.12)",
                    }}
                  >
                    <Text
                      style={{
                        color: "#ffffff",
                        fontWeight: "800",
                        textAlign: "center",
                      }}
                    >
                      Retake
                    </Text>
                  </Pressable>
                ) : null}
              </View>

              {mountError ? (
                <Text style={{ color: "#ffd8c7", lineHeight: 20 }}>{mountError}</Text>
              ) : null}
            </View>
          </View>
        </SafeAreaView>
      </View>
    </View>
  );
}
