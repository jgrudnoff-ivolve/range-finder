import React, { useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
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

import { AppPalette } from "../theme";

type CaptureResult = {
  imageUris: string[];
  zoomFactor: number;
};

type Props = {
  palette: AppPalette;
  onClose: () => void;
  onCapture: (result: CaptureResult) => void;
};

const REQUIRED_CAPTURE_COUNT = 5;

function clampZoomValue(value: number, minZoom = 1, maxZoom = 1) {
  return Math.min(Math.max(value, minZoom), maxZoom);
}

export function CalibrationCameraCapture({
  palette,
  onClose,
  onCapture,
}: Props) {
  const { hasPermission, requestPermission } = useCameraPermission();
  const [cameraReady, setCameraReady] = useState(false);
  const [currentZoomFactor, setCurrentZoomFactor] = useState(1);
  const [capturing, setCapturing] = useState(false);
  const [mountError, setMountError] = useState<string | null>(null);
  const [capturedImageUris, setCapturedImageUris] = useState<string[]>([]);

  const cameraRef = useRef<Camera | null>(null);
  const backDevice = useCameraDevice("back");

  const cameraConfig = useMemo(() => {
    if (!backDevice) {
      return null;
    }

    const minZoom = backDevice.minZoom ?? 1;
    const maxZoom = backDevice.maxZoom ?? 8;
    const zoom = clampZoomValue(currentZoomFactor, minZoom, maxZoom);

    return {
      device: backDevice,
      zoom,
      minZoom,
      maxZoom,
      userZoomFactor: zoom,
      zoomStep: 0.1,
    };
  }, [backDevice, currentZoomFactor]);

  async function handleCapture() {
    if (!cameraRef.current || !cameraConfig || !cameraReady || capturing) {
      return;
    }

    setCapturing(true);
    try {
      const photo = await cameraRef.current.takePhoto({
        enableShutterSound: false,
      });
      const uri = photo.path.startsWith("file://") ? photo.path : `file://${photo.path}`;
      setCapturedImageUris((current) => [...current, uri]);
    } finally {
      setCapturing(false);
    }
  }

  function handleFinish() {
    if (!cameraConfig || capturedImageUris.length < REQUIRED_CAPTURE_COUNT) {
      return;
    }

    onCapture({
      imageUris: capturedImageUris,
      zoomFactor: Number(cameraConfig.userZoomFactor.toFixed(2)),
    });
  }

  if (Platform.OS === "web") {
    return (
      <SafeAreaView
        style={{
          flex: 1,
          backgroundColor: palette.bg,
          justifyContent: "center",
          padding: 22,
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
            Calibration
          </Text>
          <Text style={{ color: palette.text, fontWeight: "800", fontSize: 30 }}>
            Native Mobile Only
          </Text>
          <Text style={{ color: palette.muted, lineHeight: 22 }}>
            Automatic zoom capture is only available in the native mobile app.
          </Text>
          <Pressable
            onPress={onClose}
            style={{
              backgroundColor: palette.accent,
              borderRadius: 16,
              paddingVertical: 14,
            }}
          >
            <Text style={{ color: "#ffffff", textAlign: "center", fontWeight: "800" }}>
              Close
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
          justifyContent: "center",
          padding: 22,
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
          <Text style={{ color: palette.text, fontWeight: "800", fontSize: 30 }}>
            Camera Access Needed
          </Text>
          <Text style={{ color: palette.muted, lineHeight: 22 }}>
            Calibration now captures the zoom directly from the in-app camera.
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

  if (!cameraConfig) {
    return (
      <SafeAreaView
        style={{
          flex: 1,
          backgroundColor: palette.bg,
          justifyContent: "center",
          padding: 22,
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
          <Text style={{ color: palette.text, fontWeight: "800", fontSize: 30 }}>
            Loading Camera
          </Text>
          <ActivityIndicator color={palette.accent} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: "#09110c" }}>
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
        }}
      />

      <SafeAreaView
        pointerEvents="box-none"
        style={{
          position: "absolute",
          inset: 0,
          padding: 16,
          justifyContent: "space-between",
        }}
        >
          <View style={{ gap: 12 }}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
              <Pressable
                onPress={onClose}
              style={{
                backgroundColor: "rgba(255,255,255,0.12)",
                borderRadius: 18,
                paddingHorizontal: 14,
                paddingVertical: 12,
                borderWidth: 1,
                borderColor: "rgba(255,255,255,0.12)",
              }}
            >
              <Text style={{ color: "#ffffff", fontWeight: "800" }}>Back</Text>
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
                Zoom {cameraConfig.userZoomFactor.toFixed(2)}x
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
                {capturedImageUris.length}/{REQUIRED_CAPTURE_COUNT} captures
              </Text>
            </View>
            <View
              style={{
                backgroundColor: "rgba(8, 15, 11, 0.72)",
                borderRadius: 18,
                paddingHorizontal: 14,
                paddingVertical: 12,
                alignSelf: "flex-start",
              }}
            >
              <Text style={{ color: "#b7d6bf", fontSize: 11, fontWeight: "800", letterSpacing: 0.8 }}>
                CALIBRATING NOW
              </Text>
              <Text style={{ color: "#ffffff", fontSize: 20, fontWeight: "800", marginTop: 4 }}>
                {cameraConfig.userZoomFactor.toFixed(2)}x
              </Text>
              <Text style={{ color: "rgba(255,255,255,0.74)", fontSize: 12, marginTop: 4 }}>
                This photo will be saved as the {cameraConfig.userZoomFactor.toFixed(2)}x calibration.
              </Text>
            </View>
          </View>
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
          <Text style={{ color: "rgba(255,255,255,0.74)", textAlign: "center", lineHeight: 18 }}>
            Adjust the zoom until the level above is the one you want to save, then capture {REQUIRED_CAPTURE_COUNT} centered checkerboard photos from slightly different angles.
          </Text>

          <View style={{ flexDirection: "row", gap: 10, alignItems: "center" }}>
            <Pressable
              onPress={() => {
                setCurrentZoomFactor((value) =>
                  Number(
                    clampZoomValue(
                      value - cameraConfig.zoomStep,
                      cameraConfig.minZoom,
                      cameraConfig.maxZoom
                    ).toFixed(2)
                  )
                );
              }}
              disabled={capturing}
              style={{
                width: 52,
                borderRadius: 16,
                paddingVertical: 12,
                backgroundColor: "rgba(255,255,255,0.08)",
                borderWidth: 1,
                borderColor: "rgba(255,255,255,0.12)",
                opacity: capturing ? 0.65 : 1,
              }}
            >
              <Text style={{ color: "#ffffff", textAlign: "center", fontWeight: "800", fontSize: 18 }}>
                -
              </Text>
            </Pressable>

            <View
              style={{
                flex: 1,
                borderRadius: 16,
                paddingVertical: 12,
                paddingHorizontal: 14,
                backgroundColor: "rgba(255,255,255,0.06)",
                borderWidth: 1,
                borderColor: "rgba(255,255,255,0.12)",
              }}
            >
              <Text style={{ color: "#ffffff", fontWeight: "800", textAlign: "center" }}>
                Save current zoom
              </Text>
            </View>

            <Pressable
              onPress={() => {
                setCurrentZoomFactor((value) =>
                  Number(
                    clampZoomValue(
                      value + cameraConfig.zoomStep,
                      cameraConfig.minZoom,
                      cameraConfig.maxZoom
                    ).toFixed(2)
                  )
                );
              }}
              disabled={capturing}
              style={{
                width: 52,
                borderRadius: 16,
                paddingVertical: 12,
                backgroundColor: "rgba(255,255,255,0.08)",
                borderWidth: 1,
                borderColor: "rgba(255,255,255,0.12)",
                opacity: capturing ? 0.65 : 1,
              }}
            >
              <Text style={{ color: "#ffffff", textAlign: "center", fontWeight: "800", fontSize: 18 }}>
                +
              </Text>
            </Pressable>
          </View>

          <Pressable
            onPress={() => {
              void handleCapture();
            }}
            disabled={capturing || !cameraReady}
            style={{
              borderRadius: 18,
              paddingVertical: 14,
              backgroundColor:
                capturing || !cameraReady ? "rgba(255,255,255,0.08)" : palette.accent,
              borderWidth: 1,
              borderColor:
                capturing || !cameraReady ? "rgba(255,255,255,0.12)" : palette.accent,
              opacity: capturing || !cameraReady ? 0.75 : 1,
            }}
          >
            <Text style={{ color: "#ffffff", fontWeight: "800", textAlign: "center" }}>
              {capturing ? "Capturing..." : "Capture checkerboard photo"}
            </Text>
          </Pressable>

          <Pressable
            onPress={handleFinish}
            disabled={capturing || capturedImageUris.length < REQUIRED_CAPTURE_COUNT}
            style={{
              borderRadius: 18,
              paddingVertical: 14,
              backgroundColor:
                capturing || capturedImageUris.length < REQUIRED_CAPTURE_COUNT
                  ? "rgba(255,255,255,0.08)"
                  : "#2ea56e",
              borderWidth: 1,
              borderColor:
                capturing || capturedImageUris.length < REQUIRED_CAPTURE_COUNT
                  ? "rgba(255,255,255,0.12)"
                  : "#2ea56e",
              opacity: capturing || capturedImageUris.length < REQUIRED_CAPTURE_COUNT ? 0.75 : 1,
            }}
          >
            <Text style={{ color: "#ffffff", fontWeight: "800", textAlign: "center" }}>
              Save {cameraConfig.userZoomFactor.toFixed(2)}x calibration
            </Text>
          </Pressable>

          {mountError ? (
            <Text style={{ color: "#ffd8c7", lineHeight: 20 }}>{mountError}</Text>
          ) : null}
        </View>
      </SafeAreaView>
    </View>
  );
}
