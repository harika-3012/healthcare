// app.js — main application logic

let currentStep = 1;
let selectedGender = '';
let selectedHistory = new Set();
let selectedDuration = '';
let lastResults = null;

// ── HOME PAGE ────────────────────────────────────────────────────

function startAssessment() {
  goToStep(1);
}

function showHistory() {
  goToStep('history');
}

function showHome() {
  goToStep('home');
}

// ── STEP NAVIGATION ──────────────────────────────────────────────

function goToStep(n) {
  if (n === 2 && !validateStep1()) return;
  if (n === 3 && !validateStep2()) return;
  if (n === 4 && !validateStep3()) return;

  document.querySelectorAll('.step-section').forEach(s => s.classList.remove('active'));
  document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));

  const progressContainer = document.getElementById('progressContainer');

  if (n === 'home') {
    document.getElementById('stepHome').classList.add('active');
    progressContainer.style.display = 'none';
    const homeLink = document.getElementById('navHome');
    if (homeLink) homeLink.classList.add('active');
    currentStep = 0;
    window.scrollTo({ top: 0, behavior: 'smooth' });
    return;
  }

  if (n === 'history') {
    document.getElementById('stepHistory').classList.add('active');
    progressContainer.style.display = 'none';
    const histLink = document.getElementById('navHistory');
    if (histLink) histLink.classList.add('active');
    currentStep = 0;
    loadHistory();
    window.scrollTo({ top: 0, behavior: 'smooth' });
    return;
  }

  document.getElementById(`step${n}`).classList.add('active');
  currentStep = n;
  progressContainer.style.display = 'block';

  const pct = (n / 5) * 100;
  document.getElementById('progressBar').style.width = pct + '%';

  document.querySelectorAll('.step-label').forEach(el => {
    const s = parseInt(el.dataset.step);
    el.classList.remove('active', 'done');
    if (s === n) el.classList.add('active');
    else if (s < n) el.classList.add('done');
  });

  window.scrollTo({ top: 0, behavior: 'smooth' });

  if (n === 3 && document.getElementById('symptomGrid').children.length === 0) {
    renderSymptomGrid();
  }
}

// ── VALIDATION ───────────────────────────────────────────────────

function showFieldError(errorId, show) {
  const el = document.getElementById(errorId);
  if (!el) return;
  el.classList.toggle('hidden', !show);
}

function clearAllErrors() {
  document.querySelectorAll('.field-error').forEach(el => el.classList.add('hidden'));
  document.querySelectorAll('.input-field').forEach(el => el.classList.remove('input-error'));
}

function validateStep1() {
  clearAllErrors();
  let valid = true;

  const ageEl = document.getElementById('age');
  const age = parseInt(ageEl.value);
  if (!ageEl.value || isNaN(age) || age < 1 || age > 120) {
    ageEl.classList.add('input-error');
    showFieldError('age-error', true);
    ageEl.focus();
    valid = false;
  }

  if (!selectedGender) {
    showFieldError('gender-error', true);
    if (valid) document.querySelector('.gender-btn') && document.querySelector('.gender-btn').focus();
    valid = false;
  }

  return valid;
}

function validateStep2() {
  // Auto-select "None" if nothing selected
  if (selectedHistory.size === 0) {
    const noneCard = document.querySelector('.history-card[data-condition="none"]');
    if (noneCard) {
      noneCard.classList.add('selected');
      selectedHistory.add('none');
    }
  }
  showFieldError('history-error', false);
  return true;
}

function validateStep3() {
  const hasSymptoms = Object.values(selectedSymptoms).some(v => v > 0);
  if (!hasSymptoms) {
    showFieldError('symptoms-error', true);
    return false;
  }
  showFieldError('symptoms-error', false);
  return true;
}

function validateStep4() {
  if (!selectedDuration) {
    showFieldError('duration-error', true);
    return false;
  }
  showFieldError('duration-error', false);
  return true;
}

// ── GENDER ───────────────────────────────────────────────────────

function selectGender(btn) {
  document.querySelectorAll('.gender-btn').forEach(b => b.classList.remove('selected'));
  btn.classList.add('selected');
  selectedGender = btn.dataset.value;
  showFieldError('gender-error', false);
}

// ── HISTORY ──────────────────────────────────────────────────────

