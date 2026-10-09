# 🩺 DiabetesAI — Diabetes Prediction Web Application

A modern, AI-powered Diabetes Risk Assessment dashboard built with **Flask** and **scikit-learn Logistic Regression**. Features a premium glassmorphism UI with dark/light mode, animated backgrounds, and real-time prediction with confidence scores.

![Python](https://img.shields.io/badge/Python-3.8+-blue?logo=python&logoColor=white)
![Flask](https://img.shields.io/badge/Flask-3.x-black?logo=flask)
![scikit-learn](https://img.shields.io/badge/scikit--learn-Latest-orange?logo=scikit-learn)

---

## 📂 Project Structure

```
DiabetesPrediction/
│
├── backend/
│   ├── app.py                 # Flask API server
│   ├── train_model.py         # Model training script
│   ├── diabetes_model.pkl     # Trained Logistic Regression model
│   ├── scaler.pkl             # StandardScaler (auto-generated)
│   └── requirements.txt       # Python dependencies
│
├── frontend/
│   ├── index.html             # Main dashboard page
│   ├── style.css              # Glassmorphism + dark mode styles
│   └── script.js              # Form validation & API logic
│
└── README.md
```

---

## 🚀 Quick Start

### 1. Install Dependencies

```bash
cd backend
pip install -r requirements.txt
```

### 2. Train the Model (first time only)

If you don't already have `diabetes_model.pkl` and `scaler.pkl`:

```bash
python train_model.py
```

This will:
- Download the Pima Indians Diabetes Dataset (or generate synthetic data if offline)
- Train a Logistic Regression model
- Save `diabetes_model.pkl` and `scaler.pkl` in the `backend/` directory

### 3. Run the Backend

```bash
python app.py
```

### 4. Open in Browser

Navigate to:

```
http://127.0.0.1:5000
```

---

## ✨ Features

| Feature | Description |
|---------|-------------|
| 🔮 **AI Prediction** | Logistic Regression with probability scores |
| 🌙 **Dark/Light Mode** | Toggle with persistent preference |
| 🎨 **Glassmorphism UI** | Frosted glass cards with soft shadows |
| ✅ **Live Validation** | Real-time field validation with helpful messages |
| 📱 **Responsive** | Mobile-friendly layout |
| 🎭 **Animations** | Smooth transitions, particle background, animated results |
| ⌨️ **Keyboard Shortcuts** | `Ctrl+Enter` to submit |
| 🔒 **Error Handling** | Graceful errors for invalid input or server issues |

---

## 📡 API Reference

### `POST /predict`

**Request Body:**

```json
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
```

**Response (Success):**

```json
{
    "prediction": "Non-Diabetic",
    "prediction_code": 0,
    "confidence": 96.2,
    "risk": "Low Risk"
}
```

### `GET /health`

Returns model and scaler loading status.

---

## 🔧 Input Fields

| Field | Range | Description |
|-------|-------|-------------|
| Pregnancies | 0–20 | Number of pregnancies |
| Glucose | 0–300 | Plasma glucose concentration (mg/dL) |
| Blood Pressure | 0–200 | Diastolic blood pressure (mm Hg) |
| Skin Thickness | 0–100 | Triceps skin fold thickness (mm) |
| Insulin | 0–900 | 2-Hour serum insulin (μU/mL) |
| BMI | 0–80 | Body mass index (kg/m²) |
| Diabetes Pedigree Function | 0–3 | Genetic diabetes likelihood |
| Age | 1–120 | Patient age in years |

---

## ⚠️ Disclaimer

This application is for **educational and research purposes only**. It is **not** a substitute for professional medical diagnosis. Always consult a qualified healthcare provider for medical advice.

---

## 📝 License

This project is open-source and available for educational use.

© 2026 DiabetesAI
