import math
import os
import tempfile
from dataclasses import dataclass
from typing import Optional

from PIL import Image
import numpy as np

MIN_LINE_PIXELS = 20
GOLF_FLAG_HEIGHT_CM = 213.0
CHECKERBOARD_PATTERN_SIZE = (9, 6)


class ServiceValidationError(ValueError):
    pass


@dataclass
class CalibrationInput:
    image: Image.Image
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
    image: Image.Image
    image_width: int
    image_height: int
    zoom_factor: float = 1.0
    line_x1: Optional[float] = None
    line_y1: Optional[float] = None
    line_x2: Optional[float] = None
    line_y2: Optional[float] = None


ROBOFLOW_API_URL = os.environ.get("ROBOFLOW_API_URL", "https://serverless.roboflow.com")
ROBOFLOW_API_KEY = os.environ.get("ROBOFLOW_API_KEY", "p1YmnoubC9Pf6kKWsRf4")
ROBOFLOW_MODEL_ID = os.environ.get("ROBOFLOW_MODEL_ID", "find-flagpole-3/4")
ROBOFLOW_MAX_IMAGE_DIMENSION = int(os.environ.get("ROBOFLOW_MAX_IMAGE_DIMENSION", "1280"))
ROBOFLOW_JPEG_QUALITY = int(os.environ.get("ROBOFLOW_JPEG_QUALITY", "70"))

_roboflow_client = None


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


def crop_image_for_zoom(image: Image.Image, zoom_factor: float):
    if zoom_factor <= 1:
        return image, 0.0, 0.0

    crop_width = image.width / zoom_factor
    crop_height = image.height / zoom_factor
    left = (image.width - crop_width) / 2
    top = (image.height - crop_height) / 2
    right = left + crop_width
    bottom = top + crop_height

    return image.crop((left, top, right, bottom)), left, top


def get_roboflow_client():
    global _roboflow_client

    if _roboflow_client is None:
        try:
            from inference_sdk import InferenceHTTPClient
        except Exception as exc:
            raise ServiceValidationError(
                "Roboflow inference is not installed. Install backend requirements to enable auto detection."
            ) from exc

        _roboflow_client = InferenceHTTPClient(
            api_url=ROBOFLOW_API_URL,
            api_key=ROBOFLOW_API_KEY,
        )

    return _roboflow_client


def detect_golf_flag_line_from_roboflow(image: Image.Image, zoom_factor: float = 1.0):
    client = get_roboflow_client()

    working_image = image.convert("RGB")
    working_image, crop_offset_x, crop_offset_y = crop_image_for_zoom(
        working_image,
        zoom_factor,
    )
    scale = 1.0
    max_dimension = max(working_image.size)
    if max_dimension > ROBOFLOW_MAX_IMAGE_DIMENSION:
        scale = ROBOFLOW_MAX_IMAGE_DIMENSION / max_dimension
        resized_width = max(1, round(working_image.width * scale))
        resized_height = max(1, round(working_image.height * scale))
        working_image = working_image.resize((resized_width, resized_height))

    temp_path = None
    try:
        with tempfile.NamedTemporaryFile(suffix=".jpg", delete=False) as temp_file:
            temp_path = temp_file.name
        working_image.save(
            temp_path,
            format="JPEG",
            quality=ROBOFLOW_JPEG_QUALITY,
            optimize=True,
        )
        result = client.infer(temp_path, model_id=ROBOFLOW_MODEL_ID)
    except Exception as exc:
        raise ServiceValidationError("Roboflow inference failed.") from exc
    finally:
        if temp_path and os.path.exists(temp_path):
            os.remove(temp_path)

    predictions = result.get("predictions") or []
    if not predictions:
        raise ServiceValidationError("No flagpole detected in the image.")

    best_prediction = max(predictions, key=lambda prediction: prediction.get("confidence", 0))

    inverse_scale = 1 / scale
    center_x = float(best_prediction["x"]) * inverse_scale + crop_offset_x
    center_y = float(best_prediction["y"]) * inverse_scale + crop_offset_y
    width = float(best_prediction["width"]) * inverse_scale
    height = float(best_prediction["height"]) * inverse_scale

    x1 = center_x
    y1 = center_y - (height / 2)
    x2 = center_x
    y2 = center_y + (height / 2)

    return {
        "line_x1": x1,
        "line_y1": y1,
        "line_x2": x2,
        "line_y2": y2,
        "confidence": best_prediction.get("confidence"),
        "class": best_prediction.get("class"),
    }


