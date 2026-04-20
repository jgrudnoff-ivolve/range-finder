import { CalibrationProfile, GolfEstimateResponse } from "../types";

const DEFAULT_ONE_X_PROFILE: CalibrationProfile = {
  id: "default-1x",
  name: "Rear Camera 1.0x",
  focalLengthPixels: 2900,
  zoomLevel: 1,
  actualZoomFactor: 1,
};

const DEFAULT_THREE_X_PROFILE: CalibrationProfile = {
  id: "default-3x",
  name: "Rear Camera 3.0x",
  focalLengthPixels: 7800,
  zoomLevel: 3,
  actualZoomFactor: 3,
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

export type LiveGolfPreset = {
  id: string;
  label: string;
  focalLengthPixels: number;
  zoomFactor: number;
};

export function resolveLiveGolfPresets(profiles: CalibrationProfile[]) {
  const normalized = profiles.length > 0 ? profiles : [DEFAULT_ONE_X_PROFILE, DEFAULT_THREE_X_PROFILE];

  return [...normalized]
    .map((profile) => ({
      id: profile.id,
      label: `${(profile.actualZoomFactor ?? profile.zoomLevel ?? 1).toFixed(1)}x`,
      focalLengthPixels: profile.focalLengthPixels,
      zoomFactor: profile.actualZoomFactor ?? profile.zoomLevel ?? 1,
    }))
    .sort((a, b) => a.zoomFactor - b.zoomFactor);
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
