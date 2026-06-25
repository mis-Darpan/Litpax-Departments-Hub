// ═══════════════════════════════════════════════
// LITPAX DEPARTMENTS HUB — APP.JS
// Employee frontend logic
// ═══════════════════════════════════════════════

let appData = null;
let currentLang = 'en';

const LABELS = {
  en: {
    select_dept:  'Select your department',
    tagline:      'Select your department and fill the form',
    back:         'Back',
    no_forms:     'No forms available',
    loading:      'Loading...',
    error:        'Failed to load. Please refresh.',
    google_form:  'Google Form',
    web_form:     'Web Form',
  },
  hi: {
    select_dept:  'Apna department chunein',
    tagline:      'Department chunein aur form bharein',
    back:         'Wapas',
    no_forms:     'Koi form nahi mila',
    loading:      'Load ho raha hai...',
    error:        'Load nahi hua. Refresh karein.',
    google_form:  'Google Form',
    web_form:     'Web Form',
  }
};

// ─────────────────────────────────────────
// INIT
// ─────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
  showLoading(true);
  try {
    await loadData();
    renderNotice();
    renderDepartments();
    setupLangToggle();
  } catch (err) {
    showError();
  } finally {
    showLoading(false);
  }
});

// ─────────────────────────────────────────
// FETCH DATA
// ─────────────────────────────────────────
async function loadData() {
  const cached = sessionStorage.getItem('hub_data');
  const cachedAt = sessionStorage.getItem('hub_data_at');

  if (cached && cachedAt && (Date.now() - cachedAt < CONFIG.CACHE_TTL)) {
    appData = JSON.parse(cached);
    return;
  }

  const res  = await fetch(`${CONFIG.GAS_URL}?action=getData`);
  const json = await res.json();
  if (json.error) throw new Error(json.error);

  appData = json;
  sessionStorage.setItem('hub_data', JSON.stringify(json));
  sessionStorage.setItem('hub_data_at', Date.now());
}

// ─────────────────────────────────────────
// NOTICE
// ─────────────────────────────────────────
function renderNotice() {
  const el = document.getElementById('noticeBanner');
  if (!appData.notices || !appData.notices.length) {
    el.style.display = 'none';
    return;
  }
  el.style.display = 'flex';
  document.getElementById('noticeText').textContent = appData.notices[0].message;
}

// ─────────────────────────────────────────
// DEPARTMENTS
// ─────────────────────────────────────────
function renderDepartments() {
  const grid = document.getElementById('deptGrid');
  grid.innerHTML = '';

  const sorted = [...appData.departments].sort((a, b) => a.order - b.order);

  sorted.forEach(dept => {
    const formsCount = appData.forms.filter(f => f.dept_id === dept.id).length;
    const card = document.createElement('div');
    card.className = 'dept-card';
    card.style.setProperty('--dept-color', dept.color);
    card.onclick = () => openDept(dept.id);
    card.innerHTML = `
      <i class="ti ti-arrow-right dept-arrow"></i>
      <div class="dept-icon-wrap" style="background:${dept.color}22; color:${dept.color}">
        <i class="ti ${dept.icon}"></i>
      </div>
      <div>
        <div class="dept-name">${dept.name}</div>
        <div class="dept-count">${formsCount} ${currentLang === 'hi' ? 'फॉर्म' : 'forms'}</div>
      </div>
    `;
    grid.appendChild(card);
  });

  // Company info
  if (appData.settings) {
    const el = document.getElementById('companyName');
    if (el) el.textContent = appData.settings.company_name || 'Litpax Technology';
  }
}

// ─────────────────────────────────────────
// FORMS VIEW
// ─────────────────────────────────────────
function openDept(deptId) {
  const dept  = appData.departments.find(d => d.id === deptId);
  const forms = appData.forms
    .filter(f => f.dept_id === deptId)
    .sort((a, b) => a.order - b.order);

  document.getElementById('deptView').style.display  = 'none';
  document.getElementById('formsView').style.display = 'block';
  document.getElementById('formsDeptTitle').textContent = dept.name;
  document.getElementById('formsDeptBar').style.background = dept.color;

  const list = document.getElementById('formsList');
  list.innerHTML = '';

  if (!forms.length) {
    list.innerHTML = `<div class="empty-msg">${LABELS[currentLang].no_forms}</div>`;
    return;
  }

  forms.forEach(f => {
    const a = document.createElement('a');
    a.className = 'form-card';
    a.href      = f.url;
    a.target    = '_blank';
    a.rel       = 'noopener noreferrer';
    a.innerHTML = `
      <div class="form-left">
        <div class="form-color-bar" style="background:${dept.color}"></div>
        <div>
          <div class="form-name">${f.name}</div>
          <div class="form-meta">
            <i class="ti ti-brand-google"></i>
            ${LABELS[currentLang][f.type === 'Google Form' ? 'google_form' : 'web_form']}
          </div>
        </div>
      </div>
      <i class="ti ti-external-link form-ext-icon"></i>
    `;
    list.appendChild(a);
  });
}

function goBack() {
  document.getElementById('formsView').style.display = 'none';
  document.getElementById('deptView').style.display  = 'block';
}

// ─────────────────────────────────────────
// LANGUAGE TOGGLE
// ─────────────────────────────────────────
function setupLangToggle() {
  const btn = document.getElementById('langToggle');
  if (!btn) return;
  btn.addEventListener('click', () => {
    currentLang = currentLang === 'en' ? 'hi' : 'en';
    btn.textContent = currentLang === 'en' ? 'हिंदी' : 'ENG';
    renderDepartments();
    updateLabels();
  });
}

function updateLabels() {
  const l = LABELS[currentLang];
  const tagEl = document.getElementById('hubTagline');
  if (tagEl) tagEl.textContent = l.tagline;
  const backEl = document.getElementById('backBtn');
  if (backEl) backEl.querySelector('span').textContent = l.back;
}

// ─────────────────────────────────────────
// LOADING / ERROR
// ─────────────────────────────────────────
function showLoading(show) {
  const el = document.getElementById('loadingOverlay');
  if (el) el.style.display = show ? 'flex' : 'none';
}

function showError() {
  const el = document.getElementById('errorMsg');
  if (el) el.style.display = 'block';
  showLoading(false);
}
