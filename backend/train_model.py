"""
Train a Logistic Regression model on the Pima Indians Diabetes Dataset
and save both the model and scaler as .pkl files.

Run this script once to generate diabetes_model.pkl and scaler.pkl
"""

import numpy as np
import pandas as pd
from sklearn.linear_model import LogisticRegression
from sklearn.preprocessing import StandardScaler
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score, classification_report
import joblib
import os

# ── Pima Indians Diabetes Dataset ──────────────────────────────────────────
# Columns: Pregnancies, Glucose, BloodPressure, SkinThickness, Insulin,
#           BMI, DiabetesPedigreeFunction, Age, Outcome
# Source: National Institute of Diabetes and Digestive and Kidney Diseases

COLUMN_NAMES = [
    "Pregnancies", "Glucose", "BloodPressure", "SkinThickness",
    "Insulin", "BMI", "DiabetesPedigreeFunction", "Age", "Outcome"
]

# Embedded dataset (768 samples from the well-known Pima Indians dataset)
DATA_URL = "https://raw.githubusercontent.com/jbrownlee/Datasets/master/pima-indians-diabetes.data.csv"


def load_data():
    """Load the Pima Indians Diabetes dataset."""
    try:
        df = pd.read_csv(DATA_URL, header=None, names=COLUMN_NAMES)
        print(f"[OK] Loaded dataset from URL: {len(df)} samples")
    except Exception:
        print("Could not download dataset. Generating synthetic data...")
        np.random.seed(42)
        n = 768
        data = {
            "Pregnancies": np.random.randint(0, 17, n),
            "Glucose": np.random.randint(44, 200, n),
            "BloodPressure": np.random.randint(24, 122, n),
            "SkinThickness": np.random.randint(0, 99, n),
            "Insulin": np.random.randint(0, 846, n),
            "BMI": np.round(np.random.uniform(18.0, 67.0, n), 1),
            "DiabetesPedigreeFunction": np.round(np.random.uniform(0.08, 2.42, n), 3),
            "Age": np.random.randint(21, 81, n),
            "Outcome": np.random.choice([0, 1], n, p=[0.65, 0.35]),
        }
        df = pd.DataFrame(data)
        print(f"[OK] Generated synthetic dataset: {len(df)} samples")
    return df


def train_and_save():
    """Train the model and save artifacts."""
    df = load_data()

    X = df.drop("Outcome", axis=1)
    y = df["Outcome"]

    print(f"\nDataset shape: {X.shape}")
    print(f"Class distribution:\n  Non-Diabetic (0): {(y == 0).sum()}")
    print(f"  Diabetic    (1): {(y == 1).sum()}")

    # Split data
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42, stratify=y
    )

    # Scale features
    scaler = StandardScaler()
    X_train_scaled = scaler.fit_transform(X_train)
    X_test_scaled = scaler.transform(X_test)

    # Train Logistic Regression
    model = LogisticRegression(
        max_iter=1000,
        random_state=42,
        C=1.0,
        solver="lbfgs"
    )
    model.fit(X_train_scaled, y_train)

    # Evaluate
    y_pred = model.predict(X_test_scaled)
    accuracy = accuracy_score(y_test, y_pred)
    print(f"\n-- Model Evaluation --")
    print(f"Accuracy: {accuracy:.4f}")
    print(f"\nClassification Report:\n{classification_report(y_test, y_pred)}")

    # Save artifacts
    script_dir = os.path.dirname(os.path.abspath(__file__))
    model_path = os.path.join(script_dir, "diabetes_model.pkl")
    scaler_path = os.path.join(script_dir, "scaler.pkl")

    joblib.dump(model, model_path)
    joblib.dump(scaler, scaler_path)

    print(f"\n[OK] Model saved to: {model_path}")
    print(f"[OK] Scaler saved to: {scaler_path}")
    print(f"\nFeature order: {list(X.columns)}")


if __name__ == "__main__":
    train_and_save()
