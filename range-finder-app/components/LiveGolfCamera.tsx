import React, {
  startTransition,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  ActivityIndicator,
  Image,
  LayoutChangeEvent,
  Pressable,
  SafeAreaView,
  Text,
  View,
} from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";

import { estimateGolfDistance } from "../services/api";
import {
  getSupportedLiveGolfZoomSteps,
  getLiveGolfPreviewScale,
  interpolateLiveGolfFocalLength,
  prepareLiveGolfSnapshot,
  projectGolfDetectionLine,
  resolveLiveGolfCalibration,
  zoomFactorToCameraZoom,
} from "../services/liveGolf";
import { CalibrationProfile, GolfEstimateResponse } from "../types";
import { AppPalette } from "../theme";

type DetectionState = {
  result: GolfEstimateResponse;
  imageWidth: number;
  imageHeight: number;
  focalLengthPixels: number;
  zoomFactor: number;
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
  const zoomSteps = useMemo(() => getSupportedLiveGolfZoomSteps(), []);
  const [permission, requestPermission] = useCameraPermissions();
  const [cameraReady, setCameraReady] = useState(false);
  const [zoomFactor, setZoomFactor] = useState(1);
  const [previewSize, setPreviewSize] = useState({ width: 0, height: 0 });
  const [statusMessage, setStatusMessage] = useState(
    zoomSteps.length > 1
      ? "Frame the pin, choose a zoom level, then capture a snapshot to measure it."
      : "Frame the pin, then capture a snapshot to measure it."
  );
  const [mountError, setMountError] = useState<string | null>(null);
  const [detecting, setDetecting] = useState(false);
  const [detection, setDetection] = useState<DetectionState | null>(null);
  const [snapshotUri, setSnapshotUri] = useState<string | null>(null);

  const cameraRef = useRef<CameraView | null>(null);
  const captureInFlightRef = useRef(false);

  const calibration = useMemo(
    () => resolveLiveGolfCalibration(profiles),
    [profiles]
  );
  const focalLengthPixels = useMemo(
    () => interpolateLiveGolfFocalLength(calibration, zoomFactor),
    [calibration, zoomFactor]
  );
  const cameraZoom = useMemo(() => zoomFactorToCameraZoom(zoomFactor), [zoomFactor]);
  const previewScale = useMemo(() => getLiveGolfPreviewScale(zoomFactor), [zoomFactor]);
  const focalLengthRef = useRef(focalLengthPixels);
  const zoomFactorRef = useRef(zoomFactor);

  useEffect(() => {
    focalLengthRef.current = focalLengthPixels;
  }, [focalLengthPixels]);

  useEffect(() => {
    zoomFactorRef.current = zoomFactor;
  }, [zoomFactor]);

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

  async function handleSnapshot() {
    if (!cameraReady || !permission?.granted || !cameraRef.current) {
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
      const frame = await cameraRef.current.takePictureAsync({
        quality: 0.4,
        shutterSound: false,
      });
      const preparedFrame = await prepareLiveGolfSnapshot(
        {
          uri: frame.uri,
          width: frame.width,
          height: frame.height,
        },
        zoomFactorRef.current
      );
      const captureMs = Date.now() - captureStart;

      const apiStart = Date.now();
      const result = await estimateGolfDistance({
        apiBaseUrl,
        imageUri: preparedFrame.uri,
        focalLengthPixels: String(focalLengthRef.current),
      });
      const apiMs = Date.now() - apiStart;
      const totalMs = Date.now() - snapshotStart;

      setSnapshotUri(preparedFrame.uri);

      startTransition(() => {
        setDetection({
          result,
          imageWidth: preparedFrame.width,
          imageHeight: preparedFrame.height,
          focalLengthPixels: focalLengthRef.current,
          zoomFactor: zoomFactorRef.current,
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
        zoom_factor: zoomFactorRef.current,
        focal_length_pixels: focalLengthRef.current,
      });
    } catch (error: any) {
      setSnapshotUri(null);
      setDetection(null);
      setStatusMessage(
        error?.message || "Could not detect the flagpole in this snapshot."
      );
      console.log("[LiveGolfCamera] Snapshot timing failed", {
        total_ms: Date.now() - snapshotStart,
        zoom_factor: zoomFactorRef.current,
        focal_length_pixels: focalLengthRef.current,
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
    setStatusMessage(
      zoomSteps.length > 1
        ? "Frame the pin, choose a zoom level, then capture a snapshot to measure it."
        : "Frame the pin, then capture a snapshot to measure it."
    );
    setMountError(null);
  }

  if (!permission) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: "#102015",
          alignItems: "center",
          justifyContent: "center",
          padding: 24,
        }}
      >
        <ActivityIndicator color="#ffffff" />
      </View>
    );
  }

  if (!permission.granted) {
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
            Camera access is needed so you can capture a flag snapshot and measure it.
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

  return (
    <View style={{ flex: 1, backgroundColor: "#09110c" }}>
      <View style={{ flex: 1 }} onLayout={handlePreviewLayout}>
        {snapshotUri ? (
          <Image source={{ uri: snapshotUri }} style={{ flex: 1 }} resizeMode="cover" />
        ) : (
          <View style={{ flex: 1, overflow: "hidden" }}>
            <CameraView
              ref={cameraRef}
              style={{
                flex: 1,
                transform: [{ scale: previewScale }],
              }}
              facing="back"
              mode="picture"
              zoom={cameraZoom}
              onCameraReady={() => setCameraReady(true)}
              onMountError={(event) => {
                setMountError(event.message);
                setStatusMessage(event.message);
              }}
            />
          </View>
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
                  Zoom {zoomFactor.toFixed(1)}x
                </Text>
              </View>
              {detection ? (
                <View
                  style={{
                    backgroundColor: "rgba(8, 15, 11, 0.72)",
                    borderRadius: 999,
                    paddingHorizontal: 12,
                    paddingVertical: 8,
                  }}
                >
                  <Text style={{ color: "#ffffff", fontWeight: "700", fontSize: 12 }}>
                    Snapshot {new Date(detection.capturedAt).toLocaleTimeString()}
                  </Text>
                </View>
              ) : null}
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
                {zoomSteps.map((step) => {
                  const active = Math.abs(step - zoomFactor) < 0.01;
                  return (
                    <Pressable
                      key={step}
                      onPress={() => setZoomFactor(step)}
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
                        {step.toFixed(1)}x
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
