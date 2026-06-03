import sqlite3
import os

DB_PATH = os.path.join("database", "history.db")

conn = sqlite3.connect(DB_PATH)

cursor = conn.cursor()

cursor.execute("""
CREATE TABLE IF NOT EXISTS assessment_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    assessment_time TEXT,
    age INTEGER,
    gender TEXT,
    predicted_disease TEXT,
    risk_level TEXT
)
""")

conn.commit()
conn.close()

print("Database created successfully")