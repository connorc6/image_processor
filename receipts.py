import cv2
import pytesseract
import pandas as pd
import re
from PIL import Image
import numpy as np

# Image rotation
def rotate_image(image, angle=90):
    return cv2.rotate(image, cv2.ROTATE_90_CLOCKWISE)

# ---- Step 1: Load and Preprocess Image ----

def preprocess_image(image_path):
    image = cv2.imread(image_path)
    image = rotate_image(image)
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)

    # Apply thresholding
    gray = cv2.GaussianBlur(gray, (5, 5), 0)
    _, thresh = cv2.threshold(gray, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)

    # Apply dilation to make text more distinct (optional)
    kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (1, 1))
    processed = cv2.dilate(thresh, kernel, iterations=1)

    return processed

# ---- Step 2: Extract Text Using OCR ----

def extract_text(image):
    # Convert OpenCV image (numpy array) to PIL Image
    pil_image = Image.fromarray(image)
    custom_config = r'--oem 3 --psm 4'  # 4 = assume a column of text
    text = pytesseract.image_to_string(pil_image, config=custom_config)
    return text

# ---- Step 3: Parse Lines for Items and Prices ----

import re

def parse_receipt_text(text):
    lines = text.split("\n")
    item_pattern = re.compile(r'^(.+?)\s+([0-9]+\.[0-9]{2})\s+[A-Z]{1,2}$')
    price_only_pattern = re.compile(r'^([0-9]+\.[0-9]{2})\s+[A-Z]{1,2}$')
    ignore_keywords = ['TOTAL', 'BALANCE', 'CREDIT', 'TAX', 'CHANGE', 'DAIRY', 'MEAT', 'BAKERY', 'GROCERY', 'REPORT']

    items = []
    prev_line = ""
    waiting_for_price = None

    for i, line in enumerate(lines):
        line = line.strip()
        if not line:
            continue

        if any(word in line.upper() for word in ignore_keywords):
            prev_line = ""
            waiting_for_price = None
            continue

        # Normalize line
        line = line.replace(',', '.')
        line = re.sub(r'\s{2,}', ' ', line)

        # Standard match: item name + price + tax code
        match = item_pattern.match(line)
        if match:
            item, price = match.groups()
            items.append({"Item": item.strip(), "Price": float(price)})
            prev_line = ""
            waiting_for_price = None
            continue

        # Standalone price following a possible item name
        match_price_only = price_only_pattern.match(line)
        if match_price_only and waiting_for_price:
            try:
                price = float(match_price_only.group(1))
                items.append({"Item": waiting_for_price.strip(), "Price": price})
            except:
                pass
            waiting_for_price = None
            continue

        # Look ahead to handle multi-line weird OCR
        if i + 1 < len(lines):
            next_line = lines[i + 1].strip()
            if ('@' in next_line or 'lb' in next_line or '$' in next_line) and not item_pattern.match(next_line):
                waiting_for_price = line
                continue

        prev_line = line

    return items




# ---- Step 4: Save to CSV ----

def save_to_csv(data, output_path="receipt_data.csv"):
    df = pd.DataFrame(data)
    df.to_csv(output_path, index=False)
    print(f"Saved {len(df)} items to {output_path}")

# ---- Main ----

def main():
    image_path = "receipt_folder/receipt.jpg"  # Change to your image path
    print(f"Processing: {image_path}")

    processed_image = preprocess_image(image_path)
    
    text = extract_text(processed_image)
    print("\n--- OCR TEXT ---\n")
    print(text)

    items = parse_receipt_text(text)

    if items:
        save_to_csv(items)
    else:
        print("No items found. Try adjusting preprocessing or OCR settings.")

if __name__ == "__main__":
    main()
