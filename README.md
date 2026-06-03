# Health Assessment Intelligence and Symptom Evaluation System (HAISES)

A Flask-based healthcare assessment platform for rural communities. Evaluates symptoms using **Random Forest** and **Naive Bayes** classifiers trained on a 6,000-record healthcare dataset.

---

## Project Structure

```
healthcare_app/
├── app.py                          # Flask application
├── requirements.txt
├── models/
│   ├── rf_model.pkl                # Trained Random Forest model (95.5% accuracy)
│   ├── nb_model.pkl                # Trained Naive Bayes model (94.6% accuracy)
│   ├── label_encoder.pkl
│   ├── feature_cols.json
│   └── model_stats.json
├── templates/
│   └── index.html                  # Main HTML template
├── static/
│   ├── css/style.css
│   ├── js/
│   │   ├── app.js                  # Step navigation, prediction rendering
│   │   ├── symptoms.js             # Symptom cards, NLP text analysis
│   │   └── translations.js         # Language switching logic
│   └── translations/
│       └── translations.json       # English / Telugu / Hindi translations
├── scripts/
│   └── train_models.py             # Model training script
└── translations/
    └── translations.json
```

---

## Setup & Run

### 1. Install dependencies

```bash
cd healthcare_app
pip install -r requirements.txt
```

### 2. (Optional) Retrain models

If you have an updated dataset:

```bash
python scripts/train_models.py --dataset /path/to/dataset.xlsx
```

### 3. Run the application

```bash
python app.py
```

Open your browser at: **http://localhost:5000**

---

## Features

| Feature | Details |
|---|---|
| **ML Models** | Random Forest (95.5%) + Naive Bayes (94.6%) |
| **Diseases** | 24 conditions including Flu, Dengue, Malaria, Heart Disease, etc. |
| **Symptom Input** | Interactive cards with severity selection OR free-text NLP |
| **Severity Levels** | Mild / Moderate / Severe (encoded 1–3) |
| **Risk Classification** | High (>70%) / Moderate (>40%) / Low |
| **Medical History** | Diabetes, Hypertension, Asthma, Heart Disease |
| **Languages** | English, Telugu (తెలుగు), Hindi (हिंदी) |
| **Hospital Finder** | Demo mode included; plug in Google Maps API key for live search |

---

## Google Maps API Setup

To enable live nearby hospital search:

1. Get an API key from [Google Cloud Console](https://console.cloud.google.com/)
2. Enable **Places API** and **Maps JavaScript API**
3. In `static/js/app.js`, replace:
   ```js
   const apiKey = 'DEMO';
   ```
   with your actual key:
   ```js
   const apiKey = 'YOUR_GOOGLE_MAPS_API_KEY';
   ```

---

## Dataset

- **Source**: `realistic_healthcare_dataset_6000.xlsx`
- **Size**: 6,000 records × 31 features
- **Target**: 24 disease classes (250 records each, balanced)
- **Symptom Encoding**: 0 = Not Present, 1 = Mild, 2 = Moderate, 3 = Severe

---

## Disclaimer

This platform is designed for **preliminary health awareness** only. It is **not a medical diagnosis tool**. Always consult a qualified healthcare professional for medical advice.
# healthcare
