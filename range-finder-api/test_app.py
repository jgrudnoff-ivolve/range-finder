from fastapi.testclient import TestClient
from app import app
from PIL import Image
import io

client = TestClient(app)

def make_img():
    img = Image.new("RGB", (800, 600))
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