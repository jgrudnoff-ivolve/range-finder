import { Platform } from "react-native";

import {
  CalibrationResponse,
  EstimateResponse,
  GolfEstimateResponse,
  Point,
} from "../types";

type CalibrateInput = {
  apiBaseUrl: string;
  imageUri: string;
  realObjectHeightCm: string;
  knownDistanceCm: string;
  points: Point[];
};

type EstimateInput = {
  apiBaseUrl: string;
  imageUri: string;
  realObjectHeightCm: string;
  focalLengthPixels: string;
  points: Point[];
};

type GolfEstimateInput = {
  apiBaseUrl: string;
  imageUri: string;
  focalLengthPixels: string;
  zoomFactor?: string;
};

function inferMimeType(imageUri: string) {
  const normalizedUri = imageUri.toLowerCase();

  if (normalizedUri.endsWith(".png")) return "image/png";
  if (normalizedUri.endsWith(".webp")) return "image/webp";
  return "image/jpeg";
}

function inferFileName(imageUri: string) {
  const cleanUri = imageUri.split("?")[0];
  const parts = cleanUri.split("/");
  const lastPart = parts[parts.length - 1];

  if (lastPart && lastPart.includes(".")) {
    return lastPart;
  }

  const mimeType = inferMimeType(imageUri);
  const extension = mimeType === "image/png" ? "png" : mimeType === "image/webp" ? "webp" : "jpg";
  return `photo.${extension}`;
}

async function createImageFormPart(imageUri: string) {
  const name = inferFileName(imageUri);
  const type = inferMimeType(imageUri);

  if (Platform.OS === "web") {
    const response = await fetch(imageUri);
    const blob = await response.blob();
    return new File([blob], name, { type: blob.type || type });
  }

  return {
    uri: imageUri,
    name,
    type,
  } as any;
}

export async function calibrateFocalLength(
  input: CalibrateInput
): Promise<CalibrationResponse> {
  const formData = new FormData();

  formData.append("image", await createImageFormPart(input.imageUri));
  formData.append("line_x1", String(input.points[0].x));
  formData.append("line_y1", String(input.points[0].y));
  formData.append("line_x2", String(input.points[1].x));
  formData.append("line_y2", String(input.points[1].y));
  formData.append("real_object_height_cm", input.realObjectHeightCm);
  formData.append("known_distance_cm", input.knownDistanceCm);

  const response = await fetch(
    `${input.apiBaseUrl}/calibrate-focal-length`,
    {
      method: "POST",
      body: formData,
    }
  );

  const text = await response.text();
  let data: any;

  try {
    data = JSON.parse(text);
  } catch {
    throw new Error(text || "Invalid response from server");
  }

  if (!response.ok) {
    throw new Error(data?.detail || "Calibration failed");
  }

  return data;
}

export async function estimateDistance(
  input: EstimateInput
): Promise<EstimateResponse> {
  const formData = new FormData();

  formData.append("image", await createImageFormPart(input.imageUri));
  formData.append("line_x1", String(input.points[0].x));
  formData.append("line_y1", String(input.points[0].y));
  formData.append("line_x2", String(input.points[1].x));
  formData.append("line_y2", String(input.points[1].y));
  formData.append("real_object_height_cm", input.realObjectHeightCm);
  formData.append("focal_length_pixels", input.focalLengthPixels);

  const response = await fetch(
    `${input.apiBaseUrl}/estimate-distance`,
    {
      method: "POST",
      body: formData,
    }
  );

  const text = await response.text();
  let data: any;

  try {
    data = JSON.parse(text);
  } catch {
    throw new Error(text || "Invalid response from server");
  }

  if (!response.ok) {
    throw new Error(data?.detail || "Distance estimation failed");
  }

  return data;
}

export async function estimateGolfDistance(
  input: GolfEstimateInput
): Promise<GolfEstimateResponse> {
  const formData = new FormData();

  formData.append("image", await createImageFormPart(input.imageUri));
  formData.append("focal_length_pixels", input.focalLengthPixels);
  if (input.zoomFactor) {
    formData.append("zoom_factor", input.zoomFactor);
  }

  const response = await fetch(
    `${input.apiBaseUrl}/estimate-golf-distance`,
    {
      method: "POST",
      body: formData,
    }
  );

  const text = await response.text();
  let data: any;

  try {
    data = JSON.parse(text);
  } catch {
    throw new Error(text || "Invalid response from server");
  }

  if (!response.ok) {
    throw new Error(data?.detail || "Golf distance estimation failed");
  }

  return data;
}
