let appData = null;
let currentLang = 'en';
let deferredPrompt = null;

const LABELS = {
  en: { sub: 'Select your department and fill the form', forms: 'forms', no_forms: 'No forms available' },
  hi: { sub: 'Apna department chunein aur form bharein', forms: 'फॉर्म', no_forms: 'Koi form nahi mila' }
};

// ── PWA SERVICE WORKER ──
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  });
}

// ── PWA INSTALL PROMPT ──
window.addEventListener('beforeinstallprompt', e => {
  e.preventDefault();
  deferredPrompt = e;
  const banner = document.getElementById('installBanner');
  if (banner) banner.style.display = 'block';
});

document.addEventListener('DOMContentLoaded', async () => {
  // Install button
  const installBtn = document.getElementById('installBtn');
  if (installBtn) {
    installBtn.addEventListener('click', async () => {
      if (!deferredPrompt) return;
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        document.getElementById('installBanner').style.display = 'none';
      }
      deferredPrompt = null;
    });
  }

  showLoading(true);
  try {
    await loadData();
    renderGrid();
    renderNotices();
    renderBanner();
    if (appData.settings && appData.settings.company_name) {
      const el = document.getElementById('companyEyebrow');
      if (el) el.textContent = appData.settings.company_name;
    }
    setInterval(refreshNotices, 30000);
  } catch (err) { showError(); }
  finally { showLoading(false); }
});

async function loadData() {
  const res = await fetch(`${CONFIG.GAS_URL}?action=getData&t=${Date.now()}`);
  const json = await res.json();
  if (json.error) throw new Error(json.error);
  appData = json;
}

async function refreshNotices() {
  try {
    const res = await fetch(`${CONFIG.GAS_URL}?action=getData&t=${Date.now()}`);
    const json = await res.json();
    if (json.error) return;

    // Notices refresh
    const newNotices = json.notices || [];
    const oldIds = (appData.notices || []).map(n => n.id).join(',');
    const newIds = newNotices.map(n => n.id).join(',');
    if (oldIds !== newIds) {
      appData.notices = newNotices;
      renderNotices();
      showRefreshPulse();
    }

    // Banner auto refresh
    const oldBanner = JSON.stringify({
      active: appData.settings?.banner_active,
      msg:    appData.settings?.banner_message,
      color:  appData.settings?.banner_color,
    });
    const newBanner = JSON.stringify({
      active: json.settings?.banner_active,
      msg:    json.settings?.banner_message,
      color:  json.settings?.banner_color,
    });
    if (oldBanner !== newBanner) {
      appData.settings = json.settings;
      renderBanner();
    }

  } catch (e) {}
}

// ── ANNOUNCEMENT BANNER TICKER ──
function renderBanner() {
  const s = appData.settings || {};
  const banner = document.getElementById('announcementBanner');
  if (!banner) return;
  if (s.banner_active === 'TRUE' || s.banner_active === true) {
    banner.style.display = 'block';
    banner.className = s.banner_color === 'yellow' ? 'yellow' : 'red';
    const msg = s.banner_message || '';
    // Sab spans mein message fill karo
    document.querySelectorAll('.ann-txt').forEach(el => el.textContent = msg);
  } else {
    banner.style.display = 'none';
  }
}

function renderGrid() {
  const grid = document.getElementById('deptGrid');
  grid.innerHTML = '';
  [...appData.departments].sort((a, b) => a.order - b.order).forEach(dept => {
    const count = appData.forms.filter(f => f.dept_id === dept.id).length;
    const card = document.createElement('div');
    card.className = 'dept-card';
    card.onclick = () => openDept(dept.id);
    card.innerHTML = `
      <i class="ti ti-arrow-right dc-arr" aria-hidden="true"></i>
      <div class="dc-icon" style="background:${dept.color}22;color:${dept.color}"><i class="ti ${dept.icon}" aria-hidden="true"></i></div>
      <div class="dc-name">${dept.name}</div>
      <div class="dc-count">${count} ${LABELS[currentLang].forms}</div>
    `;
    grid.appendChild(card);
  });
}

function renderNotices() {
  const board = document.getElementById('corkBoard');
  const countEl = document.getElementById('noticeCount');
  const notices = appData.notices || [];
  countEl.textContent = `${notices.length} notice${notices.length !== 1 ? 's' : ''}`;
  if (!notices.length) {
    board.innerHTML = '<div class="no-notice"><i class="ti ti-pin" aria-hidden="true"></i>Koi notice nahi hai</div>';
    return;
  }
  board.innerHTML = '';
  notices.forEach(n => {
    const div = document.createElement('div');
    div.className = 'paper';
    div.innerHTML = `
      ${n.created_at ? `<div class="paper-date">${n.created_at}</div>` : ''}
      <div class="paper-msg">${n.message}</div>
      <div class="paper-footer">
        <div class="paper-tag"><i class="ti ti-pin" style="font-size:10px" aria-hidden="true"></i> Notice</div>
      </div>
    `;
    board.appendChild(div);
  });
}

function showRefreshPulse() {
  const el = document.getElementById('noticeCount');
  if (!el) return;
  el.style.background = '#2F9E44';
  el.style.color = '#fff';
  el.textContent = '● Updated';
  setTimeout(() => {
    const notices = appData.notices || [];
    el.style.background = '';
    el.style.color = '';
    el.textContent = `${notices.length} notice${notices.length !== 1 ? 's' : ''}`;
  }, 2000);
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
  if (!forms.length) { tbl.innerHTML = `<tr><td class="empty-state">${LABELS[currentLang].no_forms}</td></tr>`; return; }
  forms.forEach(f => {
    const tr = document.createElement('tr');
    tr.onclick = () => window.open(f.url, '_blank');
    tr.innerHTML = `
      <td style="width:38px;padding:11px 6px 11px 0;"><div class="ft-icon" style="background:${dept.color}22;color:${dept.color}"><i class="ti ti-forms" aria-hidden="true"></i></div></td>
      <td><div class="ft-name">${f.name}</div><div class="ft-type">${f.type}</div></td>
      <td style="width:28px;"><div class="ft-ext"><i class="ti ti-external-link" aria-hidden="true"></i></div></td>
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

function showLoading(show) { const el = document.getElementById('loadingOverlay'); if (el) el.style.display = show ? 'flex' : 'none'; }
function showError() { const el = document.getElementById('errorMsg'); if (el) el.style.display = 'block'; showLoading(false); }
