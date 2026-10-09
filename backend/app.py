"""
Diabetes Prediction API — Flask Backend
========================================
Serves the frontend and exposes a /predict endpoint that loads a
pre-trained Logistic Regression model (diabetes_model.pkl) and an
optional StandardScaler (scaler.pkl).
"""

import os
import json
import traceback

import numpy as np
import joblib
from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS

# ── Paths ──────────────────────────────────────────────────────────────────
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
FRONTEND_DIR = os.path.join(os.path.dirname(BASE_DIR), "frontend")
MODEL_PATH = os.path.join(BASE_DIR, "diabetes_model.pkl")
SCALER_PATH = os.path.join(BASE_DIR, "scaler.pkl")

# ── Feature order (must match training) ────────────────────────────────────
FEATURE_NAMES = [
    "Pregnancies",
    "Glucose",
    "BloodPressure",
    "SkinThickness",
    "Insulin",
    "BMI",
    "DiabetesPedigreeFunction",
    "Age",
]

# ── Flask app ──────────────────────────────────────────────────────────────
app = Flask(__name__, static_folder=FRONTEND_DIR)
CORS(app)

# ── Load model & scaler ───────────────────────────────────────────────────
model = None
scaler = None


def load_artifacts():
    """Load the trained model and optional scaler at startup."""
    global model, scaler

    if not os.path.exists(MODEL_PATH):
        print(f"[WARNING] Model not found at {MODEL_PATH}")
        print("   Run 'python train_model.py' first to create the model.")
        return

    model = joblib.load(MODEL_PATH)
    print(f"[OK] Model loaded from {MODEL_PATH}")

    if os.path.exists(SCALER_PATH):
        scaler = joblib.load(SCALER_PATH)
        print(f"[OK] Scaler loaded from {SCALER_PATH}")
    else:
        print("[INFO] No scaler found -- raw features will be used.")


load_artifacts()


# ── Routes ─────────────────────────────────────────────────────────────────


@app.route("/")
def serve_index():
    """Serve the main frontend page."""
    return send_from_directory(FRONTEND_DIR, "index.html")


@app.route("/<path:filename>")
def serve_static(filename):
    """Serve any static file from the frontend directory."""
    return send_from_directory(FRONTEND_DIR, filename)


@app.route("/predict", methods=["POST"])
def predict():
    """
    Accept patient data as JSON, run prediction, return result.

    Expects JSON body:
    {
        "Pregnancies": 2,
        "Glucose": 120,
        "BloodPressure": 70,
        "SkinThickness": 20,
        "Insulin": 85,
        "BMI": 28.5,
        "DiabetesPedigreeFunction": 0.35,
        "Age": 35
    }

    Returns:
    {
        "prediction": "Non-Diabetic" | "Diabetic",
        "prediction_code": 0 | 1,
        "confidence": 93.4,
        "risk": "Low Risk" | "High Risk"
    }
    """
    # ── Guard: model must be loaded ────────────────────────────────────
    if model is None:
        return jsonify({
            "error": "Model not loaded. Please run 'python train_model.py' "
                     "to generate diabetes_model.pkl first."
        }), 503

    # ── Parse & validate incoming JSON ─────────────────────────────────
    data = request.get_json(silent=True)
    if data is None:
        return jsonify({"error": "Invalid or missing JSON body."}), 400

    missing = [f for f in FEATURE_NAMES if f not in data]
    if missing:
        return jsonify({
            "error": f"Missing required fields: {', '.join(missing)}"
        }), 400

    # Validate that all values are numeric
    values = []
    for feat in FEATURE_NAMES:
        try:
            val = float(data[feat])
            values.append(val)
        except (ValueError, TypeError):
            return jsonify({
                "error": f"Invalid value for '{feat}'. Must be a number."
            }), 400

    # ── Build feature array ────────────────────────────────────────────
    features = np.array([values])

    # Apply scaler if available
    if scaler is not None:
        features = scaler.transform(features)

    # ── Predict ────────────────────────────────────────────────────────
    try:
        pred = int(model.predict(features)[0])

        # Confidence via predict_proba (if supported)
        confidence = None
        if hasattr(model, "predict_proba"):
            proba = model.predict_proba(features)[0]
            confidence = round(float(max(proba)) * 100, 1)

        result = {
            "prediction": "Diabetic" if pred == 1 else "Non-Diabetic",
            "prediction_code": pred,
            "confidence": confidence,
            "risk": "High Risk" if pred == 1 else "Low Risk",
        }
        return jsonify(result), 200

    except Exception as exc:
        traceback.print_exc()
        return jsonify({
            "error": f"Prediction failed: {str(exc)}"
        }), 500


