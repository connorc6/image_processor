import anthropic
import base64
import json
import re
from pathlib import Path


def parse_receipt_image(image_bytes: bytes, media_type: str = "image/jpeg") -> list[dict]:
    """
    Send a receipt image to Claude and return a list of {name, price} dicts.
    Raises ValueError if Claude can't find any items.
    """
    client = anthropic.Anthropic()

    b64 = base64.standard_b64encode(image_bytes).decode("utf-8")

    message = client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=1024,
        messages=[
            {
                "role": "user",
                "content": [
                    {
                        "type": "image",
                        "source": {
                            "type": "base64",
                            "media_type": media_type,
                            "data": b64,
                        },
                    },
                    {
                        "type": "text",
                        "text": (
                            "This is a grocery receipt. Extract every individual purchased item "
                            "and its price. Exclude taxes, totals, subtotals, fees, bag charges, "
                            "discounts, and store info lines.\n\n"
                            "Return ONLY a JSON array — no markdown, no explanation — like:\n"
                            '[{"name": "Whole Milk", "price": 3.49}, ...]\n\n'
                            "If you cannot read the receipt, return an empty array []."
                        ),
                    },
                ],
            }
        ],
    )

    raw = message.content[0].text.strip()

    # Strip accidental markdown fences
    raw = re.sub(r"^```[a-z]*\n?", "", raw)
    raw = re.sub(r"\n?```$", "", raw)

    try:
        items = json.loads(raw)
    except json.JSONDecodeError:
        # Try to extract the first [...] block
        match = re.search(r"\[.*\]", raw, re.DOTALL)
        if match:
            items = json.loads(match.group())
        else:
            items = []

    # Normalize: ensure every item has name (str) and price (float > 0)
    cleaned = []
    for item in items:
        try:
            name = str(item.get("name", "")).strip()
            price = float(item.get("price", 0))
            if name and price > 0:
                cleaned.append({"name": name, "price": round(price, 2)})
        except (TypeError, ValueError):
            continue

    return cleaned
