# YOLO Training Workspace

This folder is a dedicated workspace for training a custom YOLO model to detect golf flag poles so we can eventually auto-place the top and bottom measurement points.

## Goal

Train an object detection model that finds a `golf_flag_pole` in course images.

The main app workflow stays manual for now. This folder is only for dataset prep, training, validation, and exporting a model for later backend integration.

## Folder layout

```text
yolo-training/
  README.md
  requirements.txt
  dataset/
    golf_flag_pole.yaml
    images/
      train/
      val/
      test/
    labels/
      train/
      val/
      test/
  models/
  scripts/
    train.py
    predict.py
  runs/
```

## Recommended first version

Start with YOLO object detection, not segmentation.

Why:
- it is much faster to label
- it is enough to locate the flag pole region
- we can derive top and bottom more accurately later with post-processing or a segmentation model if needed

## Recommended model

Use `YOLO11n` as the default starting point.

Why:

- it is the best fit for still-image detection now while keeping a realistic path toward future live detection
- it trains faster while you are still improving the dataset
- it is more likely to be usable later for lower-latency inference than a larger model

If accuracy is not good enough after the dataset improves, move up to `YOLO11s`.

## Class list

Use one class to start:

- `golf_flag_pole`

If you later find the flag cloth and pole need separate treatment, we can split into more classes, but one class is the best starting point.

## Dataset format

This workspace uses standard Ultralytics YOLO detection labels:

- one image file per sample in `dataset/images/...`
- one matching `.txt` label file in `dataset/labels/...`
- each label line is:

```text
class_id x_center y_center width height
```

All box coordinates are normalized to `0..1`.

Example:

```text
0 0.521875 0.483333 0.040625 0.566667
```

## Suggested data collection rules

Collect a wide range of:

- close and far-away flags
- centered and off-center flags
- different lighting
- shadows
- partial occlusion
- trees, poles, bunker rakes, people, carts, and other confusing vertical objects

Aim for:

- at least 200 labeled images to start
- 500+ for a much more usable first detector

## Labeling rules

Draw the box around the full visible flag pole and attached flag area.

Be consistent:

- include the pole from visible top to visible bottom
- include the flag cloth if attached to the same pole
- do not include unrelated trees or shadows

## Training workflow

1. Install dependencies:

```powershell
cd C:\Users\jamesg\Documents\GitHub\range-finder\yolo-training
pip install -r requirements.txt
```

2. Put labeled images and label files into:

- `dataset/images/train`
- `dataset/images/val`
- `dataset/images/test`
- `dataset/labels/train`
- `dataset/labels/val`
- `dataset/labels/test`

3. Train:

```powershell
python scripts\train.py
```

4. Validate or predict:

```powershell
python scripts\predict.py --source path\to\image.jpg
```

## Starter hyperparameters

The starter script uses:

- base model: `yolo11n.pt`
- image size: `960`
- epochs: `100`

Why:

- `yolo11n.pt` is fast for iteration and is the best first choice if you want future live-detection support
- `960` helps with small, distant poles
- `100` is a reasonable first pass

If distant flags remain weak, try:

- `yolo11s.pt` if `YOLO11n` is not accurate enough
- `imgsz=1280`

## Exporting a trained model

After training, Ultralytics will save weights under `runs/detect/...`.

The file you usually want is:

```text
runs/detect/<run-name>/weights/best.pt
```

Copy that into:

```text
yolo-training/models/
```

## Official references

These instructions are based on current official Ultralytics docs:

- Ultralytics docs home: https://docs.ultralytics.com/
- Custom training example: https://docs.ultralytics.com/

From the docs, the core training pattern is:

```python
from ultralytics import YOLO

model = YOLO("yolo11n.pt")
model.train(data="path/to/dataset.yaml", epochs=100, imgsz=640)
```

And the CLI pattern is:

```text
yolo detect train data=path/to/dataset.yaml epochs=100 imgsz=640
```

## Next likely step

Once you have even a small labeled dataset, the next best move is to run a first training pass and inspect false positives on:

- trees
- dark shadows
- bunker edges
- other vertical poles

That will tell us whether to stay with detection or move to segmentation.

## Model strategy summary

For this project:

- use `YOLO11n` now for still-image detection
- keep improving the dataset around distant poles and hard negatives
- only move to `YOLO11s` if `YOLO11n` is still missing too many poles after data cleanup

This gives you the best chance of reusing the same model family later for near-real-time or live detection experiments.
