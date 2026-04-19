from services import *
from PIL import Image, ImageDraw
from unittest.mock import patch

def test_line_measure():
    px, _, _ = measure_line(0, 0, 0, 200, 800, 600)
    assert px == 200

def test_focal():
    assert calculate_focal(240, 50, 5) == 2400

def test_distance():
    assert calculate_distance(5, 120, 2400) == 100

def test_estimate_golf_distance():
    img = Image.new("RGB", (800, 600), (80, 150, 80))
    draw = ImageDraw.Draw(img)
    draw.rectangle((395, 120, 401, 500), fill=(245, 245, 245))
    draw.polygon([(401, 120), (480, 150), (401, 180)], fill=(210, 50, 50))

    result = estimate_golf_distance(
        GolfEstimateInput(
            focal_length_pixels=2400,
            image=img,
            line_x1=398.0,
            line_y1=120.0,
            line_x2=398.0,
            line_y2=500.0,
            image_width=800,
            image_height=600,
        )
    )

    assert result["distance_cm"] > 0
    assert result["assumed_object_height_cm"] == 213.0
    assert result["object_height_pixels"] > 0


def test_estimate_golf_distance_with_roboflow_detection():
    img = Image.new("RGB", (800, 600), (80, 150, 80))

    with patch(
        "services.detect_golf_flag_line_from_roboflow",
        return_value={
            "line_x1": 398.0,
            "line_y1": 120.0,
            "line_x2": 398.0,
            "line_y2": 500.0,
            "confidence": 0.87,
            "class": "flagpole",
        },
    ):
        result = estimate_golf_distance(
            GolfEstimateInput(
                focal_length_pixels=2400,
                image=img,
                image_width=800,
                image_height=600,
            )
        )

    assert result["distance_cm"] > 0
    assert result["assumed_object_height_cm"] == 213.0
