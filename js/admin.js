let adminData = null;
let adminPassword = '';

// ── INIT ──
document.addEventListener('DOMContentLoaded', () => {
  showView('loginView');
  document.getElementById('loginBtn').addEventListener('click', handleLogin);
  document.getElementById('passwordInput').addEventListener('keypress', e => {
    if (e.key === 'Enter') handleLogin();
  });
});

// ── LOGIN ──
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
      renderAdminNotice();
      setBtnState('loginBtn', 'default', 'Login');
    } else {
      showLoginError('Galat password!');
      setBtnState('loginBtn', 'default', 'Login');
    }
  } catch (e) {
    showLoginError('Connection error. Try again.');
    setBtnState('loginBtn', 'default', 'Login');
  }
}

// ── LOAD DATA ──
async function loadAdminData() {
  const res = await fetch(`${CONFIG.GAS_URL}?action=getData&t=${Date.now()}`);
  adminData = await res.json();
}

// ── DEPARTMENTS ──
function renderAdminDepts() {
  const list = document.getElementById('adminDeptList');
  list.innerHTML = '';
  const sorted = [...adminData.departments].sort((a, b) => a.order - b.order);
  sorted.forEach(dept => {
    const row = document.createElement('div');
    row.className = 'admin-row';
    row.innerHTML = `
      <div class="admin-row-left">
        <div class="dept-dot" style="background:${dept.color}"></div>
        <div>
          <div class="admin-row-name">${dept.name}</div>
          <div class="admin-row-meta"><i class="ti ${dept.icon}"></i> ${dept.id}</div>
        </div>
      </div>
      <div class="admin-row-actions">
        <button class="btn-edit" onclick="editDept('${dept.id}')"><i class="ti ti-edit"></i></button>
        <button class="btn-del" onclick="deleteDept('${dept.id}')"><i class="ti ti-trash"></i></button>
      </div>
    `;
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
  document.getElementById('deptId').value    = '';
  document.getElementById('deptName').value  = '';
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
  const isNew  = !adminData.departments.find(d => d.id === id);
  const action = isNew ? 'addDepartment' : 'updateDepartment';
  const finalId = id || name.toLowerCase().replace(/\s+/g, '_');

  const res = await postGAS({ action, password: adminPassword, data: { id: finalId, name, icon, color, order, active: true } });
  if (res.success) {
    await loadAdminData();
    renderAdminDepts();
    renderAdminForms();
    closeModal('deptModal');
  } else {
    alert('Error: ' + (res.error || 'Unknown'));
  }
  setBtnState('saveDeptBtn', 'default', 'Save');
}

async function deleteDept(id) {
  if (!confirm('Ye department inactive ho jaayega. Sure?')) return;
  const res = await postGAS({ action: 'deleteDepartment', password: adminPassword, data: { id } });
  if (res.success) { await loadAdminData(); renderAdminDepts(); }
}

// ── FORMS ──
function renderAdminForms() {
  const list   = document.getElementById('adminFormList');
  const filter = document.getElementById('formDeptFilter');
  list.innerHTML = '';
  filter.innerHTML = '<option value="">All Departments</option>';
  adminData.departments.forEach(d => {
    filter.innerHTML += `<option value="${d.id}">${d.name}</option>`;
  });
  const filterVal = filter.value;
  const forms = adminData.forms
    .filter(f => !filterVal || f.dept_id === filterVal)
    .sort((a, b) => a.order - b.order);

  forms.forEach(f => {
    const dept = adminData.departments.find(d => d.id === f.dept_id);
    const row  = document.createElement('div');
    row.className = 'admin-row';
    row.innerHTML = `
      <div class="admin-row-left">
        <div class="dept-dot" style="background:${dept ? dept.color : '#888'}"></div>
        <div>
          <div class="admin-row-name">${f.name}</div>
          <div class="admin-row-meta">${dept ? dept.name : f.dept_id} · ${f.type}</div>
        </div>
      </div>
      <div class="admin-row-actions">
        <button class="btn-edit" onclick="editForm(${f.id})"><i class="ti ti-edit"></i></button>
        <button class="btn-del"  onclick="deleteForm(${f.id})"><i class="ti ti-trash"></i></button>
      </div>
    `;
    list.appendChild(row);
  });
}

function editForm(id) {
  const f = adminData.forms.find(f => String(f.id) === String(id));
  if (!f) return;
  document.getElementById('formModalTitle').textContent = 'Edit Form';
  document.getElementById('formId').value     = f.id;
  document.getElementById('formDeptId').value = f.dept_id;
  document.getElementById('formName').value   = f.name;
  document.getElementById('formUrl').value    = f.url;
  document.getElementById('formType').value   = f.type;
  document.getElementById('formOrder').value  = f.order;
  populateFormDeptSelect();
  showModal('formModal');
}

function newForm() {
  document.getElementById('formModalTitle').textContent = 'Add Form';
  document.getElementById('formId').value     = '';
  document.getElementById('formDeptId').value = '';
  document.getElementById('formName').value   = '';
  document.getElementById('formUrl').value    = '';
  document.getElementById('formType').value   = 'Google Form';
  document.getElementById('formOrder').value  = '99';
  populateFormDeptSelect();
  showModal('formModal');
}

function populateFormDeptSelect() {
  const sel = document.getElementById('formDeptId');
  const cur = sel.value;
  sel.innerHTML = '';
  adminData.departments.forEach(d => {
    sel.innerHTML += `<option value="${d.id}" ${d.id === cur ? 'selected' : ''}>${d.name}</option>`;
  });
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
  const isNew  = !id || !adminData.forms.find(f => String(f.id) === String(id));
  const action = isNew ? 'addForm' : 'updateForm';

  const res = await postGAS({ action, password: adminPassword, data: { id, dept_id, name, url, type, order, active: true } });
  if (res.success) {
    await loadAdminData();
    renderAdminForms();
    closeModal('formModal');
  } else {
    alert('Error: ' + (res.error || 'Unknown'));
  }
  setBtnState('saveFormBtn', 'default', 'Save');
}

async function deleteForm(id) {
  if (!confirm('Ye form hatana chahte ho?')) return;
  const res = await postGAS({ action: 'deleteForm', password: adminPassword, data: { id } });
  if (res.success) { await loadAdminData(); renderAdminForms(); }
}

// ── NOTICE ──
function renderAdminNotice() {
  const current = adminData.notices && adminData.notices[0];
  if (current) document.getElementById('noticeInput').value = current.message;
}

async function saveNotice() {
  const msg = document.getElementById('noticeInput').value.trim();
  if (!msg) return alert('Notice empty hai!');

  setBtnState('saveNoticeBtn', 'loading', 'Saving...');
  const res = await postGAS({ action: 'updateNotice', password: adminPassword, data: { message: msg } });
  if (res.success) {
    await loadAdminData();
    setBtnState('saveNoticeBtn', 'success', 'Saved!');
    setTimeout(() => setBtnState('saveNoticeBtn', 'default', 'Save Notice'), 2000);
  } else {
    alert('Error: ' + res.error);
    setBtnState('saveNoticeBtn', 'default', 'Save Notice');
  }
}

// ── TABS ──
function switchTab(tab) {
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  document.querySelectorAll('.tab-content').forEach(c => c.style.display = 'none');
  document.getElementById(`tab-${tab}`).style.display = 'block';
  event.target.classList.add('active');
}

// ── MODAL HELPERS ──
function showModal(id)  { document.getElementById(id).style.display = 'flex'; }
function closeModal(id) { document.getElementById(id).style.display = 'none'; }

// ── VIEWS ──
function showView(id) {
  document.querySelectorAll('.view').forEach(v => v.style.display = 'none');
  document.getElementById(id).style.display = 'block';
}

// ── GAS POST ──
async function postGAS(body) {
  const res = await fetch(CONFIG.GAS_URL, {
    method: 'POST',
    body: JSON.stringify(body),
  });
  return await res.json();
}

// ── BUTTON STATE ──
function setBtnState(id, state, text) {
  const btn = document.getElementById(id);
  if (!btn) return;
  btn.disabled = state === 'loading';
  btn.textContent = '';

  if (state === 'loading') {
    btn.innerHTML = `<span class="btn-spinner"></span> ${text}`;
    btn.style.opacity = '0.7';
  } else if (state === 'success') {
    btn.innerHTML = `<i class="ti ti-check"></i> ${text}`;
    btn.style.opacity = '1';
    btn.style.background = '#2F9E44';
  } else {
    btn.innerHTML = text;
    btn.style.opacity = '1';
    btn.style.background = '';
  }
}

function setLoginLoading(show) {
  setBtnState('loginBtn', show ? 'loading' : 'default', show ? 'Checking...' : 'Login');
}

function showLoginError(msg) {
  const el = document.getElementById('loginError');
  el.textContent   = msg;
  el.style.display = 'block';
}

function logout() {
  adminPassword = '';
  adminData     = null;
  showView('loginView');
  document.getElementById('passwordInput').value = '';
}
