import io
from dataclasses import dataclass
from PIL import Image, ImageOps

from services import ServiceValidationError

ALLOWED_CONTENT_TYPES = {"image/jpeg", "image/png", "image/webp"}
MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024
MIN_IMAGE_DIMENSION = 200


@dataclass(frozen=True)
class LoadedImage:
    width: int
    height: int
    image: Image.Image


def validate_upload(content_type: str | None, file_bytes: bytes):
    if content_type not in ALLOWED_CONTENT_TYPES:
        raise ServiceValidationError("Unsupported content type")

    if len(file_bytes) > MAX_FILE_SIZE_BYTES:
        raise ServiceValidationError("File too large")


def load_and_validate_image(file_bytes: bytes) -> LoadedImage:
    try:
        image = Image.open(io.BytesIO(file_bytes))
        image = ImageOps.exif_transpose(image)
        image.load()
    except Exception:
        raise ServiceValidationError("Invalid image")

    w, h = image.size

    if w < MIN_IMAGE_DIMENSION or h < MIN_IMAGE_DIMENSION:
        raise ServiceValidationError("Image too small")

    return LoadedImage(w, h, image.convert("RGB"))
