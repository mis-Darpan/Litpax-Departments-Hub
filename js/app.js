let appData = null;
let currentLang = 'en';

const LABELS = {
  en: { sub: 'Select your department and fill the form', forms: 'forms', no_forms: 'No forms available' },
  hi: { sub: 'Apna department chunein aur form bharein', forms: 'फॉर्म', no_forms: 'Koi form nahi mila' }
};

document.addEventListener('DOMContentLoaded', async () => {
  showLoading(true);
  try {
    await loadData();
    renderGrid();
    renderNotices();
    if (appData.settings && appData.settings.company_name) {
      const el = document.getElementById('companyEyebrow');
      if (el) el.textContent = appData.settings.company_name;
    }
  } catch (err) {
    showError();
  } finally {
    showLoading(false);
  }
});

async function loadData() {
  // Departments & Forms — cached (5 min)
  const cached = sessionStorage.getItem('hub_depts');
  const cachedAt = sessionStorage.getItem('hub_depts_at');
  let deptsData = null;

  if (cached && cachedAt && (Date.now() - cachedAt < CONFIG.CACHE_TTL)) {
    deptsData = JSON.parse(cached);
  } else {
    const res = await fetch(`${CONFIG.GAS_URL}?action=getData`);
    const json = await res.json();
    if (json.error) throw new Error(json.error);
    deptsData = json;
    sessionStorage.setItem('hub_depts', JSON.stringify(json));
    sessionStorage.setItem('hub_depts_at', Date.now());
  }

  // Notices — ALWAYS fresh (no cache)
  const nRes = await fetch(`${CONFIG.GAS_URL}?action=getData&t=${Date.now()}`);
  const nJson = await nRes.json();

  appData = {
    ...deptsData,
    notices: nJson.notices || []
  };
}

function renderGrid() {
  const grid = document.getElementById('deptGrid');
  grid.innerHTML = '';
  const sorted = [...appData.departments].sort((a, b) => a.order - b.order);
  sorted.forEach(dept => {
    const count = appData.forms.filter(f => f.dept_id === dept.id).length;
    const card = document.createElement('div');
    card.className = 'dept-card';
    card.onclick = () => openDept(dept.id);
    card.innerHTML = `
      <i class="ti ti-arrow-right dc-arr" aria-hidden="true"></i>
      <div class="dc-icon" style="background:${dept.color}22;color:${dept.color}">
        <i class="ti ${dept.icon}" aria-hidden="true"></i>
      </div>
      <div class="dc-name">${dept.name}</div>
      <div class="dc-count">${count} ${LABELS[currentLang].forms}</div>
    `;
    grid.appendChild(card);
  });
}

function renderNotices() {
  const el = document.getElementById('noticePapers');
  const notices = appData.notices || [];
  if (!notices.length) {
    el.innerHTML = '<div class="no-notice"><i class="ti ti-pin" aria-hidden="true"></i>Koi notice nahi hai</div>';
    return;
  }
  el.innerHTML = '';
  notices.forEach(n => {
    const date = n.created_at
      ? new Date(n.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
      : '';
    const div = document.createElement('div');
    div.className = 'paper';
    div.innerHTML = `
      ${date ? `<div class="paper-date">${date}</div>` : ''}
      <div class="paper-msg">${n.message}</div>
      <div class="paper-tag"><i class="ti ti-pin" style="font-size:10px" aria-hidden="true"></i> Notice</div>
    `;
    el.appendChild(div);
  });
}

function openDept(deptId) {
  const dept = appData.departments.find(d => d.id === deptId);
  const forms = appData.forms.filter(f => f.dept_id === deptId).sort((a, b) => a.order - b.order);

  document.getElementById('mainApp').style.display = 'none';
  document.getElementById('formsApp').style.display = 'block';
  document.getElementById('breadcrumb').textContent = dept.name;

  const fi = document.getElementById('fpIcon');
  fi.innerHTML = `<i class="ti ${dept.icon}" style="font-size:20px;color:${dept.color}" aria-hidden="true"></i>`;
  fi.style.background = dept.color + '22';

  document.getElementById('fpTitle').textContent = dept.name;
  document.getElementById('fpSub').textContent = `${forms.length} ${LABELS[currentLang].forms} available`;

  const tbl = document.getElementById('formTable');
  tbl.innerHTML = '';

  if (!forms.length) {
    tbl.innerHTML = `<tr><td class="empty-state">${LABELS[currentLang].no_forms}</td></tr>`;
    return;
  }

  forms.forEach(f => {
    const tr = document.createElement('tr');
    tr.onclick = () => window.open(f.url, '_blank');
    tr.innerHTML = `
      <td style="width:38px;padding:11px 6px 11px 0;">
        <div class="ft-icon" style="background:${dept.color}22;color:${dept.color}">
          <i class="ti ti-forms" aria-hidden="true"></i>
        </div>
      </td>
      <td>
        <div class="ft-name">${f.name}</div>
        <div class="ft-type">${f.type}</div>
      </td>
      <td style="width:28px;">
        <div class="ft-ext"><i class="ti ti-external-link" aria-hidden="true"></i></div>
      </td>
    `;
    tbl.appendChild(tr);
  });
}

function goBack() {
  document.getElementById('formsApp').style.display = 'none';
  document.getElementById('mainApp').style.display = 'block';
}

function toggleLang() {
  currentLang = currentLang === 'en' ? 'hi' : 'en';
  document.getElementById('langBtn').textContent = currentLang === 'en' ? 'हिंदी' : 'ENG';
  document.getElementById('pageSub').textContent = LABELS[currentLang].sub;
  renderGrid();
}

function showLoading(show) {
  const el = document.getElementById('loadingOverlay');
  if (el) el.style.display = show ? 'flex' : 'none';
}

function showError() {
  const el = document.getElementById('errorMsg');
  if (el) el.style.display = 'block';
  showLoading(false);
}
