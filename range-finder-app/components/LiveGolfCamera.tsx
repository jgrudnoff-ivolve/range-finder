import React, {
  startTransition,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  ActivityIndicator,
  LayoutChangeEvent,
  Pressable,
  SafeAreaView,
  Text,
  View,
} from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";

import { estimateGolfDistance } from "../services/api";
import {
  interpolateLiveGolfFocalLength,
  projectGolfDetectionLine,
  resolveLiveGolfCalibration,
  zoomFactorToCameraZoom,
} from "../services/liveGolf";
import { CalibrationProfile, GolfEstimateResponse } from "../types";
import { AppPalette } from "../theme";

const DETECTION_INTERVAL_MS = 1400;
const ZOOM_STEPS = [1, 1.5, 2, 2.5, 3];

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
  const [permission, requestPermission] = useCameraPermissions();
  const [cameraReady, setCameraReady] = useState(false);
  const [zoomFactor, setZoomFactor] = useState(1);
  const [previewSize, setPreviewSize] = useState({ width: 0, height: 0 });
  const [statusMessage, setStatusMessage] = useState(
    "Point the camera at the pin. Live detection updates every second or so."
  );
  const [mountError, setMountError] = useState<string | null>(null);
  const [detecting, setDetecting] = useState(false);
  const [detection, setDetection] = useState<DetectionState | null>(null);

  const cameraRef = useRef<CameraView | null>(null);
  const loopTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
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
  const focalLengthRef = useRef(focalLengthPixels);
  const zoomFactorRef = useRef(zoomFactor);

  useEffect(() => {
    focalLengthRef.current = focalLengthPixels;
  }, [focalLengthPixels]);

  useEffect(() => {
    zoomFactorRef.current = zoomFactor;
  }, [zoomFactor]);

  const projectedLine = useMemo(() => {
    if (!detection) return null;

    return projectGolfDetectionLine({
      detection: detection.result,
      imageWidth: detection.imageWidth,
      imageHeight: detection.imageHeight,
      previewWidth: previewSize.width,
      previewHeight: previewSize.height,
    });
  }, [detection, previewSize.height, previewSize.width]);

  useEffect(() => {
    if (!cameraReady || !permission?.granted) {
      return;
    }

    let cancelled = false;

    const runDetection = async () => {
      if (!cameraReady || !permission.granted || !cameraRef.current) {
        return;
      }

      if (captureInFlightRef.current) {
        return;
      }

      captureInFlightRef.current = true;
      setDetecting(true);

      try {
        const frame = await cameraRef.current.takePictureAsync({
          quality: 0.45,
          skipProcessing: true,
          shutterSound: false,
        });

        const result = await estimateGolfDistance({
          apiBaseUrl,
          imageUri: frame.uri,
          focalLengthPixels: String(focalLengthRef.current),
        });

        startTransition(() => {
          setDetection({
            result,
            imageWidth: frame.width,
            imageHeight: frame.height,
            focalLengthPixels: focalLengthRef.current,
            zoomFactor: zoomFactorRef.current,
            capturedAt: Date.now(),
          });
        });

        setStatusMessage("Tracking the pin live.");
        setMountError(null);
      } catch (error: any) {
        setStatusMessage(
          error?.message || "Could not detect the flagpole from the live camera frame."
        );
      } finally {
        captureInFlightRef.current = false;
        setDetecting(false);
      }
    };

    const tick = async () => {
      if (cancelled) return;

      await runDetection();

      if (!cancelled) {
        loopTimeoutRef.current = setTimeout(tick, DETECTION_INTERVAL_MS);
      }
    };

    void tick();

    return () => {
      cancelled = true;
      if (loopTimeoutRef.current) {
        clearTimeout(loopTimeoutRef.current);
      }
    };
  }, [apiBaseUrl, cameraReady, permission?.granted]);

  function handlePreviewLayout(event: LayoutChangeEvent) {
    const { width, height } = event.nativeEvent.layout;
    setPreviewSize({ width, height });
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
            Live flag detection needs the rear camera so the app can keep checking the
            pin while you frame the shot.
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
        <CameraView
          ref={cameraRef}
          style={{ flex: 1 }}
          facing="back"
          mode="picture"
          zoom={cameraZoom}
          onCameraReady={() => setCameraReady(true)}
          onMountError={(event) => {
            setMountError(event.message);
            setStatusMessage(event.message);
          }}
        />

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
              <View
                style={{
                  backgroundColor: "rgba(8, 15, 11, 0.72)",
                  borderRadius: 999,
                  paddingHorizontal: 12,
                  paddingVertical: 8,
                }}
              >
                <Text style={{ color: "#ffffff", fontWeight: "700", fontSize: 12 }}>
                  Focal {Math.round(focalLengthPixels)} px
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
                    Last update {new Date(detection.capturedAt).toLocaleTimeString()}
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
                Live distance
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
                    Refreshing
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
                {ZOOM_STEPS.map((step) => {
                  const active = Math.abs(step - zoomFactor) < 0.01;
                  return (
                    <Pressable
                      key={step}
                      onPress={() => setZoomFactor(step)}
                      style={{
                        borderRadius: 999,
                        paddingHorizontal: 14,
                        paddingVertical: 10,
                        backgroundColor: active ? palette.accent : "rgba(255,255,255,0.08)",
                        borderWidth: 1,
                        borderColor: active
                          ? palette.accent
                          : "rgba(255,255,255,0.12)",
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
