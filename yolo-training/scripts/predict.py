import argparse
from pathlib import Path

from ultralytics import YOLO


ROOT = Path(__file__).resolve().parents[1]
DEFAULT_MODEL = ROOT / "models" / "best.pt"
DEFAULT_OUTPUT = ROOT / "runs" / "predict"


def parse_args():
    parser = argparse.ArgumentParser(description="Run prediction with a trained golf flag pole model.")
    parser.add_argument("--source", required=True, help="Path to an image or directory of images.")
    parser.add_argument(
        "--model",
        default=str(DEFAULT_MODEL),
        help="Path to a trained .pt model. Defaults to yolo-training/models/best.pt",
    )
    return parser.parse_args()


def main():
    args = parse_args()
    model = YOLO(args.model)
    model.predict(
        source=args.source,
        imgsz=960,
        conf=0.25,
        project=str(DEFAULT_OUTPUT),
        name="latest",
        exist_ok=True,
        save=True,
    )


if __name__ == "__main__":
    main()
