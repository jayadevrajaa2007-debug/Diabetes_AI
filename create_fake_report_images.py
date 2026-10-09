"""
Generates realistic fake medical lab report PNG images for testing
OCR text extraction & Diabetes AI prediction.
"""
import os
from PIL import Image, ImageDraw, ImageFont

def create_lab_report_image(filename, patient_name, age, gender, pregnancies, glucose, bp, bmi, insulin, skin, dpf, risk_label):
    width, height = 850, 1100
    img = Image.new("RGB", (width, height), color=(255, 255, 255))
    draw = ImageDraw.Draw(img)

    # Use default font
    try:
        font_title = ImageFont.truetype("arial.ttf", 26)
        font_sub = ImageFont.truetype("arial.ttf", 16)
        font_bold = ImageFont.truetype("arial.ttf", 18)
        font_body = ImageFont.truetype("arial.ttf", 16)
        font_small = ImageFont.truetype("arial.ttf", 14)
    except IOError:
        font_title = font_sub = font_bold = font_body = font_small = ImageFont.load_default()

    # Draw Header Box
    draw.rectangle([0, 0, width, 110], fill=(15, 23, 42))
    draw.text((40, 25), "METROPOLIS DIAGNOSTICS LAB", fill=(56, 189, 248), font=font_title)
    draw.text((40, 65), "ISO 9001:2024 Certified Comprehensive Health Checkup Report", fill=(203, 213, 225), font=font_sub)

    # Patient Details Box
    draw.rectangle([40, 140, width - 40, 230], outline=(203, 213, 225), width=2)
    draw.text((60, 155), f"PATIENT NAME : {patient_name.upper()}", fill=(15, 23, 42), font=font_bold)
    draw.text((60, 190), f"AGE / GENDER  : {age} Yrs / {gender}", fill=(15, 23, 42), font=font_body)
    draw.text((450, 155), f"LAB REF NO  : MET-984210", fill=(15, 23, 42), font=font_body)
    draw.text((450, 190), f"PREGNANCIES : {pregnancies}", fill=(15, 23, 42), font=font_body)

    # Section Title
    draw.rectangle([40, 260, width - 40, 295], fill=(241, 245, 249))
    draw.text((60, 268), "DIABETES & METABOLIC COMPREHENSIVE PANEL", fill=(15, 23, 42), font=font_bold)

    # Table Header
    y = 320
    draw.text((60, y), "TEST PARAMETER", fill=(100, 116, 139), font=font_bold)
    draw.text((360, y), "RESULT", fill=(100, 116, 139), font=font_bold)
    draw.text((500, y), "UNIT", fill=(100, 116, 139), font=font_bold)
    draw.text((640, y), "REFERENCE RANGE", fill=(100, 116, 139), font=font_bold)

    draw.line([(40, y + 25), (width - 40, y + 25)], fill=(203, 213, 225), width=2)

    rows = [
        ("Fasting Blood Glucose", f"{glucose}", "mg/dL", "70 - 99 mg/dL"),
        ("Blood Pressure (Diastolic)", f"{bp}", "mmHg", "60 - 80 mmHg"),
        ("Body Mass Index (BMI)", f"{bmi}", "kg/m2", "18.5 - 24.9 kg/m2"),
        ("Serum Insulin", f"{insulin}", "uIU/mL", "15 - 110 uIU/mL"),
        ("Triceps Skin Thickness", f"{skin}", "mm", "10 - 30 mm"),
        ("Diabetes Pedigree Function", f"{dpf}", "DPF Score", "0.1 - 0.4")
    ]

    y += 40
    for test, val, unit, ref in rows:
        draw.text((60, y), test, fill=(15, 23, 42), font=font_body)
        draw.text((360, y), val, fill=(225, 29, 72) if ("HIGH" in risk_label and test in ["Fasting Blood Glucose", "Serum Insulin", "Body Mass Index (BMI)"]) else (15, 23, 42), font=font_bold)
        draw.text((500, y), unit, fill=(100, 116, 139), font=font_body)
        draw.text((640, y), ref, fill=(100, 116, 139), font=font_body)
        draw.line([(40, y + 30), (width - 40, y + 30)], fill=(241, 245, 249), width=1)
        y += 45

    # Footer Notes
    draw.rectangle([40, y + 30, width - 40, y + 130], fill=(248, 250, 252), outline=(226, 232, 240))
    draw.text((60, y + 45), f"CLINICAL INTERPRETATION : {risk_label}", fill=(15, 23, 42), font=font_bold)
    draw.text((60, y + 80), "Automated laboratory evaluation performed on Roche Cobas 8000 analyzer.", fill=(100, 116, 139), font=font_small)

    # Doctor Signature Line
    draw.line([(width - 260, y + 230), (width - 60, y + 230)], fill=(15, 23, 42), width=2)
    draw.text((width - 240, y + 240), "Dr. A. Sharma, M.D.", fill=(15, 23, 42), font=font_bold)
    draw.text((width - 240, y + 265), "Head of Pathology", fill=(100, 116, 139), font=font_small)

    os.makedirs(os.path.dirname(filename), exist_ok=True)
    img.save(filename, "PNG")
    print(f"[OK] Generated Fake Report Image: {filename}")

if __name__ == "__main__":
    base_dir = os.path.join(os.path.dirname(__file__), "sample_reports")

    # 1. Fake Diabetic Report Image (High Risk)
    create_lab_report_image(
        os.path.join(base_dir, "fake_diabetic_report.png"),
        patient_name="Priya Sharma",
        age=46,
        gender="Female",
        pregnancies=3,
        glucose=162,
        bp=88,
        bmi=34.8,
        insulin=185,
        skin=34,
        dpf=0.74,
        risk_label="ELEVATED FASTING GLUCOSE & INSULIN - HIGH DIABETIC RISK"
    )

    # 2. Fake Healthy Report Image (Low Risk)
    create_lab_report_image(
        os.path.join(base_dir, "fake_healthy_report.png"),
        patient_name="Ananya Verma",
        age=28,
        gender="Female",
        pregnancies=1,
        glucose=85,
        bp=72,
        bmi=21.5,
        insulin=42,
        skin=18,
        dpf=0.22,
        risk_label="ALL CLINICAL PARAMETERS WITHIN NORMAL REFERENCE RANGES"
    )
