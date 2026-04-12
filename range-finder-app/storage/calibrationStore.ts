import AsyncStorage from "@react-native-async-storage/async-storage";
import { CalibrationProfile } from "../types";

const STORAGE_KEY = "range_finder_calibration_profiles";
const DEFAULT_PROFILES: CalibrationProfile[] = [
  {
    id: "default-1x",
    name: "Rear Camera 1x Zoom (Default)",
    focalLengthPixels: 2900,
  },
  {
    id: "default-3x",
    name: "Rear Camera 3x Zoom (Default)",
    focalLengthPixels: 7800,
  },
];

export async function getCalibrationProfiles(): Promise<CalibrationProfile[]> {
  const raw = await AsyncStorage.getItem(STORAGE_KEY);
  if (!raw) {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_PROFILES));
    return DEFAULT_PROFILES;
  }

  try {
    const storedProfiles = JSON.parse(raw) as CalibrationProfile[];
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

  const existingIndex = profiles.findIndex((p) => p.id === profile.id);
  if (existingIndex >= 0) {
    profiles[existingIndex] = profile;
  } else {
    profiles.push(profile);
  }

  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(profiles));
}

export async function deleteCalibrationProfile(id: string): Promise<void> {
  const profiles = await getCalibrationProfiles();
  const updated = profiles.filter((p) => p.id !== id);
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
}
