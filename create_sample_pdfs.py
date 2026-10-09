"""
Simple pure-python script to generate sample medical lab report PDFs
for testing the Diabetes AI PDF Scanner extension & web application.
"""
import os

def create_simple_pdf(filename, title, patient_name, age, gender, glucose, bp, bmi, insulin, pregnancies, skin, dpf, notes):
    """Generates a valid minimalist PDF 1.4 document containing formatted report text."""
    content_lines = [
        f"BT",
        f"/F1 16 Tf 50 750 Td ({title}) Tj ET",
        f"BT",
        f"/F1 10 Tf 50 730 Td (-----------------------------------------------------------------------------------) Tj ET",
        f"BT",
        f"/F1 11 Tf 50 710 Td (Patient: {patient_name}    Age: {age}    Gender: {gender}    Pregnancies: {pregnancies}) Tj ET",
        f"BT",
        f"/F1 10 Tf 50 690 Td (-----------------------------------------------------------------------------------) Tj ET",
        f"BT",
        f"/F1 11 Tf 50 660 Td (CLINICAL PARAMETER             RESULT        REFERENCE RANGE) Tj ET",
        f"BT",
        f"/F1 10 Tf 50 645 Td (-----------------------------------------------------------------------------------) Tj ET",
        f"BT",
        f"/F1 11 Tf 50 625 Td (Fasting Blood Glucose          {glucose} mg/dL    (70 - 99 mg/dL)) Tj ET",
        f"BT",
        f"/F1 11 Tf 50 605 Td (Blood Pressure (Diastolic)      {bp} mmHg      (60 - 80 mmHg)) Tj ET",
        f"BT",
        f"/F1 11 Tf 50 585 Td (Body Mass Index (BMI)          {bmi} kg/m2     (18.5 - 24.9)) Tj ET",
        f"BT",
        f"/F1 11 Tf 50 565 Td (Serum Insulin                  {insulin} uIU/mL   (15 - 110 uIU/mL)) Tj ET",
        f"BT",
        f"/F1 11 Tf 50 545 Td (Triceps Skin Thickness         {skin} mm       (10 - 30 mm)) Tj ET",
        f"BT",
        f"/F1 11 Tf 50 525 Td (Diabetes Pedigree Function (DPF){dpf}        (0.1 - 0.4)) Tj ET",
        f"BT",
        f"/F1 10 Tf 50 500 Td (-----------------------------------------------------------------------------------) Tj ET",
        f"BT",
        f"/F1 11 Tf 50 480 Td (Clinical Summary: {notes}) Tj ET"
    ]

    stream_content = "\n".join(content_lines)
    stream_len = len(stream_content)

    pdf_body = f"""%PDF-1.4
1 0 obj
<< /Type /Catalog /Pages 2 0 R >>
endobj
2 0 obj
<< /Type /Pages /Kids [3 0 R] /Count 1 >>
endobj
3 0 obj
<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>
endobj
4 0 obj
<< /Length {stream_len} >>
stream
{stream_content}
endstream
endobj
5 0 obj
<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>
endobj
xref
0 6
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000115 00000 n 
0000000242 00000 n 
0000000340 00000 n 
trailer
<< /Size 6 /Root 1 0 R >>
startxref
420
%%EOF"""

    os.makedirs(os.path.dirname(filename), exist_ok=True)
    with open(filename, "w", encoding="utf-8", newline="\n") as f:
        f.write(pdf_body)
    print(f"[OK] PDF Report Generated: {filename}")

if __name__ == "__main__":
    out_dir = os.path.join(os.path.dirname(__file__), "sample_reports")
    
    # 1. High Risk Diabetic PDF
    create_simple_pdf(
        os.path.join(out_dir, "diabetic_patient_report.pdf"),
        "DIAGNOSTIC MEDICAL LAB REPORT - HIGH RISK PATIENT",
        "Jane Doe", 48, "Female", 154, 85, 34.2, 175, 4, 32, 0.72,
        "High Fasting Glucose and Insulin. High risk of Type 2 Diabetes."
    )
    
    # 2. Low Risk Healthy PDF
    create_simple_pdf(
        os.path.join(out_dir, "healthy_patient_report.pdf"),
        "DIAGNOSTIC MEDICAL LAB REPORT - HEALTHY CHECKUP",
        "Sarah Smith", 29, "Female", 88, 68, 22.4, 45, 1, 18, 0.24,
        "Normal blood glucose and insulin levels. Low risk profile."
    )
