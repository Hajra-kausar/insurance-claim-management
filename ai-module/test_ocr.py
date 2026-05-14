import base64
import json
import re
import os
from datetime import datetime
from pdf2image import convert_from_path
from PIL import Image
import io
from groq import Groq

# ─────────────────────────────────────────────
# PATHS  (your original paths — unchanged)
# ─────────────────────────────────────────────
POPPLER_PATH = r"F:\Release-25.12.0-0\poppler-25.12.0\Library\bin"
FILE_PATH    = "form1.pdf"

# Groq API key
API_KEY = os.environ.get("GROQ_API_KEY", "gsk_")

client = Groq(api_key=API_KEY)

VISION_MODEL = "meta-llama/llama-4-scout-17b-16e-instruct"


# ================= OCR =================

def extract_text(file_path):
    images = convert_from_path(file_path, poppler_path=POPPLER_PATH, dpi=300)
    return images


# ================= IMAGE TO BASE64 =================

def image_to_base64(img: Image.Image) -> str:
    buf = io.BytesIO()
    img.save(buf, format="JPEG", quality=90)
    return base64.b64encode(buf.getvalue()).decode("utf-8")


# ================= EXTRACTION =================

USER_PROMPT = """You are an expert insurance document parser.
Look carefully at this health insurance claim form image and extract the following fields.
Return ONLY a valid JSON object — no markdown, no explanation, no extra text.
If a field is not visible, set its value to null.

{
  "policy_number":    null,
  "certificate_no":  null,
  "tpa_id":          null,
  "patient_name":    null,
  "hospital_name":   null,
  "doctor_name":     null,
  "claim_amount":    null,
  "date_of_injury":  null,
  "admission_date":  null,
  "discharge_date":  null,
  "ifsc_code":       null,
  "bank_account":    null
}"""


def extract_fields(images):
    img = images[0].convert("RGB")
    b64 = image_to_base64(img)

    response = client.chat.completions.create(
        model=VISION_MODEL,
        max_tokens=1024,
        messages=[
            {
                "role": "user",
                "content": [
                    {
                        "type": "image_url",
                        "image_url": {
                            "url": f"data:image/jpeg;base64,{b64}",
                        },
                    },
                    {
                        "type": "text",
                        "text": USER_PROMPT,
                    },
                ],
            }
        ],
    )

    raw_text = response.choices[0].message.content.strip()
    raw_text = re.sub(r"^```[a-z]*\n?", "", raw_text)
    raw_text = re.sub(r"\n?```$", "", raw_text)

    json_match = re.search(r"\{.*\}", raw_text, re.DOTALL)
    if json_match:
        raw_text = json_match.group(0)

    try:
        return json.loads(raw_text)
    except json.JSONDecodeError:
        print("[WARN] Groq returned non-JSON. Raw response:\n", raw_text)
        return {}


# ================= RISK =================

def parse_date(date_str):
    """Parse DD-MM-YYYY or DD/MM/YYYY → datetime, or None if invalid."""
    if not date_str:
        return None
    for fmt in ("%d-%m-%Y", "%d/%m/%Y"):
        try:
            return datetime.strptime(date_str.strip(), fmt)
        except ValueError:
            continue
    return None


def calculate_risk(data):
    score   = 0
    missing = []
    reasons = []
    today   = datetime.today()

    # ── 1. Missing critical fields (+25 each) ────────────────────────────
    critical_fields = ["policy_number", "claim_amount", "admission_date"]
    for field in critical_fields:
        if not data.get(field):
            score += 25
            missing.append(field)
            reasons.append(f"Missing critical field: {field}")

    # ── 2. Other missing fields (+5 each) ────────────────────────────────
    for k, v in data.items():
        if not v and k not in critical_fields:
            score += 5
            missing.append(k)
            reasons.append(f"Missing field: {k}")

    # ── 3. High claim amount ──────────────────────────────────────────────
    if data.get("claim_amount"):
        amt = int(re.sub(r"[^\d]", "", str(data["claim_amount"])))
        if amt > 300000:
            score += 30
            reasons.append(f"Very high claim amount: {data['claim_amount']}")
        elif amt > 100000:
            score += 15
            reasons.append(f"High claim amount: {data['claim_amount']}")

    # ── 4. Future dates — cannot claim for events that haven't happened ───
    for field in ["date_of_injury", "admission_date", "discharge_date"]:
        dt = parse_date(data.get(field))
        if dt and dt.date() > today.date():
            score += 40
            reasons.append(f"FUTURE DATE in {field}: {data[field]}")

    # ── 5. Discharge before admission — impossible ────────────────────────
    admit_dt     = parse_date(data.get("admission_date"))
    discharge_dt = parse_date(data.get("discharge_date"))
    if admit_dt and discharge_dt and discharge_dt < admit_dt:
        score += 40
        reasons.append("Discharge date is BEFORE admission date")

    # ── 6. Injury date after admission — suspicious ───────────────────────
    injury_dt = parse_date(data.get("date_of_injury"))
    if injury_dt and admit_dt and injury_dt > admit_dt:
        score += 25
        reasons.append("Injury date is AFTER admission date")

    # ── 7. Missing injury date (+20) ─────────────────────────────────────
    if not data.get("date_of_injury"):
        score += 20
        reasons.append("No injury date recorded")

    # ── 8. Invalid IFSC format (must be: 4 letters + 0 + 6 alphanumeric) ─
    if data.get("ifsc_code"):
        if not re.match(r"^[A-Z]{4}0[A-Z0-9]{6}$", data["ifsc_code"]):
            score += 20
            reasons.append(f"Invalid IFSC format: {data['ifsc_code']}")

    fraud = score >= 50
    return score, fraud, missing, reasons


# ================= MAIN =================

images = extract_text(FILE_PATH)

print("\n================ RAW OCR TEXT ================\n")
print(f"Loaded {len(images)} page(s) from {FILE_PATH}")

fields = extract_fields(images)

print("\n================ EXTRACTED FIELDS ================\n")
for k, v in fields.items():
    print(f"{k}: {v}")

score, fraud, missing, reasons = calculate_risk(fields)

print("\n================ ANALYSIS ================\n")
print(f"Score   : {score}")
print(f"Fraud   : {fraud}")
print(f"Missing : {missing if missing else 'None'}")
print("\nReasons :")
for r in reasons:
    print(f"  ⚠️  {r}")