function toggleHistory(card) {
  const cond = card.dataset.condition;
  if (cond === 'none') {
    selectedHistory.clear();
    document.querySelectorAll('.history-card').forEach(c => c.classList.remove('selected'));
    card.classList.add('selected');
    selectedHistory.add('none');
    showFieldError('history-error', false);
    return;
  }
  const noneCard = document.querySelector('.history-card[data-condition="none"]');
  if (noneCard) noneCard.classList.remove('selected');
  selectedHistory.delete('none');

  if (selectedHistory.has(cond)) {
    selectedHistory.delete(cond);
    card.classList.remove('selected');
  } else {
    selectedHistory.add(cond);
    card.classList.add('selected');
  }

  if (selectedHistory.size > 0) showFieldError('history-error', false);
}

// ── DURATION ─────────────────────────────────────────────────────

function selectDuration(card) {
  document.querySelectorAll('.duration-card').forEach(c => c.classList.remove('selected'));
  card.classList.add('selected');
  selectedDuration = card.dataset.duration;
  showFieldError('duration-error', false);
}

// ── TABS ─────────────────────────────────────────────────────────

function switchTab(tab, btn) {
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
  const activeBtn = btn || document.querySelector(`.tab-btn[onclick*="${tab}"]`);
  if (activeBtn) activeBtn.classList.add('active');
  const content = document.getElementById(`tab-${tab}`);
  if (content) content.classList.add('active');
}

// ── ASSESSMENT ───────────────────────────────────────────────────

