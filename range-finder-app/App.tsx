import React, { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import * as ImagePicker from "expo-image-picker";

import { AppHero } from "./components/AppHero";
import { CalibrationProfilesCard } from "./components/CalibrationProfilesCard";
import { ImageMeasurement } from "./components/ImageMeasurement";
import { MenuDrawer } from "./components/MenuDrawer";
import { ProfileDropdown } from "./components/ProfileDropdown";
import { ResultSummary } from "./components/ResultSummary";
import {
  calibrateFocalLength,
  estimateDistance,
  estimateGolfDistance,
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
  GolfEstimateResponse,
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
  const [knownDistanceCm, setKnownDistanceCm] = useState("50");
  const [focalLengthPixels, setFocalLengthPixels] = useState("");

  const [profileName, setProfileName] = useState("Rear Camera 1x");
  const [profiles, setProfiles] = useState<CalibrationProfile[]>([]);

  const [result, setResult] = useState<
    | { kind: "idle" }
    | { kind: "loading"; message: string }
    | { kind: "error"; message: string }
    | {
        kind: "calibration";
        data: CalibrationResponse;
        profileName: string;
      }
    | { kind: "estimate"; data: EstimateResponse }
    | { kind: "golf"; data: GolfEstimateResponse }
  >({ kind: "idle" });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadProfiles();
  }, []);

  async function loadProfiles() {
    const data = await getCalibrationProfiles();
    setProfiles(data);
  }

  const selectedProfile = useMemo(() => {
    return profiles.find((p) => String(p.focalLengthPixels) === focalLengthPixels);
  }, [profiles, focalLengthPixels]);

  const palette = palettes[screen];

  async function pickImage() {
    const permission =
      await ImagePicker.requestMediaLibraryPermissionsAsync();

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

    const asset = result.assets[0];
    setImageUri(asset.uri);
    setImageWidth(asset.width || 1);
    setImageHeight(asset.height || 1);
    setPoints([]);
    setResult({ kind: "idle" });
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

  async function handleCalibrationSubmit() {
    if (!validateSharedInputs()) return;

    if (!knownDistanceCm) {
      Alert.alert("Missing value", "Please enter the known distance.");
      return;
    }

    try {
      setLoading(true);
      setResult({ kind: "loading", message: "Calculating focal length..." });

      const calibration = await calibrateFocalLength({
        apiBaseUrl: API_BASE_URL,
        imageUri: imageUri!,
        realObjectHeightCm,
        knownDistanceCm,
        points,
      });

      setFocalLengthPixels(String(calibration.focal_length_pixels));

      const profile: CalibrationProfile = {
        id: profileName.trim().toLowerCase().replace(/\s+/g, "-"),
        name: profileName,
        focalLengthPixels: calibration.focal_length_pixels,
      };

      await saveCalibrationProfile(profile);
      await loadProfiles();
      setResult({
        kind: "calibration",
        data: calibration,
        profileName: profile.name,
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

  async function handleGolfEstimateSubmit() {
    if (!imageUri) {
      Alert.alert("Missing image", "Please choose an image first.");
      return;
    }

    if (points.length !== 2) {
      Alert.alert("Missing points", "Please tap the top and bottom of the golf flag.");
      return;
    }

    if (!selectedProfile) {
      Alert.alert(
        "Missing calibration",
        "Choose a saved calibration profile before using Golf mode."
      );
      return;
    }

    try {
      setLoading(true);
      setResult({ kind: "loading", message: "Estimating golf distance..." });

      const golfEstimate = await estimateGolfDistance({
        apiBaseUrl: API_BASE_URL,
        imageUri: imageUri!,
        focalLengthPixels: String(selectedProfile.focalLengthPixels),
        points,
      });

      setResult({ kind: "golf", data: golfEstimate });
    } catch (error: any) {
      setResult({
        kind: "error",
        message: error.message || "Golf distance estimation failed",
      });
    } finally {
      setLoading(false);
    }
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
              Estimation uses a saved calibration preset, so users don't have to type focal length values manually.
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
        ) : screen === "golf" ? (
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
              Golf Mode
            </Text>
            <Text style={{ color: palette.muted, fontSize: 13, lineHeight: 20 }}>
              Golf mode assumes a standard 2.2 metre golf flag. Mark the flag manually to estimate distance from the photo.
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
                Golf Photo
              </Text>
              <Text style={{ color: palette.muted, fontSize: 13 }}>
                Choose a photo of the pin, then tap the top and bottom of the flag.
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
              Golf Inputs
            </Text>
            <Text style={{ color: palette.muted, fontSize: 13 }}>
              Golf mode always uses a 2.2 m flag height. Choose a saved calibration preset and mark the golf flag on the photo.
            </Text>

            <Text style={{ color: palette.muted, fontSize: 12, fontWeight: "600" }}>
              Calibration preset
            </Text>
            <ProfileDropdown
              palette={palette}
              profiles={profiles}
              selectedProfile={selectedProfile}
              selectedFocalLength={focalLengthPixels}
              open={profileDropdownOpen}
              emptyMessage="Choose a saved calibration profile to enable Golf mode."
              onToggle={() => setProfileDropdownOpen((current) => !current)}
              onSelect={handleUseProfile}
            />

            <View
              style={{
                borderWidth: 1,
                borderColor: palette.border,
                borderRadius: 14,
                paddingHorizontal: 12,
                paddingVertical: 14,
                backgroundColor: palette.surfaceStrong,
                gap: 4,
              }}
            >
              <Text style={{ color: palette.muted, fontSize: 12, fontWeight: "600" }}>
                Assumed target
              </Text>
              <Text style={{ color: palette.text, fontWeight: "700" }}>
                Golf flag
              </Text>
              <Text style={{ color: palette.muted, fontSize: 12 }}>
                Fixed height: 2.2 metres
              </Text>
            </View>

            <Pressable
              onPress={handleGolfEstimateSubmit}
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
                {loading ? "Estimating..." : "Estimate golf distance"}
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
              Calibration is an occasional setup step. Use a photo with a known object size and distance, then save the resulting focal length for later.
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
                Most people only do this once per device or zoom level, then return to the estimate page for day-to-day use.
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
                Calibration Photo
              </Text>
              <Text style={{ color: palette.muted, fontSize: 13 }}>
                Choose a reference image and mark the same object from top to bottom.
              </Text>
            </View>

            <Pressable
              onPress={pickImage}
              style={{
                backgroundColor: palette.accent,
                paddingVertical: 14,
                borderRadius: 16,
              }}
            >
              <Text
                style={{ color: "white", textAlign: "center", fontWeight: "700" }}
              >
                {imageUri ? "Choose a different image" : "Choose image"}
              </Text>
            </Pressable>

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
              Calibration Inputs
            </Text>
            <Text style={{ color: palette.muted, fontSize: 13 }}>
              Enter the real-world dimensions for the reference shot, then save the result as a reusable profile.
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

            <Text
              style={{ color: palette.muted, fontSize: 12, fontWeight: "600" }}
            >
              Known distance (cm)
            </Text>
            <TextInput
              value={knownDistanceCm}
              onChangeText={setKnownDistanceCm}
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

            <Text
              style={{ color: palette.muted, fontSize: 12, fontWeight: "600" }}
            >
              Profile name
            </Text>
            <TextInput
              value={profileName}
              onChangeText={setProfileName}
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

            <Pressable
              onPress={handleCalibrationSubmit}
              disabled={loading}
              style={{
                backgroundColor: loading ? palette.accentDark : palette.accent,
                paddingVertical: 14,
                borderRadius: 16,
                marginTop: 6,
              }}
            >
              <Text
                style={{ color: "white", textAlign: "center", fontWeight: "700" }}
              >
                {loading ? "Calibrating..." : "Calibrate focal length"}
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
          <Text style={{ color: palette.muted, fontSize: 13 }}>
            Clear, readable output for the most recent calculation.
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
