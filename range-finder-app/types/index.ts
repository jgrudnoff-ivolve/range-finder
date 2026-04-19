export type Point = {
  x: number;
  y: number;
};

export type Mode = "calibrate" | "estimate";

export type CalibrationProfile = {
  id: string;
  name: string;
  focalLengthPixels: number;
  zoomLevel?: 1 | 3;
  actualZoomFactor?: number;
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

export type GolfEstimateResponse = EstimateResponse & {
  assumed_object_height_cm: number;
  line_x1: number;
  line_y1: number;
  line_x2: number;
  line_y2: number;
};
