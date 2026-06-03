// app.js — main application logic

let currentStep = 1;
let selectedGender = '';
let selectedHistory = new Set();
let selectedDuration = '';

// ── HOME PAGE ────────────────────────────────────────────────────

function startAssessment() {
  goToStep(1);
}

// ── STEP NAVIGATION ──────────────────────────────────────────────

function goToStep(n) {
  if (n === 2 && !validateStep1()) return;
  if (n === 3 && !validateStep2()) return;
  if (n === 4 && !validateStep3()) return;

  // Clear all step sections
  document.querySelectorAll('.step-section').forEach(s => s.classList.remove('active'));

  // Show progress bar for numbered steps, hide on home
  const progressContainer = document.getElementById('progressContainer');

  if (n === 'home') {
    document.getElementById('stepHome').classList.add('active');
    progressContainer.style.display = 'none';
    currentStep = 0;
    window.scrollTo({ top: 0, behavior: 'smooth' });
    return;
  }

  document.getElementById(`step${n}`).classList.add('active');
  currentStep = n;

  progressContainer.style.display = 'block';

  // Update progress bar
  const pct = (n / 5) * 100;
  document.getElementById('progressBar').style.width = pct + '%';

  document.querySelectorAll('.step-label').forEach(el => {
    const s = parseInt(el.dataset.step);
    el.classList.remove('active', 'done');
    if (s === n) el.classList.add('active');
    else if (s < n) el.classList.add('done');
  });

  window.scrollTo({ top: 0, behavior: 'smooth' });

  // Init symptom grid on step 3
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
    if (valid) document.querySelector('.gender-btn').focus();
    valid = false;
  }

  return valid;
}

function validateStep2() {
  if (selectedHistory.size === 0) {
    showFieldError('history-error', true);
    return false;
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
  // Remove 'none' if selecting specific
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
    age:                    parseInt(document.getElementById('age').value),
    gender:                 selectedGender,
    duration:               selectedDuration,
    diabetes_history:       selectedHistory.has('diabetes') ? 1 : 0,
    hypertension_history:   selectedHistory.has('hypertension') ? 1 : 0,
    asthma_history:         selectedHistory.has('asthma') ? 1 : 0,
    heart_history:          selectedHistory.has('heart') ? 1 : 0,
    symptoms:               { ...selectedSymptoms },
  };

  try {
    const res = await fetch('/api/predict', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    renderResults(data);
  } catch (err) {
    document.getElementById('resultsLoader').innerHTML =
      '<p style="color:#ef4444">Error running assessment. Please try again.</p>';
  }
}

// ── RENDER RESULTS ───────────────────────────────────────────────

function renderResults(data) {
  document.getElementById('resultsLoader').classList.add('hidden');
  document.getElementById('resultsContent').classList.remove('hidden');

  document.getElementById('rfAccuracy').textContent = data.rf_accuracy + '%';
  document.getElementById('nbAccuracy').textContent = data.nb_accuracy + '%';
  document.getElementById('rfAccuracyTag').textContent = data.rf_accuracy + '% accuracy';
  document.getElementById('nbAccuracyTag').textContent = data.nb_accuracy + '% accuracy';

  renderModelResults('rfResults', data.rf);
  renderModelResults('nbResults', data.nb);
  renderGuidance(data.rf);
}

function renderModelResults(containerId, results) {
  const container = document.getElementById(containerId);
  container.innerHTML = '';
  results.forEach((r, i) => {
    const riskLabel = {
      high:     t('high_risk'),
      moderate: t('moderate_risk'),
      low:      t('low_risk'),
    }[r.risk] || r.risk;

    container.innerHTML += `
      <div class="disease-row">
        <div class="disease-top">
          <span class="disease-name">${i + 1}. ${r.disease.replace(/_/g, ' ')}</span>
          <span class="risk-badge risk-${r.risk}">${riskLabel}</span>
        </div>
        <div class="prob-bar-wrap">
          <div class="prob-bar prob-bar-${r.risk}" style="width:${r.probability}%"></div>
        </div>
        <div class="prob-label">${t('probability')}: ${r.probability}%</div>
        <div class="disease-info">${r.info}</div>
      </div>
    `;
  });
}

function renderGuidance(rfResults) {
  const container = document.getElementById('guidanceCards');
  container.innerHTML = '';
  const iconMap = { high: '🚨', moderate: '⚠️', low: '✅' };

  rfResults.forEach(r => {
    container.innerHTML += `
      <div class="guidance-card guidance-${r.risk}">
        <div class="guidance-icon">${iconMap[r.risk]}</div>
        <div class="guidance-body">
          <div class="guidance-disease">${r.disease.replace(/_/g, ' ')}</div>
          <div class="guidance-text">${r.guidance}</div>
        </div>
      </div>
    `;
  });
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
  const apiKey = 'DEMO'; // Replace with your Google Maps API key
  let url = `/api/hospitals?key=${apiKey}`;
  if (lat && lng) url += `&lat=${lat}&lng=${lng}`;

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
        <div class="hospital-info">
          <div class="hospital-name">🏥 ${h.name}</div>
          <div class="hospital-addr">📍 ${h.address}</div>
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
  goToStep('home');
}

// Clear error when age is typed
document.addEventListener('DOMContentLoaded', () => {
  const ageEl = document.getElementById('age');
  if (ageEl) {
    ageEl.addEventListener('input', () => {
      ageEl.classList.remove('input-error');
      showFieldError('age-error', false);
    });
  }
});
