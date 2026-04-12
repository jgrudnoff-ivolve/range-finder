from fastapi.testclient import TestClient
from app import app
from PIL import Image, ImageDraw
import io

client = TestClient(app)

def make_img():
    img = Image.new("RGB", (800, 600))
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    return buf.getvalue()

def make_golf_img():
    img = Image.new("RGB", (800, 600), (80, 150, 80))
    draw = ImageDraw.Draw(img)
    draw.rectangle((395, 120, 401, 500), fill=(245, 245, 245))
    draw.polygon([(401, 120), (480, 150), (401, 180)], fill=(210, 50, 50))
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    return buf.getvalue()

def test_health():
    r = client.get("/health")
    assert r.status_code == 200

def test_estimate():
    r = client.post(
        "/estimate-distance",
        files={"image": ("img.png", make_img(), "image/png")},
        data={
            "real_object_height_cm": "5",
            "focal_length_pixels": "2400",
            "line_x1": "0",
            "line_y1": "0",
            "line_x2": "0",
            "line_y2": "120",
        },
    )
    assert r.status_code == 200

def test_estimate_golf():
    r = client.post(
        "/estimate-golf-distance",
        files={"image": ("golf.png", make_golf_img(), "image/png")},
        data={
            "focal_length_pixels": "2400",
            "line_x1": "398",
            "line_y1": "120",
            "line_x2": "398",
            "line_y2": "500",
        },
    )
    assert r.status_code == 200
    data = r.json()
    assert data["distance_cm"] > 0
    assert data["assumed_object_height_cm"] == 220.0
    assert data["object_height_pixels"] > 0