# ── Text / PDF Report Medical Parser Endpoint ────────────────────────────

@app.route("/parse-text", methods=["POST"])
def parse_text():
    """
    Accept raw text from medical lab report, extract clinical metrics via regex.
    """
    import re

    data = request.get_json(silent=True)
    if not data or "text" not in data:
        return jsonify({"error": "Missing 'text' parameter in JSON body."}), 400

    text = data["text"]
    metrics = {}

    # Glucose
    g_match = re.search(r'(?:Fasting\s*(?:Blood\s*)?Sugar|Fasting\s*Glucose|Plasma\s*Glucose|Blood\s*Glucose|Serum\s*Glucose|FBS|Glucose)[^\d\n\r]{0,30}?(\d{2,3}(?:\.\d+)?)', text, re.IGNORECASE)
    if g_match:
        metrics["Glucose"] = float(g_match.group(1))

    # Blood Pressure
    bp_match = re.search(r'(?:Blood\s*Pressure|BP)[^\d\n\r]{0,20}?(\d{2,3})\s*[\/\\]\s*(\d{2,3})', text, re.IGNORECASE)
    if bp_match:
        metrics["BloodPressure"] = float(bp_match.group(2))

    # BMI
    bmi_match = re.search(r'(?:Body\s*Mass\s*Index|BMI)[^\d\n\r]{0,20}?(\d{1,2}(?:\.\d+)?)', text, re.IGNORECASE)
    if bmi_match:
        metrics["BMI"] = float(bmi_match.group(1))

    # Insulin
    ins_match = re.search(r'(?:Serum\s*Insulin|Fasting\s*Insulin|Insulin)[^\d\n\r]{0,25}?(\d{1,3}(?:\.\d+)?)', text, re.IGNORECASE)
    if ins_match:
        metrics["Insulin"] = float(ins_match.group(1))

    # Age
    age_match = re.search(r'(?:Patient\s*Age|Age\s*[\/:]|Age)[^\d\n\r]{0,15}?(\d{1,3})', text, re.IGNORECASE)
    if age_match:
        metrics["Age"] = float(age_match.group(1))

    # Pregnancies
    preg_match = re.search(r'(?:Pregnanc(?:ies|y)|Gravida|Parity)[^\d\n\r]{0,15}?(\d{1,2})', text, re.IGNORECASE)
    if preg_match:
        metrics["Pregnancies"] = float(preg_match.group(1))

    # Skin Thickness
    skin_match = re.search(r'(?:Triceps\s*Skinfold|Skin\s*Thickness|Skinfold)[^\d\n\r]{0,20}?(\d{1,2}(?:\.\d+)?)', text, re.IGNORECASE)
    if skin_match:
        metrics["SkinThickness"] = float(skin_match.group(1))

    # Diabetes Pedigree Function
    dpf_match = re.search(r'(?:Diabetes\s*Pedigree(?:\s*Function)?|DPF)[^\d\n\r]{0,20}?(\d(?:\.\d+)?)', text, re.IGNORECASE)
    if dpf_match:
        metrics["DiabetesPedigreeFunction"] = float(dpf_match.group(1))

    return jsonify({
        "metrics": metrics,
        "extracted_count": len(metrics)
    }), 200


# ── Health check ───────────────────────────────────────────────────────────


@app.route("/health", methods=["GET"])
def health():
    """Simple health-check endpoint."""
    return jsonify({
        "status": "ok",
        "model_loaded": model is not None,
        "scaler_loaded": scaler is not None,
    })


# ── Entry point ────────────────────────────────────────────────────────────
if __name__ == "__main__":
    print("\n" + "=" * 55)
    print("  Diabetes Prediction API")
    print("  http://127.0.0.1:5000")
    print("=" * 55 + "\n")
    app.run(host="127.0.0.1", port=5000, debug=False)


