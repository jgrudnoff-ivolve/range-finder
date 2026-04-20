import AsyncStorage from "@react-native-async-storage/async-storage";
import { CalibrationProfile } from "../types";

const STORAGE_KEY = "range_finder_calibration_profiles";

function inferZoomLevel(profile: CalibrationProfile): number | undefined {
  if (typeof profile.zoomLevel === "number" && profile.zoomLevel > 0) {
    return profile.zoomLevel;
  }

  const normalized = `${profile.id} ${profile.name}`.toLowerCase();
  const zoomMatch = normalized.match(/(\d+(?:\.\d+)?)x/);
  if (zoomMatch) {
    return Number(zoomMatch[1]);
  }
  if (normalized.includes("telephoto")) return 3;
  if (normalized.includes("wide")) return 1;

  return undefined;
}

function normalizeProfile(profile: CalibrationProfile): CalibrationProfile {
  const zoomLevel = inferZoomLevel(profile);
  return {
    ...profile,
    zoomLevel,
    actualZoomFactor:
      profile.actualZoomFactor ?? (zoomLevel === 1 || zoomLevel === 3 ? zoomLevel : undefined),
  };
}

export async function getCalibrationProfiles(): Promise<CalibrationProfile[]> {
  const raw = await AsyncStorage.getItem(STORAGE_KEY);
  if (!raw) {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify([]));
    return [];
  }

  try {
    return (JSON.parse(raw) as CalibrationProfile[]).map(normalizeProfile);
  } catch {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify([]));
    return [];
  }
}

export async function saveCalibrationProfile(
  profile: CalibrationProfile
): Promise<void> {
  const profiles = await getCalibrationProfiles();
  const normalizedProfile = normalizeProfile(profile);

  const existingIndex = profiles.findIndex((p) => p.id === normalizedProfile.id);
  if (existingIndex >= 0) {
    profiles[existingIndex] = normalizedProfile;
  } else {
    profiles.push(normalizedProfile);
  }

  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(profiles));
}

export async function deleteCalibrationProfile(id: string): Promise<void> {
  const profiles = await getCalibrationProfiles();
  const updated = profiles.filter((p) => p.id !== id);
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
}
