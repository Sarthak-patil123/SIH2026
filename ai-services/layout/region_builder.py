from typing import Union
import cv2
import numpy as np


def build_regions(img: Union[np.ndarray, str], detections: list) -> dict:
    if isinstance(img, str):
        img = cv2.imread(img)
    if img is None:
        return {}
    h, w = img.shape[:2]

    photo = None
    mrz = None
    signature = None

    # Filter detections and take the most prominent detection per class
    for det in detections:
        label, x1, y1, x2, y2 = det[0], det[1], det[2], det[3], det[4]
        # ensure valid order
        rx1, rx2 = max(0, min(x1, x2)), min(w, max(x1, x2))
        ry1, ry2 = max(0, min(y1, y2)), min(h, max(y1, y2))

        if rx2 <= rx1 or ry2 <= ry1:
            continue

        if label == "photo":
            if photo is None or (rx2 - rx1) * (ry2 - ry1) > (photo[2] - photo[0]) * (photo[3] - photo[1]):
                photo = (rx1, ry1, rx2, ry2)
        elif label == "mrz":
            if mrz is None or (rx2 - rx1) * (ry2 - ry1) > (mrz[2] - mrz[0]) * (mrz[3] - mrz[1]):
                mrz = (rx1, ry1, rx2, ry2)
        elif label == "signature":
            if signature is None or (rx2 - rx1) * (ry2 - ry1) > (signature[2] - signature[0]) * (signature[3] - signature[1]):
                signature = (rx1, ry1, rx2, ry2)

    regions = {}

    # Define text region
    # Text region should be to the right of photo and above/outside MRZ
    tx1 = int(photo[2] + (w * 0.02)) if photo else 0
    tx2 = w
    ty1 = 0
    ty2 = mrz[1] if (mrz and mrz[1] > int(h * 0.35)) else int(h * 0.75)

    tx1 = max(0, min(tx1, w - 10))
    tx2 = max(tx1 + 10, min(tx2, w))
    ty1 = max(0, min(ty1, h - 10))
    ty2 = max(ty1 + 10, min(ty2, h))

    if tx2 > tx1 and ty2 > ty1:
        regions["text"] = (tx1, ty1, tx2, ty2)

        # Passport number typically in top-right of the text region
        pw = int((tx2 - tx1) * 0.55)
        ph = int((ty2 - ty1) * 0.35)
        nx1 = max(tx1, tx2 - pw)
        nx2 = tx2
        ny1 = ty1
        ny2 = min(ty2, ty1 + max(ph, 15))

        if nx2 > nx1 and ny2 > ny1:
            regions["passport_number"] = (nx1, ny1, nx2, ny2)

    if photo:
        regions["photo"] = photo
    if signature:
        regions["signature"] = signature
    if mrz:
        regions["mrz"] = mrz

    return regions
