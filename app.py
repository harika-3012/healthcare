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

DISEASE_PRECAUTIONS = {
    'Flu': {
        'description': 'Influenza is a viral infection that attacks your respiratory system — nose, throat and lungs.',
        'precautions': [
            'Rest adequately and avoid strenuous activity',
            'Drink plenty of fluids — water, warm broths and herbal teas',
            'Take fever-reducing medication as directed by a doctor',
            'Avoid contact with others to prevent spread',
            'Get an annual flu vaccination for prevention',
        ],
        'consult': 'Consult a doctor if fever exceeds 39°C, breathing difficulty occurs, or symptoms worsen after 5 days.'
    },
    'Cold': {
        'description': 'The common cold is a viral infection of the upper respiratory tract, primarily the nose and throat.',
        'precautions': [
            'Rest and stay warm',
            'Drink warm fluids to soothe the throat',
            'Use saline nasal rinses to relieve congestion',
            'Wash hands frequently to prevent spreading',
            'Avoid smoking and smoke-filled environments',
        ],
        'consult': 'See a doctor if symptoms last more than 10 days or if you develop a high fever or severe sore throat.'
    },
    'Migraine': {
        'description': 'Migraine is a neurological condition causing intense, recurring headaches often accompanied by nausea and sensitivity to light.',
        'precautions': [
            'Rest in a quiet, dark room during an attack',
            'Apply cold or warm compresses to the head or neck',
            'Stay hydrated and avoid skipping meals',
            'Identify and avoid personal migraine triggers',
            'Maintain a regular sleep schedule',
        ],
        'consult': 'Seek medical attention if headaches are frequent, very severe, or accompanied by neurological symptoms.'
    },
    'Food_Poisoning': {
        'description': 'Food poisoning results from eating contaminated food and causes symptoms like nausea, vomiting, and diarrhea.',
        'precautions': [
            'Stay well hydrated to replace lost fluids',
            'Eat bland foods like rice, toast, and bananas',
            'Avoid dairy, fatty, or spicy foods until recovered',
            'Practice strict hand hygiene before handling food',
            'Ensure food is stored and cooked at safe temperatures',
        ],
        'consult': 'See a doctor if vomiting or diarrhea is severe, if there is blood in stool, or if symptoms persist beyond 3 days.'
    },
    'Heart_Disease': {
        'description': 'Heart disease encompasses conditions affecting the heart\'s structure and function, including coronary artery disease.',
        'precautions': [
            'Follow a heart-healthy, low-sodium diet',
            'Exercise regularly as advised by your doctor',
            'Take prescribed medications consistently',
            'Monitor blood pressure and cholesterol regularly',
            'Avoid smoking and limit alcohol consumption',
        ],
        'consult': 'Seek emergency care immediately for chest pain, shortness of breath, or sudden dizziness. Regular cardiology follow-ups are essential.'
    },
    'Viral_Fever': {
        'description': 'Viral fever is a body temperature rise caused by a viral infection, often accompanied by body aches and fatigue.',
        'precautions': [
            'Take rest and avoid exertion',
            'Stay well hydrated with water and electrolyte drinks',
            'Use fever-reducing medications as directed',
            'Wear lightweight, breathable clothing',
            'Monitor temperature regularly',
        ],
        'consult': 'Consult a doctor if fever exceeds 39°C, persists beyond 5 days, or if you experience severe headache or rash.'
    },
    'Gastritis': {
        'description': 'Gastritis is inflammation of the stomach lining, causing pain, nausea, and digestive discomfort.',
        'precautions': [
            'Eat smaller, more frequent meals',
            'Avoid spicy, acidic, and fatty foods',
            'Limit caffeine and alcohol intake',
            'Do not take NSAIDs without medical advice',
            'Manage stress through relaxation techniques',
        ],
        'consult': 'See a doctor for persistent stomach pain, vomiting blood, or black stools.'
    },
    'Anxiety': {
        'description': 'Anxiety disorder involves persistent, excessive worry and fear that interferes with daily activities.',
        'precautions': [
            'Practice deep breathing and relaxation exercises',
            'Maintain regular physical activity',
            'Get adequate sleep each night',
            'Limit caffeine and alcohol',
            'Connect with supportive friends and family',
        ],
        'consult': 'Seek professional help if anxiety significantly impacts daily life. A mental health professional can provide therapy and treatment options.'
    },
    'Diabetes': {
        'description': 'Diabetes is a chronic condition affecting how the body processes blood sugar (glucose).',
        'precautions': [
            'Avoid excessive sugar and refined carbohydrate intake',
            'Drink sufficient water throughout the day',
            'Monitor blood sugar levels regularly',
            'Exercise regularly — at least 30 minutes daily',
            'Follow prescribed medication and diet plan',
        ],
        'consult': 'Regular consultations with your physician are essential. Report any unusual symptoms like extreme thirst or blurred vision immediately.'
    },
    'Hypertension': {
        'description': 'Hypertension (high blood pressure) is a condition where blood pressure in the arteries is persistently elevated.',
        'precautions': [
            'Reduce sodium (salt) intake in your diet',
            'Maintain a healthy weight',
            'Exercise regularly — walking, swimming, or cycling',
            'Take prescribed medications consistently',
            'Monitor blood pressure at home regularly',
        ],
        'consult': 'Have regular check-ups with your doctor. Seek emergency care for sudden severe headache, chest pain, or vision changes.'
    },
    'Asthma': {
        'description': 'Asthma is a chronic lung condition causing airway inflammation and breathing difficulties triggered by various factors.',
        'precautions': [
            'Identify and avoid asthma triggers (dust, pollen, smoke)',
            'Always carry your prescribed inhaler',
            'Keep indoor air clean and well-ventilated',
            'Follow your asthma action plan from your doctor',
            'Get vaccinated against flu and pneumonia',
        ],
        'consult': 'Seek immediate medical help during an asthma attack if your inhaler does not provide relief.'
    },
    'Pneumonia': {
        'description': 'Pneumonia is an infection that inflames the air sacs in one or both lungs, which may fill with fluid.',
        'precautions': [
            'Get plenty of rest to allow your body to heal',
            'Drink fluids to stay hydrated',
            'Take antibiotics or antivirals as prescribed',
            'Use a humidifier to ease breathing',
            'Avoid smoking and secondhand smoke',
        ],
        'consult': 'Pneumonia requires prompt medical evaluation. Seek immediate care if you experience difficulty breathing, blue-tinged lips, or confusion.'
    },
    'Typhoid': {
        'description': 'Typhoid fever is a bacterial infection caused by Salmonella typhi, spread through contaminated food and water.',
        'precautions': [
            'Drink only purified or boiled water',
            'Wash hands thoroughly before eating',
            'Avoid street food and uncooked vegetables',
            'Complete the full course of antibiotics as prescribed',
            'Get vaccinated if traveling to high-risk areas',
        ],
        'consult': 'Typhoid requires antibiotic treatment. Consult a doctor promptly if you have sustained high fever, abdominal pain, or weakness.'
    },
    'Dengue': {
        'description': 'Dengue fever is a mosquito-borne viral disease causing high fever, severe headache, and joint pain.',
        'precautions': [
            'Use mosquito repellents and protective clothing',
            'Eliminate stagnant water around your home',
            'Sleep under mosquito nets',
            'Stay well hydrated',
            'Monitor platelet count as advised by your doctor',
        ],
        'consult': 'Seek immediate medical care if you experience severe abdominal pain, persistent vomiting, or bleeding symptoms.'
    },
    'Malaria': {
        'description': 'Malaria is a parasitic disease transmitted through the bites of infected Anopheles mosquitoes.',
        'precautions': [
            'Use mosquito nets and insect repellents',
            'Take antimalarial medications if prescribed or traveling to endemic areas',
            'Wear long sleeves and pants in the evening',
            'Eliminate standing water near your home',
            'Complete the full course of treatment',
        ],
        'consult': 'Malaria requires immediate medical treatment. Seek care urgently for cyclic fever, chills, and sweating episodes.'
    },
    'Arthritis': {
        'description': 'Arthritis is inflammation of the joints causing pain, swelling, stiffness, and reduced range of motion.',
        'precautions': [
            'Stay physically active with low-impact exercises',
            'Maintain a healthy weight to reduce joint stress',
            'Apply warm or cold compresses to affected joints',
            'Take prescribed anti-inflammatory medications',
            'Use assistive devices to reduce joint strain',
        ],
        'consult': 'Regular follow-up with a rheumatologist is recommended. Report any sudden joint swelling or increased pain.'
    },
    'Kidney_Stone': {
        'description': 'Kidney stones are hard deposits of minerals and salts that form inside the kidneys.',
        'precautions': [
            'Drink at least 2–3 litres of water daily',
            'Reduce sodium and animal protein intake',
            'Limit oxalate-rich foods if advised (spinach, nuts)',
            'Maintain a healthy body weight',
            'Follow dietary guidance from your urologist',
        ],
        'consult': 'Seek medical attention for severe back or side pain, blood in urine, or painful urination.'
    },
    'Ulcer': {
        'description': 'Peptic ulcers are open sores that develop on the lining of the stomach or upper portion of the small intestine.',
        'precautions': [
            'Avoid spicy, acidic, and fatty foods',
            'Eat regular, smaller meals throughout the day',
            'Limit alcohol and avoid smoking',
            'Reduce stress through relaxation techniques',
            'Take prescribed medications as directed',
        ],
        'consult': 'See a doctor for persistent stomach pain, nausea, or signs of bleeding such as dark stools or vomiting blood.'
    },
    'Depression': {
        'description': 'Depression is a mood disorder causing persistent sadness, loss of interest, and various physical and emotional symptoms.',
        'precautions': [
            'Maintain a regular daily routine and sleep schedule',
            'Engage in regular physical exercise',
            'Stay connected with supportive friends and family',
            'Avoid alcohol and recreational drugs',
            'Follow prescribed treatment plan consistently',
        ],
        'consult': 'Depression responds well to professional treatment. Seek help from a mental health professional for therapy and support.'
    },
    'Allergy': {
        'description': 'Allergies occur when the immune system reacts abnormally to a foreign substance such as pollen, food, or medication.',
        'precautions': [
            'Identify and avoid known allergens',
            'Keep windows closed during high pollen season',
            'Use air purifiers indoors',
            'Carry antihistamine medication if prescribed',
            'Wear a medical alert bracelet for severe allergies',
        ],
        'consult': 'Seek emergency medical care for severe allergic reactions (anaphylaxis). An allergist can help identify triggers and treatment.'
    },
    'Sinusitis': {
        'description': 'Sinusitis is inflammation of the sinuses causing congestion, facial pressure, and difficulty breathing through the nose.',
        'precautions': [
            'Use saline nasal rinses to keep passages clear',
            'Inhale steam to relieve congestion',
            'Stay well hydrated',
            'Avoid allergens and irritants',
            'Use a humidifier in dry environments',
        ],
        'consult': 'See a doctor if symptoms persist more than 10 days, or if you have severe facial pain, high fever, or visual changes.'
    },
    'Bronchitis': {
        'description': 'Bronchitis is inflammation of the bronchial tubes causing cough, mucus production, and breathing discomfort.',
        'precautions': [
            'Get adequate rest',
            'Drink plenty of fluids to thin mucus',
            'Avoid smoking and smoke-filled areas',
            'Use a humidifier to ease breathing',
            'Cover your mouth when coughing',
        ],
        'consult': 'Consult a doctor if cough produces discoloured mucus, if symptoms persist beyond 3 weeks, or if you develop fever or breathlessness.'
    },
    'Anemia': {
        'description': 'Anemia occurs when you do not have enough healthy red blood cells to carry adequate oxygen to your body\'s tissues.',
        'precautions': [
            'Eat iron-rich foods — leafy greens, lentils, meat',
            'Include vitamin C-rich foods to enhance iron absorption',
            'Take iron supplements as prescribed',
            'Avoid excessive tea and coffee with meals',
            'Get regular blood tests to monitor hemoglobin levels',
        ],
        'consult': 'Consult a physician for persistent fatigue, shortness of breath, or pale complexion. Anemia requires diagnosis of its underlying cause.'
    },
    'Thyroid_Disorder': {
        'description': 'Thyroid disorders involve over- or under-production of thyroid hormones, affecting metabolism, energy, and overall health.',
        'precautions': [
            'Take thyroid medication at the same time every day',
            'Follow a balanced, iodine-appropriate diet',
            'Avoid foods that can interfere with thyroid function (excessive soy, raw cruciferous vegetables)',
            'Monitor energy levels and weight changes',
            'Get regular thyroid function blood tests',
        ],
        'consult': 'Regular endocrinologist appointments are essential. Report rapid heartbeat, sudden weight changes, or extreme fatigue promptly.'
    },
}

