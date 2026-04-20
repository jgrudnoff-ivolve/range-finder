import React, { useEffect, useMemo, useState } from "react";
import {
  ActionSheetIOS,
  Alert,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import * as ImagePicker from "expo-image-picker";

import { AppHero } from "./components/AppHero";
import { CalibrationCameraCapture } from "./components/CalibrationCameraCapture";
import { CalibrationProfilesCard } from "./components/CalibrationProfilesCard";
import { ImageMeasurement } from "./components/ImageMeasurement";
import { LiveGolfCamera } from "./components/LiveGolfCamera";
import { MenuDrawer } from "./components/MenuDrawer";
import { ProfileDropdown } from "./components/ProfileDropdown";
import { ResultSummary } from "./components/ResultSummary";
import {
  calibrateFocalLength,
  estimateDistance,
} from "./services/api";
import {
  deleteCalibrationProfile,
  getCalibrationProfiles,
  saveCalibrationProfile,
} from "./storage/calibrationStore";
import {
  CalibrationProfile,
  CalibrationResponse,
  EstimateResponse,
  Point,
} from "./types";
import { palettes, ScreenMode } from "./theme";

const API_BASE_URL = "https://range-finder-1nzw.onrender.com";

export default function App() {
  const [screen, setScreen] = useState<ScreenMode>("estimate");
  const [menuOpen, setMenuOpen] = useState(false);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);

  const [imageUri, setImageUri] = useState<string | null>(null);
  const [imageWidth, setImageWidth] = useState(1);
  const [imageHeight, setImageHeight] = useState(1);
  const [points, setPoints] = useState<Point[]>([]);

  const [realObjectHeightCm, setRealObjectHeightCm] = useState("8.56");
  const [focalLengthPixels, setFocalLengthPixels] = useState("");
  const [profiles, setProfiles] = useState<CalibrationProfile[]>([]);
  const [calibrationCameraOpen, setCalibrationCameraOpen] = useState(false);

  const [result, setResult] = useState<
    | { kind: "idle" }
    | { kind: "loading"; message: string }
    | { kind: "error"; message: string }
    | {
        kind: "calibration";
        data: CalibrationResponse;
        zoomFactor: number;
      }
    | { kind: "estimate"; data: EstimateResponse }
  >({ kind: "idle" });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadProfiles();
  }, []);

  async function loadProfiles() {
    const data = await getCalibrationProfiles();
    setProfiles(
      [...data].sort((a, b) => (a.zoomLevel ?? 99) - (b.zoomLevel ?? 99))
    );
  }

  const selectedProfile = useMemo(() => {
    return profiles.find((p) => String(p.focalLengthPixels) === focalLengthPixels);
  }, [profiles, focalLengthPixels]);

  const palette = palettes[screen];

  function applyPickedAsset(asset: ImagePicker.ImagePickerAsset) {
    setImageUri(asset.uri);
    setImageWidth(asset.width || 1);
    setImageHeight(asset.height || 1);
    setPoints([]);
    setResult({ kind: "idle" });
  }

  async function chooseFromLibrary() {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permission.granted) {
      Alert.alert("Permission required", "Please allow photo library access.");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 1,
      allowsEditing: false,
    });

    if (result.canceled || !result.assets?.length) return;

    applyPickedAsset(result.assets[0]);
  }

  async function takePhoto() {
    const permission = await ImagePicker.requestCameraPermissionsAsync();

    if (!permission.granted) {
      Alert.alert("Permission required", "Please allow camera access.");
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 1,
      allowsEditing: false,
      cameraType: ImagePicker.CameraType.back,
    });

    if (result.canceled || !result.assets?.length) return;

    applyPickedAsset(result.assets[0]);
  }

  async function pickImage() {
    if (Platform.OS === "web") {
      await chooseFromLibrary();
      return;
    }

    if (Platform.OS === "ios") {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: ["Cancel", "Take photo", "Choose from library"],
          cancelButtonIndex: 0,
        },
        async (buttonIndex) => {
          if (buttonIndex === 1) {
            await takePhoto();
          } else if (buttonIndex === 2) {
            await chooseFromLibrary();
          }
        }
      );
      return;
    }

    Alert.alert("Choose image", "Select where to get the image from.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Take photo",
        onPress: () => {
          void takePhoto();
        },
      },
      {
        text: "Choose from library",
        onPress: () => {
          void chooseFromLibrary();
        },
      },
    ]);
  }

  function handleAddPoint(point: Point) {
    setPoints((prev) => {
      if (prev.length >= 2) return [point];
      return [...prev, point];
    });
  }

  function handleClearPoints() {
    setPoints([]);
  }

  function validateSharedInputs() {
    if (!imageUri) {
      Alert.alert("Missing image", "Please choose an image first.");
      return false;
    }

    if (points.length !== 2) {
      Alert.alert("Missing points", "Please select two points on the image.");
      return false;
    }

    if (!realObjectHeightCm) {
      Alert.alert("Missing value", "Please enter the real object height.");
      return false;
    }

    return true;
  }

  async function calibrateCapturedImage(imageUrisToCalibrate: string[], zoomFactor: number) {
    try {
      setLoading(true);
      setResult({ kind: "loading", message: `Calibrating ${zoomFactor.toFixed(1)}x checkerboard...` });

      const calibration = await calibrateFocalLength({
        apiBaseUrl: API_BASE_URL,
        imageUris: imageUrisToCalibrate,
      });

      setFocalLengthPixels(String(calibration.focal_length_pixels));
      const normalizedZoomLabel = zoomFactor.toFixed(1);

      const profile: CalibrationProfile = {
        id: `zoom-${normalizedZoomLabel.replace(".", "_")}x`,
        name: `Rear Camera ${normalizedZoomLabel}x`,
        focalLengthPixels: calibration.focal_length_pixels,
        zoomLevel: zoomFactor,
        actualZoomFactor: zoomFactor,
      };

      await saveCalibrationProfile(profile);
      await loadProfiles();
      setResult({
        kind: "calibration",
        data: calibration,
        zoomFactor,
      });
    } catch (error: any) {
      setResult({ kind: "error", message: error.message || "Calibration failed" });
    } finally {
      setLoading(false);
    }
  }

  async function handleEstimateSubmit() {
    if (!validateSharedInputs()) return;

    if (!selectedProfile) {
      Alert.alert(
        "Missing calibration",
        "Choose a saved calibration profile before estimating distance."
      );
      return;
    }

    try {
      setLoading(true);
      setResult({ kind: "loading", message: "Estimating distance..." });

      const estimate = await estimateDistance({
        apiBaseUrl: API_BASE_URL,
        imageUri: imageUri!,
        realObjectHeightCm,
        focalLengthPixels: String(selectedProfile.focalLengthPixels),
        points,
      });

      setResult({ kind: "estimate", data: estimate });
    } catch (error: any) {
      setResult({ kind: "error", message: error.message || "Request failed" });
    } finally {
      setLoading(false);
    }
  }

  async function handleUseProfile(profile: CalibrationProfile) {
    setFocalLengthPixels(String(profile.focalLengthPixels));
    setProfileDropdownOpen(false);
  }

  async function handleDeleteProfile(profile: CalibrationProfile) {
    await deleteCalibrationProfile(profile.id);
    if (String(profile.focalLengthPixels) === focalLengthPixels) {
      setFocalLengthPixels("");
    }
    setProfileDropdownOpen(false);
    await loadProfiles();
  }

  function handleCalibrationCapture(result: {
    imageUris: string[];
    zoomFactor: number;
  }) {
    setCalibrationCameraOpen(false);
    void calibrateCapturedImage(result.imageUris, result.zoomFactor);
  }

  if (screen === "golf") {
    return (
      <View style={{ flex: 1, backgroundColor: palette.bg }}>
        <LiveGolfCamera
          apiBaseUrl={API_BASE_URL}
          palette={palette}
          profiles={profiles}
          onOpenMenu={() => setMenuOpen(true)}
        />

        <MenuDrawer
          palette={palette}
          screen={screen}
          open={menuOpen}
          onClose={() => setMenuOpen(false)}
          onNavigate={(nextScreen) => {
            setScreen(nextScreen);
            setMenuOpen(false);
          }}
        />
      </View>
    );
  }

  if (screen === "calibration" && calibrationCameraOpen) {
    return (
      <CalibrationCameraCapture
        palette={palette}
        onClose={() => setCalibrationCameraOpen(false)}
        onCapture={handleCalibrationCapture}
      />
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: palette.bg }}>
      <ScrollView
        style={{ flex: 1, backgroundColor: palette.bg }}
        contentContainerStyle={{ padding: 18, gap: 18, paddingBottom: 32 }}
      >
        <AppHero palette={palette} screen={screen} onOpenMenu={() => setMenuOpen(true)} />

        {screen === "estimate" ? (
          <>
            <View
              style={{
                backgroundColor: palette.surface,
                borderRadius: 24,
                padding: 18,
                borderWidth: 1,
                borderColor: palette.border,
                gap: 12,
              }}
            >
              <Text style={{ fontWeight: "700", color: palette.text, fontSize: 18 }}>
                Estimate Distance
              </Text>
              <Text style={{ color: palette.muted, fontSize: 13, lineHeight: 20 }}>
                This is the main workflow. Choose a photo, mark the object, and estimate how far away it is.
              </Text>
            </View>

            <View
              style={{
                backgroundColor: palette.surface,
                borderRadius: 24,
                padding: 18,
                borderWidth: 1,
                borderColor: palette.border,
                gap: 14,
              }}
            >
              <View style={{ gap: 4 }}>
                <Text style={{ fontWeight: "700", color: palette.text, fontSize: 18 }}>
                  Photo Setup
                </Text>
                <Text style={{ color: palette.muted, fontSize: 13 }}>
                  Pick a photo, then tap the top and bottom of the object you want to measure.
                </Text>
              </View>

              <Pressable
                onPress={pickImage}
                style={{
                  backgroundColor: palette.accent,
                  paddingVertical: 14,
                  borderRadius: 16,
                  shadowColor: palette.accentDark,
                  shadowOpacity: 0.18,
                  shadowRadius: 10,
                  shadowOffset: { width: 0, height: 4 },
                  elevation: 2,
                }}
              >
                <Text
                  style={{ color: "white", textAlign: "center", fontWeight: "700" }}
                >
                  {imageUri ? "Choose a different image" : "Choose image"}
                </Text>
              </Pressable>

              {imageUri ? (
                <View
                  style={{
                    flexDirection: "row",
                    gap: 8,
                    flexWrap: "wrap",
                  }}
                >
                  <View
                    style={{
                      backgroundColor: palette.accentSoft,
                      borderRadius: 999,
                      paddingHorizontal: 12,
                      paddingVertical: 7,
                    }}
                  >
                    <Text
                      style={{
                        color: palette.accentDark,
                        fontSize: 12,
                        fontWeight: "700",
                      }}
                    >
                      {imageWidth} x {imageHeight}
                    </Text>
                  </View>
                </View>
              ) : null}

              <ImageMeasurement
                imageUri={imageUri}
                imageWidth={imageWidth}
                imageHeight={imageHeight}
                points={points}
                onAddPoint={handleAddPoint}
                onClearPoints={handleClearPoints}
              />
            </View>

            <View
              style={{
                backgroundColor: palette.surface,
                borderRadius: 24,
                padding: 18,
                borderWidth: 1,
                borderColor: palette.border,
                gap: 10,
              }}
            >
              <Text style={{ fontWeight: "700", color: palette.text, fontSize: 18 }}>
                Estimation Inputs
              </Text>
              <Text style={{ color: palette.muted, fontSize: 13 }}>
                Estimation uses a saved zoom calibration, so users don't have to type focal length values manually.
              </Text>

              <Text
                style={{ color: palette.muted, fontSize: 12, fontWeight: "600" }}
              >
                Real object height (cm)
              </Text>
              <TextInput
                value={realObjectHeightCm}
                onChangeText={setRealObjectHeightCm}
                keyboardType="decimal-pad"
                style={{
                  borderWidth: 1,
                  borderColor: palette.border,
                  borderRadius: 14,
                  paddingHorizontal: 12,
                  paddingVertical: 12,
                  backgroundColor: palette.surfaceStrong,
                  color: palette.text,
                }}
              />

              <Text style={{ color: palette.muted, fontSize: 12, fontWeight: "600" }}>
                Calibration preset
              </Text>
              <ProfileDropdown
                palette={palette}
                profiles={profiles}
                selectedProfile={selectedProfile}
                selectedFocalLength={focalLengthPixels}
                open={profileDropdownOpen}
                emptyMessage="Choose a saved calibration profile to enable estimating."
                onToggle={() => setProfileDropdownOpen((current) => !current)}
                onSelect={handleUseProfile}
              />

              <Pressable
                onPress={handleEstimateSubmit}
                disabled={loading || !selectedProfile}
                style={{
                  backgroundColor:
                    loading || !selectedProfile ? palette.accentDark : palette.accent,
                  paddingVertical: 14,
                  borderRadius: 16,
                  marginTop: 6,
                  opacity: loading || !selectedProfile ? 0.72 : 1,
                }}
              >
                <Text
                  style={{ color: "white", textAlign: "center", fontWeight: "700" }}
                >
                  {loading ? "Estimating..." : "Estimate distance"}
                </Text>
              </Pressable>
            </View>
          </>
        ) : (
          <>
            <View
              style={{
                backgroundColor: palette.surfaceStrong,
                borderRadius: 28,
                padding: 20,
                borderWidth: 1,
                borderColor: palette.border,
                gap: 10,
                shadowColor: palette.shadow,
                shadowOpacity: 1,
                shadowRadius: 18,
                shadowOffset: { width: 0, height: 8 },
                elevation: 2,
              }}
            >
              <Pressable
                onPress={() => setScreen("estimate")}
                style={{
                  alignSelf: "flex-start",
                  backgroundColor: "#efe7da",
                  borderRadius: 999,
                  paddingHorizontal: 14,
                  paddingVertical: 9,
                }}
              >
                <Text style={{ color: palette.text, fontWeight: "700" }}>
                  Back to estimate
                </Text>
              </Pressable>
              <Text style={{ fontWeight: "700", color: palette.text, fontSize: 18 }}>
                Calibration Setup
              </Text>
              <Text style={{ color: palette.muted, fontSize: 13, lineHeight: 20 }}>
                Calibration uses a checkerboard photo. Open the camera, zoom to the level you want to calibrate, and the app will save that zoom level automatically with the focal length.
              </Text>
              <View
                style={{
                  backgroundColor: palette.accentSoft,
                  borderRadius: 16,
                  padding: 14,
                  gap: 6,
                }}
              >
                <Text style={{ color: palette.accentDark, fontWeight: "800", fontSize: 12 }}>
                  One-time workflow
                </Text>
                <Text style={{ color: palette.text, lineHeight: 20 }}>
                  Add one calibration for each zoom level you care about. After that, day-to-day use stays on the estimate and golf screens.
                </Text>
              </View>
            </View>

            <View
              style={{
                backgroundColor: palette.surface,
                borderRadius: 24,
                padding: 18,
                borderWidth: 1,
                borderColor: palette.border,
                gap: 14,
              }}
            >
              <View style={{ gap: 4 }}>
                <Text style={{ fontWeight: "700", color: palette.text, fontSize: 18 }}>
                  Add Calibration
                </Text>
                <Text style={{ color: palette.muted, fontSize: 13 }}>
                  Use the in-app camera, zoom to the level you want, and capture one centered checkerboard photo.
                </Text>
              </View>

              <Pressable
                onPress={() => setCalibrationCameraOpen(true)}
                disabled={loading}
                style={{
                  backgroundColor: loading ? palette.accentDark : palette.accent,
                  paddingVertical: 14,
                  borderRadius: 16,
                  opacity: loading ? 0.75 : 1,
                }}
              >
                <Text style={{ color: "white", textAlign: "center", fontWeight: "700" }}>
                  Add zoom level calibration
                </Text>
              </Pressable>
            </View>
          </>
        )}

        {screen === "calibration" ? (
          <CalibrationProfilesCard
            palette={palette}
            profiles={profiles}
            onUse={handleUseProfile}
            onDelete={handleDeleteProfile}
          />
        ) : null}

        <View
          style={{
            backgroundColor: palette.surface,
            borderRadius: 24,
            padding: 18,
            borderWidth: 1,
            borderColor: palette.border,
            gap: 10,
          }}
        >
          <Text style={{ fontWeight: "700", color: palette.text, fontSize: 18 }}>
            Result
          </Text>
          <ResultSummary result={result} />
        </View>
      </ScrollView>

      <MenuDrawer
        palette={palette}
        screen={screen}
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
        onNavigate={(nextScreen) => {
          setScreen(nextScreen);
          setMenuOpen(false);
        }}
      />
    </View>
  );
}
