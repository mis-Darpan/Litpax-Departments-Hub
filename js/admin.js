let adminData = null;
let adminPassword = '';

document.addEventListener('DOMContentLoaded', () => {
  showView('loginView');
  document.getElementById('loginBtn').addEventListener('click', handleLogin);
  document.getElementById('passwordInput').addEventListener('keypress', e => { if (e.key === 'Enter') handleLogin(); });
});

async function handleLogin() {
  const pass = document.getElementById('passwordInput').value.trim();
  if (!pass) return;
  setBtnState('loginBtn', 'loading', 'Checking...');
  try {
    const res = await postGAS({ action: 'verifyPassword', password: pass });
    if (res.success) {
      adminPassword = pass;
      await loadAdminData();
      showView('adminView');
      renderAdminDepts();
      renderAdminForms();
      renderAdminNotices();
      renderAdminBanner();
    } else { showLoginError('Galat password!'); }
  } catch (e) { showLoginError('Connection error. Try again.'); }
  setBtnState('loginBtn', 'default', 'Login');
}

async function loadAdminData() {
  const res = await fetch(`${CONFIG.GAS_URL}?action=getData&t=${Date.now()}`);
  adminData = await res.json();
}

// ── DEPARTMENTS ──
function renderAdminDepts() {
  const list = document.getElementById('adminDeptList');
  list.innerHTML = '';
  [...adminData.departments].sort((a, b) => a.order - b.order).forEach(dept => {
    const row = document.createElement('div');
    row.className = 'admin-row';
    row.innerHTML = `
      <div class="admin-row-left">
        <div class="dept-dot" style="background:${dept.color}"></div>
        <div><div class="admin-row-name">${dept.name}</div><div class="admin-row-meta"><i class="ti ${dept.icon}"></i> ${dept.id}</div></div>
      </div>
      <div class="admin-row-actions">
        <button class="btn-edit" onclick="editDept('${dept.id}')"><i class="ti ti-edit"></i></button>
        <button class="btn-del" onclick="deleteDept('${dept.id}')"><i class="ti ti-trash"></i></button>
      </div>`;
    list.appendChild(row);
  });
}

function editDept(id) {
  const dept = adminData.departments.find(d => d.id === id);
  if (!dept) return;
  document.getElementById('deptModalTitle').textContent = 'Edit Department';
  document.getElementById('deptId').value    = dept.id;
  document.getElementById('deptName').value  = dept.name;
  document.getElementById('deptIcon').value  = dept.icon;
  document.getElementById('deptColor').value = dept.color;
  document.getElementById('deptOrder').value = dept.order;
  showModal('deptModal');
}

function newDept() {
  document.getElementById('deptModalTitle').textContent = 'Add Department';
  ['deptId','deptName'].forEach(id => document.getElementById(id).value = '');
  document.getElementById('deptIcon').value  = 'ti-folder';
  document.getElementById('deptColor').value = '#185FA5';
  document.getElementById('deptOrder').value = '99';
  showModal('deptModal');
}

async function saveDept() {
  const id    = document.getElementById('deptId').value.trim();
  const name  = document.getElementById('deptName').value.trim();
  const icon  = document.getElementById('deptIcon').value.trim();
  const color = document.getElementById('deptColor').value.trim();
  const order = parseInt(document.getElementById('deptOrder').value) || 99;
  if (!name) return alert('Name required!');
  setBtnState('saveDeptBtn', 'loading', 'Saving...');
  const isNew = !adminData.departments.find(d => d.id === id);
  const finalId = id || name.toLowerCase().replace(/\s+/g, '_');
  const res = await postGAS({ action: isNew ? 'addDepartment' : 'updateDepartment', password: adminPassword, data: { id: finalId, name, icon, color, order, active: true } });
  if (res.success) { await loadAdminData(); renderAdminDepts(); renderAdminForms(); closeModal('deptModal'); setBtnState('saveDeptBtn', 'success', 'Saved!'); setTimeout(() => setBtnState('saveDeptBtn', 'default', 'Save'), 2000); }
  else { alert('Error: ' + (res.error || 'Unknown')); setBtnState('saveDeptBtn', 'default', 'Save'); }
}

async function deleteDept(id) {
  if (!confirm('Ye department inactive ho jaayega. Sure?')) return;
  const res = await postGAS({ action: 'deleteDepartment', password: adminPassword, data: { id } });
  if (res.success) { await loadAdminData(); renderAdminDepts(); }
}

