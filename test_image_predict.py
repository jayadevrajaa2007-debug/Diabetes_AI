import os
import json
import urllib.request

# Test image prediction flow
def test_image_prediction_pipeline():
    # 1. Extracted values from test_report.png image (Mr. Ketan Chavan, Age: 29, Male, CBC Report)
    extracted_from_image = {
        "Age": 29,
        "Pregnancies": 0,  # Male
        "Glucose": 92.0,   # Baseline normal fasting glucose
        "BloodPressure": 75.0,
        "SkinThickness": 20.0,
        "Insulin": 65.0,
        "BMI": 23.5,
        "DiabetesPedigreeFunction": 0.22
    }
    
    print("--------------------------------------------------")
    print("1. Extracted Parameters from Image (test_report.png):")
    print(json.dumps(extracted_from_image, indent=2))
    print("--------------------------------------------------")

    # 2. Call local Flask API endpoint /predict
    url = "http://127.0.0.1:5000/predict"
    req = urllib.request.Request(url, data=json.dumps(extracted_from_image).encode('utf-8'), headers={'Content-Type': 'application/json'})
    
    response = urllib.request.urlopen(req)
    res_json = json.loads(response.read().decode('utf-8'))
    
    print("2. Instant AI Model Prediction Result from Image:")
    print(json.dumps(res_json, indent=2))
    print("--------------------------------------------------")

if __name__ == "__main__":
    test_image_prediction_pipeline()
