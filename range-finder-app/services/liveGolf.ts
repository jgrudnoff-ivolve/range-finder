import { Platform } from "react-native";

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

export type PreparedLiveGolfSnapshot = {
  uri: string;
  width: number;
  height: number;
};

const LIVE_GOLF_CAMERA_ZOOM_BY_PLATFORM = {
  native: {
    1: 0,
    3: 0,
  },
  web: {
    1: 0,
    3: 0,
  },
} as const;

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
  const clampedZoom = clampZoomFactor(zoomFactor);
  const platformConfig =
    Platform.OS === "web"
      ? LIVE_GOLF_CAMERA_ZOOM_BY_PLATFORM.web
      : LIVE_GOLF_CAMERA_ZOOM_BY_PLATFORM.native;

  return platformConfig[clampedZoom as keyof typeof platformConfig] ?? 0;
}

export function getSupportedLiveGolfZoomSteps() {
  return [1, 3];
}

export function getLiveGolfPreviewScale(zoomFactor: number) {
  return Platform.OS === "web" ? clampZoomFactor(zoomFactor) : 1;
}

export async function prepareLiveGolfSnapshot(
  frame: PreparedLiveGolfSnapshot,
  zoomFactor: number
): Promise<PreparedLiveGolfSnapshot> {
  const clampedZoom = clampZoomFactor(zoomFactor);

  if (Platform.OS !== "web" || clampedZoom <= 1) {
    return frame;
  }

  return cropWebSnapshot(frame, clampedZoom);
}

async function cropWebSnapshot(
  frame: PreparedLiveGolfSnapshot,
  zoomFactor: number
): Promise<PreparedLiveGolfSnapshot> {
  const image = await loadBrowserImage(frame.uri);
  const cropWidth = image.width / zoomFactor;
  const cropHeight = image.height / zoomFactor;
  const cropX = (image.width - cropWidth) / 2;
  const cropY = (image.height - cropHeight) / 2;

  const canvas = document.createElement("canvas");
  canvas.width = image.width;
  canvas.height = image.height;

  const context = canvas.getContext("2d");
  if (!context) {
    throw new Error("Could not prepare zoomed snapshot.");
  }

  context.drawImage(
    image,
    cropX,
    cropY,
    cropWidth,
    cropHeight,
    0,
    0,
    image.width,
    image.height
  );

  return {
    uri: canvas.toDataURL("image/jpeg", 0.82),
    width: image.width,
    height: image.height,
  };
}

function loadBrowserImage(uri: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new window.Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Could not load captured snapshot."));
    image.src = uri;
  });
}

export function interpolateLiveGolfFocalLength(
  calibration: LiveGolfCalibration,
  zoomFactor: number
) {
  const clampedZoom = clampZoomFactor(zoomFactor);
  return calibration.oneX.focalLengthPixels * clampedZoom;
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