# Default precautions for any disease not in the dictionary
DEFAULT_PRECAUTIONS = {
    'description': 'Based on your symptoms, please consult a qualified healthcare professional for an accurate diagnosis and treatment plan.',
    'precautions': [
        'Rest adequately and stay well hydrated',
        'Monitor your symptoms and note any changes',
        'Avoid self-medication without medical guidance',
        'Follow a balanced diet to support recovery',
        'Keep a record of symptoms to share with your doctor',
    ],
    'consult': 'Please consult a qualified healthcare professional for proper diagnosis and treatment.'
}


def save_assessment(age, gender, disease, risk):
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute("""
        INSERT INTO assessment_history
        (assessment_time, age, gender, predicted_disease, risk_level)
        VALUES (?, ?, ?, ?, ?)
    """, (
        datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
        age, gender, disease, risk
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

    # Random Forest (primary)
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

    # Naive Bayes (secondary, used for consensus)
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

    top_disease_key = rf_results[0]['disease_key']
    top_disease = rf_results[0]['disease']
    top_risk = rf_results[0]['risk']
    top_prob = rf_results[0]['probability']

    # Get precautions for top disease
    precautions = DISEASE_PRECAUTIONS.get(top_disease_key, DEFAULT_PRECAUTIONS)

    save_assessment(data.get('age'), data.get('gender'), top_disease, top_risk)

    return jsonify({
        'rf': rf_results,
        'nb': nb_results,
        'top_disease': top_disease,
        'top_disease_key': top_disease_key,
        'top_risk': top_risk,
        'top_probability': top_prob,
        'precautions': precautions,
    })


@app.route('/api/hospitals', methods=['GET'])
def hospitals():
    lat = request.args.get('lat')
    lng = request.args.get('lng')
    api_key = request.args.get('key', '')

    if api_key and api_key != 'DEMO':
        return jsonify({'mode': 'live', 'lat': lat, 'lng': lng})

    demo = [
        {'name': 'Apollo Hospitals', 'address': 'Jubilee Hills, Hyderabad', 'type': 'Multi-Specialty Hospital', 'distance': '2.1 km', 'maps_url': 'https://maps.google.com/?q=Apollo+Hospitals+Jubilee+Hills+Hyderabad'},
        {'name': 'KIMS Hospital', 'address': 'Minister Road, Secunderabad', 'type': 'General Hospital', 'distance': '3.4 km', 'maps_url': 'https://maps.google.com/?q=KIMS+Hospital+Secunderabad'},
        {'name': 'Yashoda Hospital', 'address': 'Malakpet, Hyderabad', 'type': 'Multi-Specialty Hospital', 'distance': '4.7 km', 'maps_url': 'https://maps.google.com/?q=Yashoda+Hospital+Malakpet+Hyderabad'},
        {'name': "Nizam's Institute", 'address': 'Punjagutta, Hyderabad', 'type': 'Teaching Hospital', 'distance': '5.2 km', 'maps_url': 'https://maps.google.com/?q=Nizams+Institute+Hyderabad'},
        {'name': 'Care Hospitals', 'address': 'Banjara Hills, Hyderabad', 'type': 'Cardiac Care Center', 'distance': '6.0 km', 'maps_url': 'https://maps.google.com/?q=Care+Hospitals+Banjara+Hills+Hyderabad'},
    ]
    return jsonify({'mode': 'demo', 'hospitals': demo})


@app.route('/api/history')
def history():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    cursor.execute("""
        SELECT * FROM assessment_history
        ORDER BY id DESC LIMIT 50
    """)
    rows = cursor.fetchall()
    conn.close()
    return jsonify([dict(row) for row in rows])


@app.route('/api/history/<int:record_id>', methods=['DELETE'])
def delete_history_record(record_id):
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute("DELETE FROM assessment_history WHERE id = ?", (record_id,))
    conn.commit()
    conn.close()
    return jsonify({'success': True})


@app.route('/api/history', methods=['DELETE'])
def delete_all_history():
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute("DELETE FROM assessment_history")
    conn.commit()
    conn.close()
    return jsonify({'success': True})


if __name__ == '__main__':
    app.run(debug=True, port=5000)