async function runAssessment() {
  if (!validateStep4()) return;

  goToStep(5);

  document.getElementById('resultsLoader').classList.remove('hidden');
  document.getElementById('resultsContent').classList.add('hidden');

  const payload = {
    age:                  parseInt(document.getElementById('age').value),
    gender:               selectedGender,
    duration:             selectedDuration,
    diabetes_history:     selectedHistory.has('diabetes') ? 1 : 0,
    hypertension_history: selectedHistory.has('hypertension') ? 1 : 0,
    asthma_history:       selectedHistory.has('asthma') ? 1 : 0,
    heart_history:        selectedHistory.has('heart') ? 1 : 0,
    symptoms:             { ...selectedSymptoms },
  };

  try {
    const res = await fetch('/api/predict', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    lastResults = { data, payload };
    renderResults(data, payload);
  } catch (err) {
    document.getElementById('resultsLoader').innerHTML =
      '<p style="color:#dc2626">Error running assessment. Please try again.</p>';
  }
}

// ── RENDER RESULTS ───────────────────────────────────────────────

function getMatchLabel(prob) {
  if (prob >= 65) return { label: t('very_strong_match'), cls: 'match-very-strong', barCls: 'bar-very-strong' };
  if (prob >= 40) return { label: t('strong_match'), cls: 'match-strong', barCls: 'bar-strong' };
  return { label: t('possible_match'), cls: 'match-possible', barCls: 'bar-possible' };
}

function getDiseaseIcon(diseaseKey) {
  const icons = {
    'Flu': '🤧', 'Cold': '🤒', 'Migraine': '🤕', 'Food_Poisoning': '🤢',
    'Heart_Disease': '❤️', 'Viral_Fever': '🌡️', 'Gastritis': '🫀',
    'Anxiety': '😰', 'Diabetes': '🩸', 'Hypertension': '💓',
    'Asthma': '🫁', 'Pneumonia': '🫁', 'Typhoid': '🦠',
    'Dengue': '🦟', 'Malaria': '🦟', 'Arthritis': '🦴',
    'Kidney_Stone': '💊', 'Ulcer': '🫃', 'Depression': '😔',
    'Allergy': '🌿', 'Sinusitis': '👃', 'Bronchitis': '😮',
    'Anemia': '🩺', 'Thyroid_Disorder': '💊',
  };
  return icons[diseaseKey] || '🏥';
}

function renderResults(data, payload) {
  document.getElementById('resultsLoader').classList.add('hidden');
  document.getElementById('resultsContent').classList.remove('hidden');

  const top = data.rf[0];

  // Primary result card
  const primaryCard = document.getElementById('primaryResultCard');
  primaryCard.className = 'primary-result-card risk-' + top.risk;
  primaryCard.innerHTML = `
    <div class="primary-result-icon">${getDiseaseIcon(top.disease_key)}</div>
    <div class="primary-result-body">
      <div class="primary-result-risk">${t(top.risk + '_risk')}</div>
      <div class="primary-result-disease">${top.disease.replace(/_/g, ' ')}</div>
      <div class="primary-result-desc">${top.info || t('primary_condition_desc')}</div>
    </div>
  `;

  // Summary cards
  const durationMap = { '1-2': t('duration_1_2'), '3-5': t('duration_3_5'), '6-10': t('duration_6_10'), '10+': t('duration_10plus') };
  document.getElementById('summaryCards').innerHTML = `
    <div class="summary-card">
      <div class="summary-card-label">${t('your_age')}</div>
      <div class="summary-card-value">${payload.age}</div>
    </div>
    <div class="summary-card">
      <div class="summary-card-label">${t('your_gender')}</div>
      <div class="summary-card-value">${payload.gender ? payload.gender.charAt(0).toUpperCase() + payload.gender.slice(1) : '—'}</div>
    </div>
    <div class="summary-card">
      <div class="summary-card-label">${t('your_duration')}</div>
      <div class="summary-card-value">${durationMap[payload.duration] || payload.duration}</div>
    </div>
    <div class="summary-card">
      <div class="summary-card-label">${t('your_risk')}</div>
      <div class="summary-card-value" style="color:${top.risk === 'high' ? '#dc2626' : top.risk === 'moderate' ? '#d97706' : '#16a34a'}">${t(top.risk + '_risk')}</div>
    </div>
  `;

  // Possible conditions (top 3)
  const condList = document.getElementById('conditionsList');
  condList.innerHTML = '';
  data.rf.slice(0, 3).forEach((r, i) => {
    const m = getMatchLabel(r.probability);
    condList.innerHTML += `
      <div class="condition-row">
        <div class="condition-rank${i === 0 ? ' rank-1' : ''}">${i + 1}</div>
        <div class="condition-row-body">
          <div class="condition-name">${r.disease.replace(/_/g, ' ')}</div>
          <span class="condition-match-label ${m.cls}">${m.label}</span>
          <div class="condition-bar-wrap">
            <div class="condition-bar ${m.barCls}" style="width:${Math.min(r.probability, 100)}%"></div>
          </div>
          <div class="condition-info">${r.info}</div>
        </div>
      </div>
    `;
  });

  // Guidance
  const guidanceCard = document.getElementById('guidanceCard');
  const iconMap = { high: '🚨', moderate: '⚠️', low: '✅' };
  guidanceCard.className = 'guidance-card guidance-' + top.risk;
  guidanceCard.innerHTML = `
    <div class="guidance-icon">${iconMap[top.risk]}</div>
    <div class="guidance-body">
      <div class="guidance-title-text">${top.risk === 'high' ? t('high_risk') : top.risk === 'moderate' ? t('moderate_risk') : t('low_risk')}</div>
      <div class="guidance-text">${top.guidance}</div>
    </div>
  `;

  // Precautions
  const prec = data.precautions;
  const precCard = document.getElementById('precautionsCard');
  const listItems = (prec.precautions || []).map(p =>
    `<li><span class="precaution-check">✓</span><span>${p}</span></li>`
  ).join('');
  precCard.innerHTML = `
    <div class="precautions-disease-name">${top.disease.replace(/_/g, ' ')}</div>
    <div class="precautions-desc">${prec.description || ''}</div>
    <ul class="precautions-list">${listItems}</ul>
    ${prec.consult ? `<div style="margin-top:14px;padding:12px 14px;background:#fef3c7;border-radius:8px;font-size:.84rem;color:#92400e;border:1px solid #fde68a">${prec.consult}</div>` : ''}
  `;
}

// ── HOSPITALS ────────────────────────────────────────────────────

async function findHospitals() {
  const btn = document.querySelector('.btn-find-hospitals');
  btn.textContent = t('locating');
  btn.disabled = true;

  try {
    const pos = await getLocation();
    await fetchHospitals(pos.coords.latitude, pos.coords.longitude);
  } catch {
    await fetchHospitals(null, null);
  } finally {
    btn.textContent = t('find_hospitals');
    btn.disabled = false;
  }
}

function getLocation() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) reject(new Error('No geolocation'));
    else navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 8000 });
  });
}

async function fetchHospitals(lat, lng) {
  const apiKey = 'DEMO';
  let url = '/api/hospitals?key=' + apiKey;
  if (lat && lng) url += '&lat=' + lat + '&lng=' + lng;

  const res = await fetch(url);
  const data = await res.json();

  const demoNotice = document.getElementById('demoNotice');
  const list = document.getElementById('hospitalsList');

  if (data.mode === 'demo') {
    demoNotice.textContent = t('demo_mode');
    demoNotice.classList.remove('hidden');
  }

  list.innerHTML = '';
  (data.hospitals || []).forEach(h => {
    list.innerHTML += `
      <div class="hospital-card">
        <div class="hospital-left">
          <div class="hospital-badge-icon">🏥</div>
          <div class="hospital-info">
            <div class="hospital-name">${h.name}</div>
            <div class="hospital-addr">${h.address}</div>
            <div class="hospital-type">${h.type || 'Hospital'}</div>
          </div>
        </div>
        <div class="hospital-right">
          <span class="hospital-dist">${h.distance}</span>
          <a class="btn-maps" href="${h.maps_url}" target="_blank" rel="noopener">${t('open_maps')}</a>
        </div>
      </div>
    `;
  });
  list.classList.remove('hidden');
}

