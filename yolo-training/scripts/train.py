from pathlib import Path

from ultralytics import YOLO


ROOT = Path(__file__).resolve().parents[1]
DATASET_YAML = ROOT / "dataset" / "golf_flag_pole.yaml"
RUNS_DIR = ROOT / "runs"


def main():
    # Start with YOLO11n because it is the best default if we want
    # a future path toward lower-latency or live detection.
    model = YOLO("yolo11n.pt")
    model.train(
        data=str(DATASET_YAML),
        epochs=100,
        imgsz=960,
        batch=16,
        project=str(RUNS_DIR),
        name="golf-flag-pole",
        exist_ok=True,
    )


if __name__ == "__main__":
    main()
