// symptoms.js — symptom definitions and NLP keyword extraction

const SYMPTOMS = [
  { key: 'Fever',            icon: '🌡️',  label: 'Fever' },
  { key: 'Cough',            icon: '😮‍💨', label: 'Cough' },
  { key: 'Headache',         icon: '🤕',  label: 'Headache' },
  { key: 'Fatigue',          icon: '😴',  label: 'Fatigue' },
  { key: 'Nausea',           icon: '🤢',  label: 'Nausea' },
  { key: 'Vomiting',         icon: '🤮',  label: 'Vomiting' },
  { key: 'Chest_Pain',       icon: '💔',  label: 'Chest Pain' },
  { key: 'Breathlessness',   icon: '😮',  label: 'Breathlessness' },
  { key: 'Sore_Throat',      icon: '🗣️',  label: 'Sore Throat' },
  { key: 'Dizziness',        icon: '💫',  label: 'Dizziness' },
  { key: 'Body_Ache',        icon: '🦴',  label: 'Body Ache' },
  { key: 'Loss_of_Appetite', icon: '🍽️',  label: 'Loss of Appetite' },
  { key: 'Sweating',         icon: '💧',  label: 'Sweating' },
  { key: 'Chills',           icon: '🥶',  label: 'Chills' },
  { key: 'Abdominal_Pain',   icon: '🤲',  label: 'Abdominal Pain' },
  { key: 'Diarrhea',         icon: '🚽',  label: 'Diarrhea' },
  { key: 'Weakness',         icon: '😪',  label: 'Weakness' },
  { key: 'Joint_Pain',       icon: '🦵',  label: 'Joint Pain' },
  { key: 'Stress_Level',     icon: '😰',  label: 'Stress' },
  { key: 'Heartburn',        icon: '🔥',  label: 'Heartburn' },
  { key: 'Palpitations',     icon: '💓',  label: 'Palpitations' },
  { key: 'Sleep_Disturbance',icon: '🌙',  label: 'Sleep Issues' },
  { key: 'Weight_Loss',      icon: '⚖️',  label: 'Weight Loss' },
];

// Selected symptom values: key -> 0/1/2/3
const selectedSymptoms = {};

// NLP keyword mapping
const NLP_KEYWORDS = {
  fever:            'Fever',
  temperature:      'Fever',
  'high temp':      'Fever',
  cough:            'Cough',
  coughing:         'Cough',
  headache:         'Headache',
  'head ache':      'Headache',
  'head pain':      'Headache',
  fatigue:          'Fatigue',
  tired:            'Fatigue',
  tiredness:        'Fatigue',
  exhausted:        'Fatigue',
  nausea:           'Nausea',
  nauseous:         'Nausea',
  vomit:            'Vomiting',
  vomiting:         'Vomiting',
  'chest pain':     'Chest_Pain',
  'chest ache':     'Chest_Pain',
  'chest tightness':'Chest_Pain',
  breathless:       'Breathlessness',
  breathlessness:   'Breathlessness',
  'short of breath':'Breathlessness',
  'difficulty breathing':'Breathlessness',
  'sore throat':    'Sore_Throat',
  'throat pain':    'Sore_Throat',
  dizziness:        'Dizziness',
  dizzy:            'Dizziness',
  lightheaded:      'Dizziness',
  'body ache':      'Body_Ache',
  'body pain':      'Body_Ache',
  'muscle ache':    'Body_Ache',
  'muscle pain':    'Body_Ache',
  'loss of appetite':'Loss_of_Appetite',
  'no appetite':    'Loss_of_Appetite',
  sweating:         'Sweating',
  sweat:            'Sweating',
  chills:           'Chills',
  shivering:        'Chills',
  'abdominal pain': 'Abdominal_Pain',
  'stomach pain':   'Abdominal_Pain',
  'stomach ache':   'Abdominal_Pain',
  'tummy ache':     'Abdominal_Pain',
  diarrhea:         'Diarrhea',
  diarrhoea:        'Diarrhea',
  'loose motion':   'Diarrhea',
  weakness:         'Weakness',
  weak:             'Weakness',
  'joint pain':     'Joint_Pain',
  'joint ache':     'Joint_Pain',
  stress:           'Stress_Level',
  anxiety:          'Stress_Level',
  heartburn:        'Heartburn',
  'acid reflux':    'Heartburn',
  acidity:          'Heartburn',
  palpitation:      'Palpitations',
  palpitations:     'Palpitations',
  'heart racing':   'Palpitations',
  'sleep problem':  'Sleep_Disturbance',
  insomnia:         'Sleep_Disturbance',
  'weight loss':    'Weight_Loss',
  'losing weight':  'Weight_Loss',
};

