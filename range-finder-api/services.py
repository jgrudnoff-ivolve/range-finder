import math
from dataclasses import dataclass

MIN_LINE_PIXELS = 20
GOLF_FLAG_HEIGHT_CM = 220.0


class ServiceValidationError(ValueError):
    pass


@dataclass
class CalibrationInput:
    real_object_height_cm: float
    known_distance_cm: float
    line_x1: float
    line_y1: float
    line_x2: float
    line_y2: float
    image_width: int
    image_height: int


@dataclass
class EstimateDistanceInput:
    real_object_height_cm: float
    focal_length_pixels: float
    line_x1: float
    line_y1: float
    line_x2: float
    line_y2: float
    image_width: int
    image_height: int


@dataclass
class GolfEstimateInput:
    focal_length_pixels: float
    line_x1: float
    line_y1: float
    line_x2: float
    line_y2: float
    image_width: int
    image_height: int


def validate_positive(name, value):
    if value <= 0:
        raise ServiceValidationError(f"{name} must be > 0")


def measure_line(x1, y1, x2, y2, w, h):
    for name, val, limit in [
        ("x1", x1, w),
        ("x2", x2, w),
        ("y1", y1, h),
        ("y2", y2, h),
    ]:
        if val < 0 or val >= limit:
            raise ServiceValidationError(f"{name} is out of image bounds.")

    dx = x2 - x1
    dy = y2 - y1
    length = math.hypot(dx, dy)

    if length < MIN_LINE_PIXELS:
        raise ServiceValidationError("Measurement line too small")

    return length, dx, dy


def calculate_focal(px, dist, real):
    return (px * dist) / real


def calculate_distance(real, px, focal):
    return (real * focal) / px


def calibrate_focal_length(data: CalibrationInput):
    validate_positive("real_object_height_cm", data.real_object_height_cm)
    validate_positive("known_distance_cm", data.known_distance_cm)

    px, _, _ = measure_line(
        data.line_x1, data.line_y1,
        data.line_x2, data.line_y2,
        data.image_width, data.image_height
    )

    focal = calculate_focal(px, data.known_distance_cm, data.real_object_height_cm)

    return {
        "focal_length_pixels": round(focal, 2),
        "object_height_pixels": round(px, 2),
    }


def estimate_distance(data: EstimateDistanceInput):
    validate_positive("real_object_height_cm", data.real_object_height_cm)
    validate_positive("focal_length_pixels", data.focal_length_pixels)

    px, dx, dy = measure_line(
        data.line_x1, data.line_y1,
        data.line_x2, data.line_y2,
        data.image_width, data.image_height
    )

    dist = calculate_distance(data.real_object_height_cm, px, data.focal_length_pixels)

    return {
        "distance_cm": round(dist, 2),
        "distance_m": round(dist / 100, 3),
        "object_height_pixels": round(px, 2),
    }


def estimate_golf_distance(data: GolfEstimateInput):
    validate_positive("focal_length_pixels", data.focal_length_pixels)

    px, _, _ = measure_line(
        data.line_x1, data.line_y1,
        data.line_x2, data.line_y2,
        data.image_width, data.image_height
    )

    dist = calculate_distance(GOLF_FLAG_HEIGHT_CM, px, data.focal_length_pixels)

    return {
        "distance_cm": round(dist, 2),
        "distance_m": round(dist / 100, 3),
        "object_height_pixels": round(px, 2),
        "assumed_object_height_cm": GOLF_FLAG_HEIGHT_CM,
    }
