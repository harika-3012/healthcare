// translations.js — loaded from JSON
let TRANSLATIONS = {};
let currentLang = 'en';

async function loadTranslations() {
  const res = await fetch('/static/translations/translations.json');
  TRANSLATIONS = await res.json();
}

function t(key) {
  const lang = TRANSLATIONS[currentLang];
  if (!lang) return key;
  return lang[key] || TRANSLATIONS['en'][key] || key;
}

function applyTranslations() {
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    el.textContent = t(key);
  });
  document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
    const key = el.getAttribute('data-i18n-placeholder');
    el.placeholder = t(key);
  });
}

function switchLang(lang) {
  currentLang = lang;
  document.querySelectorAll('.lang-btn').forEach(b => {
    b.classList.toggle('active', b.getAttribute('data-lang') === lang);
  });
  applyTranslations();
  // Re-render symptom grid labels
  if (typeof renderSymptomGrid === 'function') renderSymptomGrid();
}

document.addEventListener('DOMContentLoaded', async () => {
  await loadTranslations();
  applyTranslations();
  document.querySelectorAll('.lang-btn').forEach(btn => {
    btn.addEventListener('click', () => switchLang(btn.getAttribute('data-lang')));
  });
});
