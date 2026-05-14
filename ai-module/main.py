import base64
import json
import re
import os
import sys
import io

from pdf2image import convert_from_path
from PIL import Image
from groq import Groq

# =========================================================
# PATHS
# =========================================================

POPPLER_PATH = r"F:\Release-25.12.0-0\poppler-25.12.0\Library\bin"

# =========================================================
# GROQ
# =========================================================

API_KEY = os.environ.get("GROQ_API_KEY")

client = Groq(api_key=API_KEY)

VISION_MODEL = "meta-llama/llama-4-scout-17b-16e-instruct"

# =========================================================
# PROMPT
# =========================================================

USER_PROMPT = """
You are an expert insurance OCR and fraud analysis system.

Analyze this insurance claim form carefully.

Extract ALL fields accurately.

Return ONLY valid JSON.

{
  "policy_number": null,
  "certificate_no": null,
  "tpa_id": null,
  "patient_name": null,
  "hospital_name": null,
  "doctor_name": null,
  "claim_amount": null,
  "date_of_injury": null,
  "admission_date": null,
  "discharge_date": null,
  "ifsc_code": null,
  "bank_account": null
}
"""

# =========================================================
# PDF TO IMAGE
# =========================================================

def extract_images(file_path):

    images = convert_from_path(
        file_path,
        poppler_path=POPPLER_PATH,
        dpi=300
    )

    return images

# =========================================================
# IMAGE TO BASE64
# =========================================================

def image_to_base64(img):

    buffer = io.BytesIO()

    img.save(
        buffer,
        format="JPEG"
    )

    return base64.b64encode(
        buffer.getvalue()
    ).decode("utf-8")

# =========================================================
# OCR EXTRACTION
# =========================================================

def extract_fields(images):

    img = images[0].convert("RGB")

    b64 = image_to_base64(img)

    response = client.chat.completions.create(

        model=VISION_MODEL,

        temperature=0,

        max_tokens=1024,

        messages=[

            {
                "role": "user",

                "content": [

                    {
                        "type": "image_url",

                        "image_url": {
                            "url":
                            f"data:image/jpeg;base64,{b64}"
                        }
                    },

                    {
                        "type": "text",

                        "text": USER_PROMPT
                    }
                ]
            }
        ]
    )

    raw_text = (
        response
        .choices[0]
        .message
        .content
        .strip()
    )

    raw_text = re.sub(
        r"^```json",
        "",
        raw_text
    )

    raw_text = re.sub(
        r"```$",
        "",
        raw_text
    )

    json_match = re.search(
        r"\{.*\}",
        raw_text,
        re.DOTALL
    )

    if json_match:

        raw_text = json_match.group(0)

    fields = json.loads(raw_text)

    return fields

# =========================================================
# RISK ANALYSIS
# =========================================================

def calculate_risk(fields):

    score = 0

    fraud = False

    missing = []

    reasons = []

    # =====================================================
    # MISSING FIELD CHECK
    # =====================================================

    required_fields = [

        "policy_number",
        "patient_name",
        "hospital_name",
        "claim_amount"
    ]

    for field in required_fields:

        if not fields.get(field):

            missing.append(field)

            score += 10

    # =====================================================
    # CLAIM AMOUNT CHECK
    # =====================================================

    claim_amount = fields.get("claim_amount")

    if claim_amount:

        amount_digits = re.sub(
            r"[^\d]",
            "",
            str(claim_amount)
        )

        if amount_digits:

            amount = int(amount_digits)

            fields["claim_amount"] = amount

            if amount > 300000:

                score += 40

                reasons.append(
                    "Claim amount is significantly higher than standard hospitalization averages."
                )

            elif amount > 100000:

                score += 20

                reasons.append(
                    "Claim amount appears moderately high and requires verification."
                )

    # =====================================================
    # FUTURE DATE CHECK
    # =====================================================

    discharge_date = fields.get(
        "discharge_date"
    )

    if discharge_date:

        if "2027" in str(discharge_date):

            score += 20

            reasons.append(
                "One or more medical dates appear inconsistent or future dated."
            )

    # =====================================================
    # FRAUD DECISION
    # =====================================================

    if score >= 60:

        fraud = True

    # =====================================================
    # RISK LEVEL
    # =====================================================

    if score >= 70:

        risk_level = "High"

    elif score >= 40:

        risk_level = "Medium"

    else:

        risk_level = "Low"

    # =====================================================
    # JUSTIFICATION
    # =====================================================

    if reasons:

        justification = (
            "The claim contains suspicious patterns requiring manual verification. "
            + " ".join(reasons)
            #+ " AI-based OCR and NLP validation completed successfully."
        )

    else:

        justification = (
            "No major fraud indicators detected. "
            "Claim document appears structurally valid."
        )

    return (
        score,
        fraud,
        missing,
        risk_level,
        justification
    )

# =========================================================
# MAIN
# =========================================================

try:

    if len(sys.argv) < 2:

        raise Exception(
            "No file path received"
        )

    FILE_PATH = sys.argv[1]

    images = extract_images(FILE_PATH)

    fields = extract_fields(images)

    print(
        "FIELDS:",
        fields,
        file=sys.stderr
    )

    (
        score,
        fraud,
        missing,
        risk_level,
        justification

    ) = calculate_risk(fields)

    output = {

        "fields": fields,

        "score": score,

        "fraud": fraud,

        "missing": missing,

        "risk_level": risk_level,

        "justification": justification,

        "raw_text": json.dumps(fields)
    }

    print(json.dumps(output))

except Exception as e:

    error_output = {

        "error": str(e)
    }

    print(json.dumps(error_output))