// ── FORMS ──
function renderAdminForms() {
  const list = document.getElementById('adminFormList');
  const filter = document.getElementById('formDeptFilter');
  list.innerHTML = '';
  filter.innerHTML = '<option value="">All Departments</option>';
  adminData.departments.forEach(d => { filter.innerHTML += `<option value="${d.id}">${d.name}</option>`; });
  const filterVal = filter.value;
  adminData.forms.filter(f => !filterVal || f.dept_id === filterVal).sort((a, b) => a.order - b.order).forEach(f => {
    const dept = adminData.departments.find(d => d.id === f.dept_id);
    const row = document.createElement('div');
    row.className = 'admin-row';
    row.innerHTML = `
      <div class="admin-row-left">
        <div class="dept-dot" style="background:${dept ? dept.color : '#888'}"></div>
        <div><div class="admin-row-name">${f.name}</div><div class="admin-row-meta">${dept ? dept.name : f.dept_id} · ${f.type}</div></div>
      </div>
      <div class="admin-row-actions">
        <button class="btn-edit" onclick="editForm(${f.id})"><i class="ti ti-edit"></i></button>
        <button class="btn-del" onclick="deleteForm(${f.id})"><i class="ti ti-trash"></i></button>
      </div>`;
    list.appendChild(row);
  });
}

function editForm(id) {
  const f = adminData.forms.find(f => String(f.id) === String(id));
  if (!f) return;
  document.getElementById('formModalTitle').textContent = 'Edit Form';
  document.getElementById('formId').value     = f.id;
  document.getElementById('formName').value   = f.name;
  document.getElementById('formUrl').value    = f.url;
  document.getElementById('formType').value   = f.type;
  document.getElementById('formOrder').value  = f.order;
  populateFormDeptSelect(f.dept_id);
  showModal('formModal');
}

function newForm() {
  document.getElementById('formModalTitle').textContent = 'Add Form';
  ['formId','formName','formUrl'].forEach(id => document.getElementById(id).value = '');
  document.getElementById('formType').value  = 'Google Form';
  document.getElementById('formOrder').value = '99';
  populateFormDeptSelect('');
  showModal('formModal');
}

function populateFormDeptSelect(selected = '') {
  const sel = document.getElementById('formDeptId');
  sel.innerHTML = '';
  adminData.departments.forEach(d => { sel.innerHTML += `<option value="${d.id}" ${d.id === selected ? 'selected' : ''}>${d.name}</option>`; });
}

async function saveForm() {
  const id      = document.getElementById('formId').value.trim();
  const dept_id = document.getElementById('formDeptId').value.trim();
  const name    = document.getElementById('formName').value.trim();
  const url     = document.getElementById('formUrl').value.trim();
  const type    = document.getElementById('formType').value.trim();
  const order   = parseInt(document.getElementById('formOrder').value) || 99;
  if (!name || !url || !dept_id) return alert('Name, URL aur Department required hai!');
  setBtnState('saveFormBtn', 'loading', 'Saving...');
  const isNew = !id || !adminData.forms.find(f => String(f.id) === String(id));
  const res = await postGAS({ action: isNew ? 'addForm' : 'updateForm', password: adminPassword, data: { id, dept_id, name, url, type, order, active: true } });
  if (res.success) { await loadAdminData(); renderAdminForms(); closeModal('formModal'); setBtnState('saveFormBtn', 'success', 'Saved!'); setTimeout(() => setBtnState('saveFormBtn', 'default', 'Save'), 2000); }
  else { alert('Error: ' + (res.error || 'Unknown')); setBtnState('saveFormBtn', 'default', 'Save'); }
}

async function deleteForm(id) {
  if (!confirm('Ye form hatana chahte ho?')) return;
  const res = await postGAS({ action: 'deleteForm', password: adminPassword, data: { id } });
  if (res.success) { await loadAdminData(); renderAdminForms(); }
}

// ── NOTICES ──
function renderAdminNotices() {
  const list = document.getElementById('adminNoticeList');
  list.innerHTML = '';
  const notices = adminData.notices || [];
  if (!notices.length) {
    list.innerHTML = '<div style="text-align:center;padding:2rem;color:#aaa;font-size:13px;">Koi notice nahi hai</div>';
    return;
  }
  notices.forEach(n => {
    const row = document.createElement('div');
    row.className = 'admin-row';
    row.innerHTML = `
      <div class="admin-row-left">
        <div class="dept-dot" style="background:#c8a96e"></div>
        <div>
          <div class="admin-row-name">${n.message}</div>
          <div class="admin-row-meta"><i class="ti ti-calendar"></i> ${n.created_at || ''}</div>
        </div>
      </div>
      <div class="admin-row-actions">
        <button class="btn-del" onclick="deleteNotice(${n.id})"><i class="ti ti-trash"></i></button>
      </div>`;
    list.appendChild(row);
  });
}

