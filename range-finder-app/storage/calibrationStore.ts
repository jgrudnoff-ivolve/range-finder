import AsyncStorage from "@react-native-async-storage/async-storage";
import { CalibrationProfile } from "../types";

const STORAGE_KEY = "range_finder_calibration_profiles";

export async function getCalibrationProfiles(): Promise<CalibrationProfile[]> {
  const raw = await AsyncStorage.getItem(STORAGE_KEY);
  if (!raw) return [];

  try {
    return JSON.parse(raw) as CalibrationProfile[];
  } catch {
    return [];
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