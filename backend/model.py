import torch
from torchvision.models.detection import fasterrcnn_resnet50_fpn
from torchvision import transforms
from PIL import Image
import numpy as np
from ultralytics import YOLO

CLASS_NAMES = ["__background__", "dent_marginal", "dent_unacceptable"]

MEAN = [0.25295600, 0.23075905, 0.26414612]
STD = [0.27508822, 0.25421992, 0.27524212]

_faster_transform = transforms.Compose(
    [
        transforms.Resize((512, 512)),
        transforms.ToTensor(),
        transforms.Normalize(mean=MEAN, std=STD),
    ]
)


def load_faster_model(path: str):
    model = fasterrcnn_resnet50_fpn(pretrained=False, num_classes=len(CLASS_NAMES))
    model.load_state_dict(torch.load(path, map_location="cpu"))
    model.eval()
    return model


def predict_faster(model, image: Image.Image, score_threshold=0.5):
    tensor = _faster_transform(image)
    with torch.no_grad():
        out = model([tensor])[0]
    results = []
    for box, lbl, scr in zip(out["boxes"], out["labels"], out["scores"]):
        score = scr.item()
        if score < score_threshold:
            continue
        x1, y1, x2, y2 = box.tolist()
        results.append(
            {
                "x1": x1,
                "y1": y1,
                "x2": x2,
                "y2": y2,
                "label": CLASS_NAMES[lbl.item()],
                "score": score,
            }
        )
    return results


# ----- YOLO (Video mode) -----
def load_yolo8_model(path: str):
    # loads a .pt trained with Ultralytics YOLOv8
    model = YOLO(path)
    return model


def predict_yolo8(model, image: Image.Image, conf=0.25, iou=0.45):
    # Force resize
    image_resized = image.resize((512, 512))

    # Convert to NumPy array explicitly
    image_np = np.array(image_resized)

    results = model.predict(
        source=image_np, imgsz=512, conf=conf, iou=iou, verbose=False
    )

    boxes = []
    for r in results:
        for *xyxy, conf_score, cls in r.boxes.data.tolist():
            x1, y1, x2, y2 = xyxy
            label = model.names[int(cls)]
            boxes.append(
                {
                    "x1": x1,
                    "y1": y1,
                    "x2": x2,
                    "y2": y2,
                    "label": label,
                    "score": conf_score,
                }
            )
    return boxes
