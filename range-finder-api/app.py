from time import perf_counter

from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from image_utils import load_and_validate_image, validate_upload
from services import (
    CalibrationInput,
    EstimateDistanceInput,
    GolfEstimateInput,
    ServiceValidationError,
    calibrate_focal_length,
    estimate_distance,
    estimate_golf_distance,
)

app = FastAPI(title="Distance Estimator MVP")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health():
    return {"status": "ok"}


@app.post("/calibrate-focal-length")
async def calibrate_focal_length_endpoint(
    image: UploadFile = File(...),
    real_object_height_cm: float = Form(...),
    known_distance_cm: float = Form(...),
    line_x1: float = Form(...),
    line_y1: float = Form(...),
    line_x2: float = Form(...),
    line_y2: float = Form(...),
):
    file_bytes = await image.read()

    try:
        validate_upload(image.content_type, file_bytes)
        img = load_and_validate_image(file_bytes)

        result = calibrate_focal_length(
            CalibrationInput(
                real_object_height_cm,
                known_distance_cm,
                line_x1, line_y1, line_x2, line_y2,
                img.width, img.height,
            )
        )

        return JSONResponse(result)

    except ServiceValidationError as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.post("/estimate-distance")
async def estimate_distance_endpoint(
    image: UploadFile = File(...),
    real_object_height_cm: float = Form(...),
    focal_length_pixels: float = Form(...),
    line_x1: float = Form(...),
    line_y1: float = Form(...),
    line_x2: float = Form(...),
    line_y2: float = Form(...),
):
    file_bytes = await image.read()

    try:
        validate_upload(image.content_type, file_bytes)
        img = load_and_validate_image(file_bytes)

        result = estimate_distance(
            EstimateDistanceInput(
                real_object_height_cm,
                focal_length_pixels,
                line_x1, line_y1, line_x2, line_y2,
                img.width, img.height,
            )
        )

        return JSONResponse(result)

    except ServiceValidationError as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.post("/estimate-golf-distance")
async def estimate_golf_distance_endpoint(
    image: UploadFile = File(...),
    focal_length_pixels: float = Form(...),
    line_x1: float | None = Form(None),
    line_y1: float | None = Form(None),
    line_x2: float | None = Form(None),
    line_y2: float | None = Form(None),
):
    request_started = perf_counter()
    file_bytes = await image.read()
    read_ms = (perf_counter() - request_started) * 1000

    try:
        validation_started = perf_counter()
        validate_upload(image.content_type, file_bytes)
        img = load_and_validate_image(file_bytes)
        validation_ms = (perf_counter() - validation_started) * 1000

        estimate_started = perf_counter()
        result = estimate_golf_distance(
            GolfEstimateInput(
                focal_length_pixels,
                img.image,
                img.width, img.height,
                line_x1, line_y1, line_x2, line_y2,
            )
        )
        estimate_ms = (perf_counter() - estimate_started) * 1000
        total_ms = (perf_counter() - request_started) * 1000

        print(
            "[estimate-golf-distance] timing",
            {
                "read_ms": round(read_ms, 2),
                "validation_ms": round(validation_ms, 2),
                "estimate_ms": round(estimate_ms, 2),
                "total_ms": round(total_ms, 2),
                "image_width": img.width,
                "image_height": img.height,
            },
        )

        return JSONResponse(result)

    except ServiceValidationError as e:
        total_ms = (perf_counter() - request_started) * 1000
        print(
            "[estimate-golf-distance] timing failed",
            {
                "read_ms": round(read_ms, 2),
                "total_ms": round(total_ms, 2),
                "error": str(e),
            },
        )
        raise HTTPException(status_code=400, detail=str(e))
