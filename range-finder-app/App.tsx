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

import { ImageMeasurement } from "./components/ImageMeasurement";
import { ResultCard } from "./components/ResultCard";
import { calibrateFocalLength, estimateDistance } from "./services/api";
import {
  deleteCalibrationProfile,
  getCalibrationProfiles,
  saveCalibrationProfile,
} from "./storage/calibrationStore";
import { CalibrationProfile, Mode, Point } from "./types";

export default function App() {
  const [apiBaseUrl, setApiBaseUrl] = useState("http://localhost:8000");
  const [mode, setMode] = useState<Mode>("calibrate");

  const [imageUri, setImageUri] = useState<string | null>(null);
  const [imageWidth, setImageWidth] = useState(1);
  const [imageHeight, setImageHeight] = useState(1);
  const [points, setPoints] = useState<Point[]>([]);

  const [realObjectHeightCm, setRealObjectHeightCm] = useState("8.56");
  const [knownDistanceCm, setKnownDistanceCm] = useState("50");
  const [focalLengthPixels, setFocalLengthPixels] = useState("");

  const [profileName, setProfileName] = useState("Rear Camera 1x");
  const [profiles, setProfiles] = useState<CalibrationProfile[]>([]);

  const [responseText, setResponseText] = useState("No request made yet.");
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
    setResponseText("No request made yet.");
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

  async function handleSubmit() {
    if (!imageUri) {
      Alert.alert("Missing image", "Please choose an image first.");
      return;
    }

    if (points.length !== 2) {
      Alert.alert("Missing points", "Please select two points on the image.");
      return;
    }

    if (!realObjectHeightCm) {
      Alert.alert("Missing value", "Please enter the real object height.");
      return;
    }

    if (mode === "calibrate" && !knownDistanceCm) {
      Alert.alert("Missing value", "Please enter the known distance.");
      return;
    }

    if (mode === "estimate" && !focalLengthPixels) {
      Alert.alert("Missing value", "Please enter focal length pixels.");
      return;
    }

    try {
      setLoading(true);
      setResponseText("Loading...");

      if (mode === "calibrate") {
        const result = await calibrateFocalLength({
          apiBaseUrl,
          imageUri,
          realObjectHeightCm,
          knownDistanceCm,
          points,
        });

        setFocalLengthPixels(String(result.focal_length_pixels));
        setResponseText(JSON.stringify(result, null, 2));

        const profile: CalibrationProfile = {
          id: profileName.trim().toLowerCase().replace(/\s+/g, "-"),
          name: profileName,
          focalLengthPixels: result.focal_length_pixels,
        };

        await saveCalibrationProfile(profile);
        await loadProfiles();
      } else {
        const result = await estimateDistance({
          apiBaseUrl,
          imageUri,
          realObjectHeightCm,
          focalLengthPixels,
          points,
        });

        setResponseText(JSON.stringify(result, null, 2));
      }
    } catch (error: any) {
      setResponseText(error.message || "Request failed");
    } finally {
      setLoading(false);
    }
  }

  async function handleUseProfile(profile: CalibrationProfile) {
    setFocalLengthPixels(String(profile.focalLengthPixels));
  }

  async function handleDeleteProfile(profile: CalibrationProfile) {
    await deleteCalibrationProfile(profile.id);
    await loadProfiles();
  }

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: "#f5f5f5" }}
      contentContainerStyle={{ padding: 16, gap: 16 }}
    >
      <View>
        <Text style={{ fontSize: 28, fontWeight: "700", marginBottom: 4 }}>
          Range Finder
        </Text>
        <Text style={{ color: "#666" }}>
          Calibrate once per device and zoom level, then estimate distance from photos.
        </Text>
      </View>

      <View
        style={{
          backgroundColor: "white",
          borderRadius: 16,
          padding: 16,
          borderWidth: 1,
          borderColor: "#e5e5e5",
        }}
      >
        <Text style={{ fontWeight: "600", marginBottom: 8 }}>API base URL</Text>
        <TextInput
          value={apiBaseUrl}
          onChangeText={setApiBaseUrl}
          autoCapitalize="none"
          style={{
            borderWidth: 1,
            borderColor: "#ccc",
            borderRadius: 12,
            paddingHorizontal: 12,
            paddingVertical: 12,
          }}
        />

        <View style={{ flexDirection: "row", gap: 8, marginTop: 12 }}>
          <Pressable
            onPress={() => setMode("calibrate")}
            style={{
              flex: 1,
              paddingVertical: 12,
              borderRadius: 12,
              backgroundColor: mode === "calibrate" ? "#111" : "#e5e5e5",
            }}
          >
            <Text
              style={{
                textAlign: "center",
                color: mode === "calibrate" ? "white" : "black",
                fontWeight: "600",
              }}
            >
              Calibrate
            </Text>
          </Pressable>

          <Pressable
            onPress={() => setMode("estimate")}
            style={{
              flex: 1,
              paddingVertical: 12,
              borderRadius: 12,
              backgroundColor: mode === "estimate" ? "#111" : "#e5e5e5",
            }}
          >
            <Text
              style={{
                textAlign: "center",
                color: mode === "estimate" ? "white" : "black",
                fontWeight: "600",
              }}
            >
              Estimate
            </Text>
          </Pressable>
        </View>
      </View>

      <View
        style={{
          backgroundColor: "white",
          borderRadius: 16,
          padding: 16,
          borderWidth: 1,
          borderColor: "#e5e5e5",
          gap: 12,
        }}
      >
        <Pressable
          onPress={pickImage}
          style={{
            backgroundColor: "#111",
            paddingVertical: 12,
            borderRadius: 12,
          }}
        >
          <Text
            style={{ color: "white", textAlign: "center", fontWeight: "600" }}
          >
            Choose image
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
          backgroundColor: "white",
          borderRadius: 16,
          padding: 16,
          borderWidth: 1,
          borderColor: "#e5e5e5",
          gap: 10,
        }}
      >
        <Text style={{ fontWeight: "600" }}>Inputs</Text>

        <Text style={{ color: "#666", fontSize: 12 }}>Real object height (cm)</Text>
        <TextInput
          value={realObjectHeightCm}
          onChangeText={setRealObjectHeightCm}
          keyboardType="decimal-pad"
          style={{
            borderWidth: 1,
            borderColor: "#ccc",
            borderRadius: 12,
            paddingHorizontal: 12,
            paddingVertical: 12,
          }}
        />

        {mode === "calibrate" ? (
          <>
            <Text style={{ color: "#666", fontSize: 12 }}>
              Known distance (cm)
            </Text>
            <TextInput
              value={knownDistanceCm}
              onChangeText={setKnownDistanceCm}
              keyboardType="decimal-pad"
              style={{
                borderWidth: 1,
                borderColor: "#ccc",
                borderRadius: 12,
                paddingHorizontal: 12,
                paddingVertical: 12,
              }}
            />

            <Text style={{ color: "#666", fontSize: 12 }}>Profile name</Text>
            <TextInput
              value={profileName}
              onChangeText={setProfileName}
              style={{
                borderWidth: 1,
                borderColor: "#ccc",
                borderRadius: 12,
                paddingHorizontal: 12,
                paddingVertical: 12,
              }}
            />
          </>
        ) : (
          <>
            <Text style={{ color: "#666", fontSize: 12 }}>
              Focal length (pixels)
            </Text>
            <TextInput
              value={focalLengthPixels}
              onChangeText={setFocalLengthPixels}
              keyboardType="decimal-pad"
              style={{
                borderWidth: 1,
                borderColor: "#ccc",
                borderRadius: 12,
                paddingHorizontal: 12,
                paddingVertical: 12,
              }}
            />
            {selectedProfile ? (
              <Text style={{ fontSize: 12, color: "#666" }}>
                Selected profile: {selectedProfile.name}
              </Text>
            ) : null}
          </>
        )}

        <Pressable
          onPress={handleSubmit}
          disabled={loading}
          style={{
            backgroundColor: "#111",
            paddingVertical: 12,
            borderRadius: 12,
            marginTop: 4,
          }}
        >
          <Text
            style={{ color: "white", textAlign: "center", fontWeight: "600" }}
          >
            {loading
              ? "Submitting..."
              : mode === "calibrate"
              ? "Calibrate focal length"
              : "Estimate distance"}
          </Text>
        </Pressable>
      </View>

      <View
        style={{
          backgroundColor: "white",
          borderRadius: 16,
          padding: 16,
          borderWidth: 1,
          borderColor: "#e5e5e5",
          gap: 8,
        }}
      >
        <Text style={{ fontWeight: "600" }}>Saved calibration profiles</Text>

        {profiles.length === 0 ? (
          <Text style={{ color: "#666" }}>No saved profiles yet.</Text>
        ) : (
          profiles.map((profile) => (
            <View
              key={profile.id}
              style={{
                borderWidth: 1,
                borderColor: "#e5e5e5",
                borderRadius: 12,
                padding: 12,
                gap: 8,
              }}
            >
              <Text style={{ fontWeight: "600" }}>{profile.name}</Text>
              <Text style={{ color: "#666" }}>
                {profile.focalLengthPixels} px
              </Text>

              <View style={{ flexDirection: "row", gap: 8 }}>
                <Pressable
                  onPress={() => handleUseProfile(profile)}
                  style={{
                    flex: 1,
                    backgroundColor: "#111",
                    paddingVertical: 10,
                    borderRadius: 10,
                  }}
                >
                  <Text
                    style={{
                      color: "white",
                      textAlign: "center",
                      fontWeight: "600",
                    }}
                  >
                    Use
                  </Text>
                </Pressable>

                <Pressable
                  onPress={() => handleDeleteProfile(profile)}
                  style={{
                    flex: 1,
                    backgroundColor: "#e5e5e5",
                    paddingVertical: 10,
                    borderRadius: 10,
                  }}
                >
                  <Text
                    style={{
                      textAlign: "center",
                      fontWeight: "600",
                    }}
                  >
                    Delete
                  </Text>
                </Pressable>
              </View>
            </View>
          ))
        )}
      </View>

      <ResultCard title="Response" content={responseText} />
    </ScrollView>
  );
}