def calibrate_focal_length(data: CalibrationInput):
    try:
        import cv2
    except Exception as exc:
        raise ServiceValidationError(
            "Checkerboard calibration requires OpenCV on the backend."
        ) from exc

    grayscale = np.array(data.image.convert("L"))
    corners = None

    if hasattr(cv2, "findChessboardCornersSB"):
        found, sb_corners = cv2.findChessboardCornersSB(
            grayscale,
            CHECKERBOARD_PATTERN_SIZE,
        )
        if found:
            corners = sb_corners.astype(np.float32)
    else:
        found = False

    if corners is None:
        found, detected_corners = cv2.findChessboardCorners(
            grayscale,
            CHECKERBOARD_PATTERN_SIZE,
            cv2.CALIB_CB_ADAPTIVE_THRESH | cv2.CALIB_CB_NORMALIZE_IMAGE,
        )
        if not found:
            raise ServiceValidationError(
                "Could not find the checkerboard. Use a clear, centered checkerboard photo."
            )

        criteria = (
            cv2.TERM_CRITERIA_EPS + cv2.TERM_CRITERIA_MAX_ITER,
            30,
            0.001,
        )
        corners = cv2.cornerSubPix(
            grayscale,
            detected_corners,
            (11, 11),
            (-1, -1),
            criteria,
        )

    object_points = np.zeros(
        (CHECKERBOARD_PATTERN_SIZE[0] * CHECKERBOARD_PATTERN_SIZE[1], 3),
        np.float32,
    )
    object_points[:, :2] = np.mgrid[
        0:CHECKERBOARD_PATTERN_SIZE[0],
        0:CHECKERBOARD_PATTERN_SIZE[1],
    ].T.reshape(-1, 2)

    initial_camera_matrix = np.array(
        [
            [max(data.image_width, data.image_height), 0, data.image_width / 2],
            [0, max(data.image_width, data.image_height), data.image_height / 2],
            [0, 0, 1],
        ],
        dtype=np.float64,
    )
    initial_distortion = np.zeros((5, 1), dtype=np.float64)

    reprojection_error, camera_matrix, _, _, _ = cv2.calibrateCamera(
        [object_points],
        [corners],
        (data.image_width, data.image_height),
        initial_camera_matrix,
        initial_distortion,
        flags=
        cv2.CALIB_USE_INTRINSIC_GUESS
        | cv2.CALIB_FIX_PRINCIPAL_POINT
        | cv2.CALIB_ZERO_TANGENT_DIST
        | cv2.CALIB_FIX_K1
        | cv2.CALIB_FIX_K2
        | cv2.CALIB_FIX_K3
        | cv2.CALIB_FIX_K4
        | cv2.CALIB_FIX_K5
        | cv2.CALIB_FIX_K6,
    )

    focal = float((camera_matrix[0, 0] + camera_matrix[1, 1]) / 2)
    checkerboard_height_pixels = float(
        corners[:, 0, 1].max() - corners[:, 0, 1].min()
    )

    return {
        "focal_length_pixels": round(focal, 2),
        "object_height_pixels": round(checkerboard_height_pixels, 2),
        "reprojection_error": round(float(reprojection_error), 4),
        "checkerboard_pattern": f"{CHECKERBOARD_PATTERN_SIZE[0]}x{CHECKERBOARD_PATTERN_SIZE[1]}",
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

    if None in (data.line_x1, data.line_y1, data.line_x2, data.line_y2):
        detected_line = detect_golf_flag_line_from_roboflow(data.image, data.zoom_factor)
        line_x1 = detected_line["line_x1"]
        line_y1 = detected_line["line_y1"]
        line_x2 = detected_line["line_x2"]
        line_y2 = detected_line["line_y2"]
    else:
        line_x1 = data.line_x1
        line_y1 = data.line_y1
        line_x2 = data.line_x2
        line_y2 = data.line_y2

    px, _, _ = measure_line(
        line_x1, line_y1,
        line_x2, line_y2,
        data.image_width, data.image_height
    )

    dist = calculate_distance(GOLF_FLAG_HEIGHT_CM, px, data.focal_length_pixels)

    return {
        "distance_cm": round(dist, 2),
        "distance_m": round(dist / 100, 3),
        "object_height_pixels": round(px, 2),
        "assumed_object_height_cm": GOLF_FLAG_HEIGHT_CM,
        "line_x1": round(line_x1, 2),
        "line_y1": round(line_y1, 2),
        "line_x2": round(line_x2, 2),
        "line_y2": round(line_y2, 2),
    }
