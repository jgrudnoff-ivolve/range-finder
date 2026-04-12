export type Point = {
  x: number;
  y: number;
};

export type Mode = "calibrate" | "estimate";

export type CalibrationProfile = {
  id: string;
  name: string;
  focalLengthPixels: number;
};

export type CalibrationResponse = {
  focal_length_pixels: number;
  object_height_pixels: number;
};

export type EstimateResponse = {
  distance_cm: number;
  distance_m: number;
  object_height_pixels: number;
  confidence?: string;
  warnings?: string[];
};