const SEVERITY_KEYWORDS = {
  severe: 3, 'very bad': 3, intense: 3, extreme: 3, high: 3, serious: 3, bad: 3,
  moderate: 2, medium: 2, intermediate: 2,
  mild: 1, slight: 1, little: 1, 'a bit': 1, minor: 1, light: 1, low: 1,
};

function detectSeverity(text, position) {
  const before = text.slice(Math.max(0, position - 30), position).toLowerCase();
  for (const [kw, val] of Object.entries(SEVERITY_KEYWORDS)) {
    if (before.includes(kw)) return val;
  }
  return 1; // default mild if not specified
}

function analyzeText() {
  const text = document.getElementById('symptomText').value;
  const lower = text.toLowerCase();
  const detected = {};

  // Sort keywords by length desc (match longer phrases first)
  const sortedKw = Object.entries(NLP_KEYWORDS).sort((a, b) => b[0].length - a[0].length);

  for (const [kw, symptomKey] of sortedKw) {
    const idx = lower.indexOf(kw);
    if (idx !== -1 && !detected[symptomKey]) {
      const sev = detectSeverity(lower, idx);
      detected[symptomKey] = sev;
    }
  }

  const count = Object.keys(detected).length;
  const resultDiv = document.getElementById('textResult');
  resultDiv.classList.remove('hidden');

  if (count === 0) {
    resultDiv.textContent = t('no_symptoms_detected');
    return;
  }

  // Apply to selectedSymptoms
  Object.assign(selectedSymptoms, detected);
  renderSymptomGrid();

  const names = Object.keys(detected).map(k => {
    const s = SYMPTOMS.find(x => x.key === k);
    return s ? s.label : k;
  });
  resultDiv.innerHTML = `✅ <strong>${count} ${t('symptoms_detected')}:</strong> ${names.join(', ')}`;

  // Switch to cards tab
  switchTab('cards', document.querySelector('.tab-btn'));
}

function renderSymptomGrid() {
  const grid = document.getElementById('symptomGrid');
  if (!grid) return;
  grid.innerHTML = '';

  SYMPTOMS.forEach(({ key, icon, label }) => {
    const val = selectedSymptoms[key] || 0;
    const sevMap = { 0: 'none', 1: 'mild', 2: 'moderate', 3: 'severe' };
    const sev = sevMap[val];

    const card = document.createElement('div');
    card.className = `symptom-card${val > 0 ? ' selected-' + sev : ''}`;
    card.dataset.key = key;
    card.onclick = () => openSeverityModal(key, label);

    const labelText = t(`sym_${key}`) !== `sym_${key}` ? t(`sym_${key}`) : label;
    const badgeClass = val > 0 ? `badge-${sev}` : 'badge-none';
    const badgeText = val > 0 ? t(sev) : '';

    card.innerHTML = `
      <div class="symptom-icon">${icon}</div>
      <div class="symptom-name">${labelText}</div>
      <div class="symptom-badge ${badgeClass}">${badgeText}</div>
    `;
    grid.appendChild(card);
  });
}

let activeSymptomKey = '';

function openSeverityModal(key, label) {
  activeSymptomKey = key;
  document.getElementById('modalSymptomName').textContent = label;
  document.getElementById('severityModal').classList.remove('hidden');
}

function setSeverity(val) {
  if (!activeSymptomKey) return;
  if (selectedSymptoms[activeSymptomKey] === val) {
    delete selectedSymptoms[activeSymptomKey];
  } else {
    selectedSymptoms[activeSymptomKey] = val;
  }
  closeSeverityModal();
  renderSymptomGrid();
}

function closeSeverityModal() {
  document.getElementById('severityModal').classList.add('hidden');
  activeSymptomKey = '';
}

function closeModal(e) {
  if (e.target.classList.contains('modal-overlay')) closeSeverityModal();
}
