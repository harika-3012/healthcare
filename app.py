from flask import Flask, render_template, request, jsonify
import pickle, json, numpy as np, os
import sqlite3
from datetime import datetime

app = Flask(__name__)

BASE = os.path.dirname(__file__)
DB_PATH = os.path.join(BASE, 'database', 'history.db')

# Load models
rf_model   = pickle.load(open(os.path.join(BASE, 'models/rf_model.pkl'), 'rb'))
nb_model   = pickle.load(open(os.path.join(BASE, 'models/nb_model.pkl'), 'rb'))
label_enc  = pickle.load(open(os.path.join(BASE, 'models/label_encoder.pkl'), 'rb'))
feature_cols = json.load(open(os.path.join(BASE, 'models/feature_cols.json')))
model_stats  = json.load(open(os.path.join(BASE, 'models/model_stats.json')))

SYMPTOM_COLS = [
    'Fever','Cough','Headache','Fatigue','Nausea','Vomiting','Chest_Pain',
    'Breathlessness','Sore_Throat','Dizziness','Body_Ache','Loss_of_Appetite',
    'Sweating','Chills','Abdominal_Pain','Diarrhea','Weakness','Joint_Pain',
    'Stress_Level','Heartburn','Palpitations','Sleep_Disturbance','Weight_Loss'
]

GUIDANCE = {
    'high':     'Seek immediate medical attention. Visit the nearest hospital or emergency care unit as soon as possible. Do not delay consultation.',
    'moderate': 'Monitor your symptoms closely. Consult a doctor within 24–48 hours. Avoid self-medication and stay hydrated.',
    'low':      'Rest and follow basic home care. Stay hydrated, maintain a healthy diet, and monitor for worsening symptoms. Consult a doctor if symptoms persist beyond 3 days.'
}

DISEASE_INFO = {
    'Flu':              'Influenza — viral infection affecting respiratory tract.',
    'Cold':             'Common cold — mild upper respiratory infection.',
    'Migraine':         'Severe recurring headaches often with nausea and light sensitivity.',
    'Food_Poisoning':   'Illness caused by contaminated food or water.',
    'Heart_Disease':    'Conditions affecting the heart muscle or coronary arteries.',
    'Viral_Fever':      'Fever caused by a viral infection.',
    'Gastritis':        'Inflammation of the stomach lining.',
    'Anxiety':          'Excessive worry or fear affecting daily functioning.',
    'Diabetes':         'Metabolic disorder affecting blood sugar regulation.',
    'Hypertension':     'High blood pressure condition requiring monitoring.',
    'Asthma':           'Chronic respiratory condition causing airway inflammation.',
    'Pneumonia':        'Lung infection causing difficulty breathing.',
    'Typhoid':          'Bacterial infection from contaminated food/water.',
    'Dengue':           'Mosquito-borne viral fever.',
    'Malaria':          'Mosquito-borne parasitic disease causing fever cycles.',
    'Arthritis':        'Joint inflammation causing pain and stiffness.',
    'Kidney_Stone':     'Hard mineral deposits in the kidneys.',
    'Ulcer':            'Sores in the stomach or intestinal lining.',
    'Depression':       'Persistent low mood affecting daily life and energy.',
    'Allergy':          'Immune reaction to environmental or food triggers.',
    'Sinusitis':        'Inflammation of the sinuses causing congestion.',
    'Bronchitis':       'Inflammation of the bronchial tubes.',
    'Anemia':           'Low red blood cell count causing fatigue and weakness.',
    'Thyroid_Disorder': 'Imbalance in thyroid hormone production.',
}
def save_assessment(age, gender, disease, risk):
    conn = sqlite3.connect(DB_PATH)

    cursor = conn.cursor()

    cursor.execute("""
        INSERT INTO assessment_history
        (
            assessment_time,
            age,
            gender,
            predicted_disease,
            risk_level
        )
        VALUES (?, ?, ?, ?, ?)
    """,
    (
        datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
        age,
        gender,
        disease,
        risk
    ))

    conn.commit()
    conn.close()


def build_feature_vector(data):
    gender_enc = 1 if data.get('gender', '').lower() == 'male' else 0
    duration_map = {'1-2': 1.5, '3-5': 4, '6-10': 8, '10+': 14}
    duration = duration_map.get(data.get('duration', '3-5'), 4)

    vec = {
        'Age':                   int(data.get('age', 30)),
        'Gender_enc':            gender_enc,
        'Duration_Days':         duration,
        'Diabetes_History':      int(data.get('diabetes_history', 0)),
        'Hypertension_History':  int(data.get('hypertension_history', 0)),
        'Asthma_History':        int(data.get('asthma_history', 0)),
        'HeartDisease_History':  int(data.get('heart_history', 0)),
    }
    symptoms = data.get('symptoms', {})
    for s in SYMPTOM_COLS:
        vec[s] = int(symptoms.get(s, 0))

    return np.array([vec[f] for f in feature_cols]).reshape(1, -1)