async function saveNotice() {
  const msg = document.getElementById('noticeInput').value.trim();
  if (!msg) return alert('Notice empty hai!');
  setBtnState('saveNoticeBtn', 'loading', 'Posting...');
  const res = await postGAS({ action: 'addNotice', password: adminPassword, data: { message: msg } });
  if (res.success) {
    await loadAdminData();
    renderAdminNotices();
      renderAdminBanner();
    closeModal('noticeModal');
    document.getElementById('noticeInput').value = '';
    setBtnState('saveNoticeBtn', 'success', 'Posted!');
    setTimeout(() => setBtnState('saveNoticeBtn', 'default', 'Post Notice'), 2000);
  } else { alert('Error: ' + res.error); setBtnState('saveNoticeBtn', 'default', 'Post Notice'); }
}

async function deleteNotice(id) {
  if (!confirm('Ye notice hatana chahte ho?')) return;
  const res = await postGAS({ action: 'deleteNotice', password: adminPassword, data: { id } });
  if (res.success) { await loadAdminData(); renderAdminNotices();
      renderAdminBanner(); }
}

// ── TABS ──
function switchTab(tab) {
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  document.querySelectorAll('.tab-content').forEach(c => c.style.display = 'none');
  document.getElementById(`tab-${tab}`).style.display = 'block';
  event.target.classList.add('active');
}

// ── HELPERS ──
function showModal(id)  { document.getElementById(id).style.display = 'flex'; }
function closeModal(id) { document.getElementById(id).style.display = 'none'; }
function showView(id) { document.querySelectorAll('.view').forEach(v => v.style.display = 'none'); document.getElementById(id).style.display = 'block'; }

async function postGAS(body) {
  const res = await fetch(CONFIG.GAS_URL, { method: 'POST', body: JSON.stringify(body) });
  return await res.json();
}

function setBtnState(id, state, text) {
  const btn = document.getElementById(id);
  if (!btn) return;
  btn.disabled = state === 'loading';
  if (state === 'loading') { btn.innerHTML = `<span class="btn-spinner"></span> ${text}`; btn.style.opacity = '0.7'; btn.style.background = ''; }
  else if (state === 'success') { btn.innerHTML = `<i class="ti ti-check"></i> ${text}`; btn.style.opacity = '1'; btn.style.background = '#2F9E44'; }
  else { btn.innerHTML = text; btn.style.opacity = '1'; btn.style.background = ''; }
}

function showLoginError(msg) { const el = document.getElementById('loginError'); el.textContent = msg; el.style.display = 'block'; }
function logout() { adminPassword = ''; adminData = null; showView('loginView'); document.getElementById('passwordInput').value = ''; }

// ── BANNER ──
function renderAdminBanner() {
  const s = adminData.settings || {};
  const msg    = s.banner_message || '';
  const color  = s.banner_color  || 'red';
  const active = s.banner_active === 'TRUE' || s.banner_active === true;

  document.getElementById('bannerMessage').value = msg;
  document.getElementById('bannerActive').checked = active;
  document.getElementById('toggleLabel').textContent = active ? 'Banner ON' : 'Banner OFF';
  document.querySelector(`input[name="bannerColor"][value="${color}"]`).checked = true;
  updateBannerPreview();
}

function updateBannerPreview() {
  const msg    = document.getElementById('bannerMessage').value || 'Banner preview...';
  const color  = document.querySelector('input[name="bannerColor"]:checked')?.value || 'red';
  const active = document.getElementById('bannerActive').checked;
  const label  = document.getElementById('toggleLabel');
  const prev   = document.getElementById('bannerPreview');
  const prevText = document.getElementById('bannerPreviewText');

  label.textContent = active ? 'Banner ON' : 'Banner OFF';
  prevText.textContent = msg;
  prev.className = 'banner-preview ' + (active ? color : 'off');
}

async function saveBanner() {
  const msg    = document.getElementById('bannerMessage').value.trim();
  const color  = document.querySelector('input[name="bannerColor"]:checked')?.value || 'red';
  const active = document.getElementById('bannerActive').checked;

  setBtnState('saveBannerBtn', 'loading', 'Saving...');

  const updates = [
    { key: 'banner_message', value: msg },
    { key: 'banner_color',   value: color },
    { key: 'banner_active',  value: active ? 'TRUE' : 'FALSE' },
  ];

  try {
    for (const u of updates) {
      await postGAS({ action: 'updateSettings', password: adminPassword, data: u });
    }
    await loadAdminData();
    setBtnState('saveBannerBtn', 'success', 'Saved!');
    setTimeout(() => setBtnState('saveBannerBtn', 'default', '<i class="ti ti-check"></i> Save Banner'), 2000);
  } catch (e) {
    alert('Error saving banner');
    setBtnState('saveBannerBtn', 'default', '<i class="ti ti-check"></i> Save Banner');
  }
}
