import { CalibrationProfile, GolfEstimateResponse } from "../types";

const DEFAULT_ONE_X_PROFILE: CalibrationProfile = {
  id: "default-1x",
  name: "Rear Camera 1x Zoom (Default)",
  focalLengthPixels: 2900,
};

const DEFAULT_THREE_X_PROFILE: CalibrationProfile = {
  id: "default-3x",
  name: "Rear Camera 3x Zoom (Default)",
  focalLengthPixels: 7800,
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

function isOneXProfile(profile: CalibrationProfile) {
  const name = profile.name.toLowerCase();
  return profile.id === DEFAULT_ONE_X_PROFILE.id || name.includes("1x");
}

function isThreeXProfile(profile: CalibrationProfile) {
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

export function clampZoomFactor(zoomFactor: number) {
  return Math.min(3, Math.max(1, zoomFactor));
}

export function zoomFactorToCameraZoom(zoomFactor: number) {
  return (clampZoomFactor(zoomFactor) - 1) / 2;
}

export function interpolateLiveGolfFocalLength(
  calibration: LiveGolfCalibration,
  zoomFactor: number
) {
  const clampedZoom = clampZoomFactor(zoomFactor);
  return clampedZoom < 2 ? calibration.oneX.focalLengthPixels : calibration.threeX.focalLengthPixels;
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