def classify_risk(prob):
    if prob >= 70:
        return 'high'
    elif prob >= 40:
        return 'moderate'
    return 'low'


@app.route('/')
def index():
    return render_template('index.html', model_stats=model_stats)


@app.route('/api/predict', methods=['POST'])
def predict():
    data = request.get_json()
    X = build_feature_vector(data)

    # Random Forest
    rf_probs = rf_model.predict_proba(X)[0]
    rf_top3_idx = np.argsort(rf_probs)[::-1][:3]
    rf_results = []
    for i in rf_top3_idx:
        prob = round(float(rf_probs[i]) * 100, 1)
        disease = label_enc.classes_[i]
        risk = classify_risk(prob)
        rf_results.append({
            'disease': disease.replace('_', ' '),
            'disease_key': disease,
            'probability': prob,
            'risk': risk,
            'info': DISEASE_INFO.get(disease, ''),
            'guidance': GUIDANCE[risk]
        })

    # Naive Bayes
    nb_probs = nb_model.predict_proba(X)[0]
    nb_top3_idx = np.argsort(nb_probs)[::-1][:3]
    nb_results = []
    for i in nb_top3_idx:
        prob = round(float(nb_probs[i]) * 100, 1)
        disease = label_enc.classes_[i]
        risk = classify_risk(prob)
        nb_results.append({
            'disease': disease.replace('_', ' '),
            'disease_key': disease,
            'probability': prob,
            'risk': risk,
            'info': DISEASE_INFO.get(disease, ''),
            'guidance': GUIDANCE[risk]
        })
    top_disease = rf_results[0]['disease']
    top_risk = rf_results[0]['risk']

    save_assessment(
        data.get('age'),
        data.get('gender'),
        top_disease,
        top_risk
)

    return jsonify({
        'rf': rf_results,
        'nb': nb_results,
        'rf_accuracy': model_stats['rf_accuracy'],
        'nb_accuracy': model_stats['nb_accuracy'],
    })


@app.route('/api/hospitals', methods=['GET'])
def hospitals():
    lat = request.args.get('lat')
    lng = request.args.get('lng')
    api_key = request.args.get('key', '')

    if api_key and api_key != 'DEMO':
        # Return the Places API URL for client to call
        return jsonify({'mode': 'live', 'lat': lat, 'lng': lng})

    # Demo fallback
    demo = [
        {'name': 'Apollo Hospitals', 'address': 'Jubilee Hills, Hyderabad', 'distance': '2.1 km', 'maps_url': 'https://maps.google.com/?q=Apollo+Hospitals+Jubilee+Hills+Hyderabad'},
        {'name': 'KIMS Hospital',     'address': 'Minister Road, Secunderabad', 'distance': '3.4 km', 'maps_url': 'https://maps.google.com/?q=KIMS+Hospital+Secunderabad'},
        {'name': 'Yashoda Hospital',  'address': 'Malakpet, Hyderabad',   'distance': '4.7 km', 'maps_url': 'https://maps.google.com/?q=Yashoda+Hospital+Malakpet+Hyderabad'},
        {'name': 'Nizam\'s Institute', 'address': 'Punjagutta, Hyderabad',  'distance': '5.2 km', 'maps_url': 'https://maps.google.com/?q=Nizams+Institute+Hyderabad'},
        {'name': 'Care Hospitals',    'address': 'Banjara Hills, Hyderabad','distance': '6.0 km', 'maps_url': 'https://maps.google.com/?q=Care+Hospitals+Banjara+Hills+Hyderabad'},
    ]
    return jsonify({'mode': 'demo', 'hospitals': demo})
@app.route('/api/history')
def history():

    conn = sqlite3.connect(DB_PATH)

    conn.row_factory = sqlite3.Row

    cursor = conn.cursor()

    cursor.execute("""
        SELECT *
        FROM assessment_history
        ORDER BY id DESC
        LIMIT 50
    """)

    rows = cursor.fetchall()

    conn.close()

    return jsonify([
        dict(row)
        for row in rows
    ])


if __name__ == '__main__':
    app.run(debug=True, port=5000)
