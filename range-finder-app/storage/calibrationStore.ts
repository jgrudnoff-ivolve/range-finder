import AsyncStorage from "@react-native-async-storage/async-storage";
import { CalibrationProfile } from "../types";

const STORAGE_KEY = "range_finder_calibration_profiles";
const DEFAULT_PROFILES: CalibrationProfile[] = [
  {
    id: "default-1x",
    name: "Rear Camera 1x Zoom (Default)",
    focalLengthPixels: 2900,
    zoomLevel: 1,
    actualZoomFactor: 1,
  },
  {
    id: "default-3x",
    name: "Rear Camera 3x Zoom (Default)",
    focalLengthPixels: 7800,
    zoomLevel: 3,
    actualZoomFactor: 3,
  },
];

function inferZoomLevel(profile: CalibrationProfile): 1 | 3 | undefined {
  if (profile.zoomLevel === 1 || profile.zoomLevel === 3) {
    return profile.zoomLevel;
  }

  const normalized = `${profile.id} ${profile.name}`.toLowerCase();
  if (normalized.includes("3x") || normalized.includes("telephoto")) {
    return 3;
  }
  if (normalized.includes("1x") || normalized.includes("wide")) {
    return 1;
  }

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
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_PROFILES));
    return DEFAULT_PROFILES;
  }

  try {
    const storedProfiles = (JSON.parse(raw) as CalibrationProfile[]).map(normalizeProfile);
    const mergedProfiles = [...storedProfiles];

    for (const defaultProfile of DEFAULT_PROFILES) {
      if (!mergedProfiles.some((profile) => profile.id === defaultProfile.id)) {
        mergedProfiles.unshift(defaultProfile);
      }
    }

    if (mergedProfiles.length !== storedProfiles.length) {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(mergedProfiles));
    }

    return mergedProfiles;
  } catch {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_PROFILES));
    return DEFAULT_PROFILES;
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
