"""
train_models.py
Run this script to train and save ML models from your dataset.
Usage: python scripts/train_models.py --dataset path/to/dataset.xlsx
"""

import argparse, os, json, pickle
import pandas as pd
import numpy as np
from sklearn.ensemble import RandomForestClassifier
from sklearn.naive_bayes import GaussianNB
from sklearn.preprocessing import LabelEncoder
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score, classification_report

def train(dataset_path, models_dir='models'):
    os.makedirs(models_dir, exist_ok=True)
    print(f"Loading dataset: {dataset_path}")
    df = pd.read_excel(dataset_path)
    print(f"Dataset shape: {df.shape}")

    df['Gender_enc'] = (df['Gender'] == 'Male').astype(int)

    feature_cols = [
        'Age', 'Gender_enc', 'Duration_Days',
        'Diabetes_History', 'Hypertension_History', 'Asthma_History', 'HeartDisease_History',
        'Fever', 'Cough', 'Headache', 'Fatigue', 'Nausea', 'Vomiting', 'Chest_Pain',
        'Breathlessness', 'Sore_Throat', 'Dizziness', 'Body_Ache', 'Loss_of_Appetite',
        'Sweating', 'Chills', 'Abdominal_Pain', 'Diarrhea', 'Weakness', 'Joint_Pain',
        'Stress_Level', 'Heartburn', 'Palpitations', 'Sleep_Disturbance', 'Weight_Loss'
    ]

    X = df[feature_cols].values
    le = LabelEncoder()
    y = le.fit_transform(df['Disease'])

    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

    print("\nTraining Random Forest...")
    rf = RandomForestClassifier(n_estimators=150, random_state=42, n_jobs=-1)
    rf.fit(X_train, y_train)
    rf_acc = accuracy_score(y_test, rf.predict(X_test))
    print(f"  Accuracy: {rf_acc:.4f} ({rf_acc*100:.2f}%)")

    print("\nTraining Naive Bayes...")
    nb = GaussianNB()
    nb.fit(X_train, y_train)
    nb_acc = accuracy_score(y_test, nb.predict(X_test))
    print(f"  Accuracy: {nb_acc:.4f} ({nb_acc*100:.2f}%)")

    print("\nClassification Report (Random Forest):")
    print(classification_report(y_test, rf.predict(X_test), target_names=le.classes_))

    # Save
    pickle.dump(rf, open(os.path.join(models_dir, 'rf_model.pkl'), 'wb'))
    pickle.dump(nb, open(os.path.join(models_dir, 'nb_model.pkl'), 'wb'))
    pickle.dump(le, open(os.path.join(models_dir, 'label_encoder.pkl'), 'wb'))
    json.dump(feature_cols, open(os.path.join(models_dir, 'feature_cols.json'), 'w'))
    json.dump({
        'rf_accuracy': round(rf_acc * 100, 2),
        'nb_accuracy': round(nb_acc * 100, 2),
        'classes': le.classes_.tolist(),
        'n_train': len(X_train),
        'n_test':  len(X_test),
    }, open(os.path.join(models_dir, 'model_stats.json'), 'w'), indent=2)

    print(f"\nAll models saved to '{models_dir}/'")
    print(f"  RF Accuracy : {rf_acc*100:.2f}%")
    print(f"  NB Accuracy : {nb_acc*100:.2f}%")

if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--dataset', required=True, help='Path to .xlsx dataset')
    parser.add_argument('--models_dir', default='models', help='Output directory for models')
    args = parser.parse_args()
    train(args.dataset, args.models_dir)
