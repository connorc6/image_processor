import tkinter as tk
from tkinter import filedialog, ttk, messagebox
import pytesseract
import pandas as pd
import cv2
import re
from PIL import Image, ImageTk
import os

def preprocess_image(path):
    image = cv2.imread(path)

    # ❗ Skip rotation for now — try original orientation first
    # image = cv2.rotate(image, cv2.ROTATE_90_CLOCKWISE)

    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)

    # Optional: save debug image
    cv2.imwrite("debug_gray.png", gray)

    return gray





def extract_text(image):
    pil_img = Image.fromarray(image)
    print(f"[DEBUG] OCR image size: {pil_img.size}")
    config = r'--oem 3 --psm 6'
    return pytesseract.image_to_string(pil_img, config=config)



# --- Receipt Parsing ---
def parse_receipt_text(text, debug=False):
    import re
    import unicodedata

    def clean_line(line):
        line = unicodedata.normalize('NFKD', line)
        line = re.sub(r'[^\x00-\x7F]+', '', line)
        line = line.replace(',', '.')
        line = re.sub(r'\s{2,}', ' ', line)
        return line.strip()

    lines = [clean_line(line) for line in text.split('\n') if line.strip()]
    items = []
    capture = False
    bad_words = ['total', 'balance', 'tax', 'payment', 'change', 'cash', 'credit', 'auth', 'report']
    category_markers = ['grocery', 'dairy', 'meat', 'bakery', 'produce']

    for i, line in enumerate(lines):
        line_lower = line.lower()

        if any(word in line_lower for word in bad_words):
            capture = False
            continue

        if any(word in line_lower for word in category_markers):
            capture = True
            continue

        if not capture:
            continue

        # Simple match: line ends in a price
        match = re.match(r'(.+?)\s+([0-9]+(?:\.[0-9]{2})?)\s*[A-Z\s]*$', line)
        if match:
            item, price = match.groups()
            try:
                price_val = float(price)
            except:
                continue
            items.append({"Item": item.strip(), "Price": price_val})
            if debug:
                print(f"[✔] Matched item line: {line}")
            continue


        # Price-only line fallback
        price_only = re.match(r'^([0-9]+\.[0-9]{2})\s*[A-Z]{0,2}$', line)
        if price_only and i > 0:
            price = float(price_only.group(1))
            prev = lines[i - 1].strip()
            if len(prev) > 3 and not any(b in prev.lower() for b in bad_words):
                items.append({"Item": prev, "Price": price})
                if debug:
                    print(f"[~] Matched as produce-style: {prev} + {price}")
                continue

        if debug:
            print(f"[ ] Skipped: {line}")

    return items



# --- GUI Class ---
class ReceiptApp:
    def __init__(self, root):
        self.root = root
        self.root.title("Receipt Parser")
        self.root.geometry("600x400")

        # Upload button
        self.upload_btn = tk.Button(root, text="Upload Receipt Image", command=self.upload_image)
        self.upload_btn.pack(pady=10)

        # Treeview for item list
        self.tree = ttk.Treeview(root, columns=("Item", "Price"), show="headings")
        self.tree.heading("Item", text="Item")
        self.tree.heading("Price", text="Price ($)")
        self.tree.pack(expand=True, fill="both")

        # Export button
        self.export_btn = tk.Button(root, text="Export to CSV", command=self.export_csv)
        self.export_btn.pack(pady=10)

        self.receipt_items = []

    def upload_image(self):
        path = filedialog.askopenfilename(filetypes=[("Image Files", "*.jpg *.png *.jpeg")])
        if not path:
            return
        try:
            processed = preprocess_image(path)
            text = extract_text(processed)
            print("\n--- OCR TEXT ---\n", text)
            self.receipt_items = parse_receipt_text(text, debug=True)
            self.display_items()
        except Exception as e:
            messagebox.showerror("Error", f"Failed to process image:\n{str(e)}")

    def display_items(self):
        self.tree.delete(*self.tree.get_children())
        for item in self.receipt_items:
            self.tree.insert("", "end", values=(item["Item"], f"{item['Price']:.2f}"))

    def export_csv(self):
        if not self.receipt_items:
            messagebox.showwarning("No Data", "No receipt items to export.")
            return
        path = filedialog.asksaveasfilename(defaultextension=".csv", filetypes=[("CSV Files", "*.csv")])
        if path:
            df = pd.DataFrame(self.receipt_items)
            df.to_csv(path, index=False)
            messagebox.showinfo("Exported", f"Saved {len(df)} items to {os.path.basename(path)}.")

# --- Run App ---
if __name__ == "__main__":
    root = tk.Tk()
    app = ReceiptApp(root)
    root.mainloop()