// ── ASSESSMENT HISTORY ───────────────────────────────────────────

async function loadHistory() {
  const container = document.getElementById('historyList');
  if (!container) return;
  container.innerHTML = '<div class="loader-wrap"><div class="loader-spinner"></div></div>';

  try {
    const res = await fetch('/api/history');
    const records = await res.json();
    renderHistoryList(records);
  } catch {
    container.innerHTML = '<p style="color:#dc2626">Failed to load history.</p>';
  }
}

function renderHistoryList(records) {
  const container = document.getElementById('historyList');
  if (!records.length) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">📋</div>
        <p>${t('history_empty')}</p>
      </div>`;
    return;
  }

  container.innerHTML = records.map(r => {
    const dt = new Date(r.assessment_time);
    const day = dt.getDate();
    const month = dt.toLocaleString('default', { month: 'short' });
    const time = dt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const riskKey = r.risk_level ? r.risk_level.toLowerCase() : 'low';
    return `
      <div class="assessment-history-card" id="ah-${r.id}">
        <div class="ah-date-badge">
          <div class="ah-date-day">${day}</div>
          <div class="ah-date-month">${month}</div>
        </div>
        <div class="ah-body">
          <div class="ah-condition">${r.predicted_disease || '—'}</div>
          <div class="ah-meta">${t('your_age')}: ${r.age || '—'} &nbsp;|&nbsp; ${t('your_gender')}: ${r.gender ? r.gender.charAt(0).toUpperCase() + r.gender.slice(1) : '—'} &nbsp;|&nbsp; ${time}</div>
        </div>
        <div class="ah-right">
          <span class="risk-badge risk-${riskKey}">${t(riskKey + '_risk')}</span>
          <button class="btn-danger" onclick="deleteHistoryRecord(${r.id})">${t('history_delete')}</button>
        </div>
      </div>
    `;
  }).join('');
}

async function deleteHistoryRecord(id) {
  try {
    await fetch('/api/history/' + id, { method: 'DELETE' });
    const card = document.getElementById('ah-' + id);
    if (card) card.remove();
    if (!document.querySelector('.assessment-history-card')) {
      document.getElementById('historyList').innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">📋</div>
          <p>${t('history_empty')}</p>
        </div>`;
    }
  } catch { /* ignore */ }
}

