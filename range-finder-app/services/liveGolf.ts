import { CalibrationProfile, GolfEstimateResponse } from "../types";

const DEFAULT_ONE_X_PROFILE: CalibrationProfile = {
  id: "default-1x",
  name: "Rear Camera 1x Zoom (Default)",
  focalLengthPixels: 2900,
  zoomLevel: 1,
};

const DEFAULT_THREE_X_PROFILE: CalibrationProfile = {
  id: "default-3x",
  name: "Rear Camera 3x Zoom (Default)",
  focalLengthPixels: 7800,
  zoomLevel: 3,
};

export type LiveGolfCalibration = {
  oneX: CalibrationProfile;
  threeX: CalibrationProfile;
};

export type ProjectedGolfLine = {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  midX: number;
  midY: number;
  length: number;
  angle: number;
};

export type PreparedLiveGolfSnapshot = {
  uri: string;
  width: number;
  height: number;
};

export type LiveGolfLensMode = {
  id: "1x" | "3x";
  label: string;
  focalLengthPixels: number;
  lens: string | null;
};

function isOneXProfile(profile: CalibrationProfile) {
  if (profile.zoomLevel === 1) {
    return true;
  }
  const name = profile.name.toLowerCase();
  return profile.id === DEFAULT_ONE_X_PROFILE.id || name.includes("1x");
}

function isThreeXProfile(profile: CalibrationProfile) {
  if (profile.zoomLevel === 3) {
    return true;
  }
  const name = profile.name.toLowerCase();
  return profile.id === DEFAULT_THREE_X_PROFILE.id || name.includes("3x");
}

export function resolveLiveGolfCalibration(
  profiles: CalibrationProfile[]
): LiveGolfCalibration {
  const oneX = profiles.find(isOneXProfile) ?? DEFAULT_ONE_X_PROFILE;
  const threeX = profiles.find(isThreeXProfile) ?? DEFAULT_THREE_X_PROFILE;

  return { oneX, threeX };
}

export function resolveWideLens(availableLenses: string[]) {
  return (
    availableLenses.find((lens) => lens === "builtInWideAngleCamera") ??
    availableLenses.find((lens) => lens.toLowerCase().includes("wide")) ??
    null
  );
}

export function resolveTelephotoLens(availableLenses: string[]) {
  return (
    availableLenses.find((lens) => lens === "builtInTelephotoCamera") ??
    availableLenses.find((lens) => lens.toLowerCase().includes("telephoto")) ??
    null
  );
}

export function resolveLiveGolfLensModes(
  calibration: LiveGolfCalibration,
  availableLenses: string[],
  platform: "ios" | "android" | "web"
): LiveGolfLensMode[] {
  const modes: LiveGolfLensMode[] = [
    {
      id: "1x",
      label: "1x lens",
      focalLengthPixels: calibration.oneX.focalLengthPixels,
      lens: platform === "ios" ? resolveWideLens(availableLenses) : null,
    },
  ];

  if (platform === "ios") {
    const telephotoLens = resolveTelephotoLens(availableLenses);
    if (telephotoLens) {
      modes.push({
        id: "3x",
        label: "3x telephoto",
        focalLengthPixels: calibration.threeX.focalLengthPixels,
        lens: telephotoLens,
      });
    }
  }

  return modes;
}

export async function prepareLiveGolfSnapshot(
  frame: PreparedLiveGolfSnapshot
): Promise<PreparedLiveGolfSnapshot> {
  return frame;
}

export function projectGolfDetectionLine(params: {
  detection: GolfEstimateResponse;
  imageWidth: number;
  imageHeight: number;
  previewWidth: number;
  previewHeight: number;
}): ProjectedGolfLine | null {
  const { detection, imageWidth, imageHeight, previewWidth, previewHeight } = params;

  if (!imageWidth || !imageHeight || !previewWidth || !previewHeight) {
    return null;
  }

  const scale = Math.max(previewWidth / imageWidth, previewHeight / imageHeight);
  const renderedWidth = imageWidth * scale;
  const renderedHeight = imageHeight * scale;
  const offsetX = (previewWidth - renderedWidth) / 2;
  const offsetY = (previewHeight - renderedHeight) / 2;

  const x1 = detection.line_x1 * scale + offsetX;
  const y1 = detection.line_y1 * scale + offsetY;
  const x2 = detection.line_x2 * scale + offsetX;
  const y2 = detection.line_y2 * scale + offsetY;
  const dx = x2 - x1;
  const dy = y2 - y1;
  const length = Math.hypot(dx, dy);
  const angle = (Math.atan2(dy, dx) * 180) / Math.PI;

  return {
    x1,
    y1,
    x2,
    y2,
    midX: (x1 + x2) / 2,
    midY: (y1 + y2) / 2,
    length,
    angle,
  };
}