async function clearAllHistory() {
  if (!confirm('Clear all assessment history?')) return;
  try {
    await fetch('/api/history', { method: 'DELETE' });
    document.getElementById('historyList').innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">📋</div>
        <p>${t('history_empty')}</p>
      </div>`;
  } catch { /* ignore */ }
}

// ── DOWNLOAD REPORT ──────────────────────────────────────────────

function downloadReport() {
  if (!lastResults) return;
  const { data, payload } = lastResults;
  const top = data.rf[0];
  const prec = data.precautions;
  const now = new Date().toLocaleString();
  const durationMap = { '1-2': '1–2 Days', '3-5': '3–5 Days', '6-10': '6–10 Days', '10+': 'More than 10 Days' };

  const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<title>Health Assessment Report</title>
<style>
  body{font-family:Arial,sans-serif;color:#0f172a;margin:40px;line-height:1.6}
  .header{text-align:center;margin-bottom:30px;padding-bottom:20px;border-bottom:2px solid #1a6eb5}
  .header h1{color:#1a6eb5;font-size:22px;margin:0 0 6px}
  .header p{color:#475569;font-size:13px;margin:0}
  .section{margin-bottom:24px}
  .section-title{font-size:13px;font-weight:700;color:#1a6eb5;text-transform:uppercase;letter-spacing:.05em;margin-bottom:12px;padding-bottom:6px;border-bottom:1px solid #e2e8f0}
  .info-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px}
  .info-item{padding:12px;background:#f8fafc;border-radius:8px}
  .info-label{font-size:11px;color:#94a3b8;text-transform:uppercase;margin-bottom:4px}
  .info-value{font-size:14px;font-weight:600}
  .risk-high{color:#dc2626}.risk-moderate{color:#d97706}.risk-low{color:#16a34a}
  .primary-cond{background:#f0f9ff;border:1px solid #bae6fd;border-radius:10px;padding:16px 20px;margin-bottom:16px}
  .primary-cond h2{margin:0 0 6px;font-size:18px}
  .primary-cond p{margin:0;color:#475569;font-size:13px}
  .prec-item{display:flex;gap:10px;margin-bottom:8px;font-size:13px}
  .check{color:#16a34a;font-weight:700}
  .consult-box{background:#fffbeb;border:1px solid #fde68a;border-radius:8px;padding:12px 14px;font-size:13px;color:#92400e;margin-top:12px}
  .other-cond{padding:8px 12px;background:#f8fafc;border-radius:6px;margin-bottom:6px;font-size:13px}
  .footer{margin-top:30px;padding-top:14px;border-top:1px solid #e2e8f0;font-size:11px;color:#94a3b8;text-align:center}
</style>
</head>
<body>
<div class="header">
  <h1>Health Assessment Report</h1>
  <p>Health Assessment Intelligence System &nbsp;|&nbsp; Generated: ${now}</p>
</div>
<div class="section">
  <div class="section-title">Assessment Summary</div>
  <div class="info-grid">
    <div class="info-item"><div class="info-label">Age</div><div class="info-value">${payload.age}</div></div>
    <div class="info-item"><div class="info-label">Gender</div><div class="info-value">${payload.gender ? payload.gender.charAt(0).toUpperCase() + payload.gender.slice(1) : '—'}</div></div>
    <div class="info-item"><div class="info-label">Duration</div><div class="info-value">${durationMap[payload.duration] || payload.duration}</div></div>
    <div class="info-item"><div class="info-label">Risk Level</div><div class="info-value risk-${top.risk}">${top.risk.charAt(0).toUpperCase() + top.risk.slice(1)} Risk</div></div>
  </div>
</div>
<div class="section">
  <div class="section-title">Primary Condition</div>
  <div class="primary-cond">
    <h2>${top.disease.replace(/_/g, ' ')}</h2>
    <p>${top.info || ''}</p>
  </div>
</div>
<div class="section">
  <div class="section-title">Other Possible Conditions</div>
  ${data.rf.slice(1).map((r, i) => '<div class="other-cond"><strong>' + (i + 2) + '. ' + r.disease.replace(/_/g, ' ') + '</strong> &mdash; ' + r.info + '</div>').join('')}
</div>
<div class="section">
  <div class="section-title">Personalized Guidance</div>
  <div style="padding:14px;background:#f8fafc;border-radius:8px;font-size:13px">${top.guidance}</div>
</div>
<div class="section">
  <div class="section-title">Recommended Precautions</div>
  <p style="font-size:13px;color:#475569;margin-bottom:12px">${prec.description || ''}</p>
  ${(prec.precautions || []).map(p => '<div class="prec-item"><span class="check">&#10003;</span><span>' + p + '</span></div>').join('')}
  ${prec.consult ? '<div class="consult-box">' + prec.consult + '</div>' : ''}
</div>
<div class="footer">
  DISCLAIMER: This report is generated by a preliminary health awareness tool and is NOT a medical diagnosis. Always consult a qualified healthcare professional for accurate diagnosis and treatment.
</div>
</body>
</html>`;

  const blob = new Blob([html], { type: 'text/html' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'health-report-' + new Date().toISOString().slice(0, 10) + '.html';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ── RESET ────────────────────────────────────────────────────────

function resetAssessment() {
  selectedGender = '';
  selectedHistory.clear();
  selectedDuration = '';
  Object.keys(selectedSymptoms).forEach(k => delete selectedSymptoms[k]);
  document.getElementById('age').value = '';
  document.getElementById('symptomText').value = '';
  document.querySelectorAll('.gender-btn').forEach(b => b.classList.remove('selected'));
  document.querySelectorAll('.history-card').forEach(c => c.classList.remove('selected'));
  document.querySelectorAll('.duration-card').forEach(c => c.classList.remove('selected'));
  document.getElementById('textResult').classList.add('hidden');
  document.getElementById('hospitalsList').classList.add('hidden');
  document.getElementById('demoNotice').classList.add('hidden');
  document.getElementById('resultsContent').classList.add('hidden');
  document.getElementById('resultsLoader').classList.remove('hidden');
  clearAllErrors();
  lastResults = null;
  goToStep('home');
}

document.addEventListener('DOMContentLoaded', () => {
  const ageEl = document.getElementById('age');
  if (ageEl) {
    ageEl.addEventListener('input', () => {
      ageEl.classList.remove('input-error');
      showFieldError('age-error', false);
    });
  }
});
