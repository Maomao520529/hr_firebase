// public/js/dashboard.js
const tableBody = document.getElementById('tableBody');
const emptyHint = document.getElementById('emptyHint');
const countLabel = document.getElementById('countLabel');
const importMsg = document.getElementById('importMsg');

let idToken = null;

auth.onAuthStateChanged(async (user) => {
  if (!user) {
    window.location.href = '/login.html';
    return;
  }
  document.getElementById('userEmail').textContent = user.email;
  idToken = await user.getIdToken();
  loadEmployees();
});

document.getElementById('logoutBtn').addEventListener('click', () => {
  auth.signOut().then(() => { window.location.href = '/login.html'; });
});

async function authFetch(url, options = {}) {
  idToken = await auth.currentUser.getIdToken(); // 確保 token 最新
  const headers = { ...(options.headers || {}), Authorization: `Bearer ${idToken}` };
  return fetch(url, { ...options, headers });
}

// ---- 匯入 ----
document.getElementById('importBtn').addEventListener('click', async () => {
  const fileInput = document.getElementById('fileInput');
  const file = fileInput.files[0];
  importMsg.textContent = '';
  importMsg.className = 'msg';

  if (!file) {
    importMsg.textContent = '請先選擇檔案';
    importMsg.classList.add('error');
    return;
  }

  const formData = new FormData();
  formData.append('file', file);

  importMsg.textContent = '上傳並匯入中...';

  try {
    const res = await authFetch('/api/employees/import', {
      method: 'POST',
      body: formData,
    });
    const data = await res.json();

    if (!res.ok) throw new Error(data.error || '匯入失敗');

    importMsg.textContent = `${data.message}${data.errors.length ? '（' + data.errors.length + ' 列有問題已略過）' : ''}`;
    importMsg.classList.add('success');
    fileInput.value = '';
    loadEmployees();
  } catch (err) {
    importMsg.textContent = '錯誤：' + err.message;
    importMsg.classList.add('error');
  }
});

// ---- 匯出 ----
document.getElementById('exportXlsxBtn').addEventListener('click', () => downloadExport('xlsx'));
document.getElementById('exportDocxBtn').addEventListener('click', () => downloadExport('docx'));

async function downloadExport(type) {
  try {
    const res = await authFetch(`/api/employees/export/${type}`);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || '匯出失敗');
    }
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `employees_${Date.now()}.${type}`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  } catch (err) {
    alert('匯出失敗：' + err.message);
  }
}

// ---- 列表 ----
document.getElementById('refreshBtn').addEventListener('click', loadEmployees);

async function loadEmployees() {
  try {
    const res = await authFetch('/api/employees');
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || '讀取失敗');
    renderTable(data.data || []);
  } catch (err) {
    importMsg.textContent = '讀取資料失敗：' + err.message;
    importMsg.classList.add('error');
  }
}

function renderTable(rows) {
  tableBody.innerHTML = '';
  countLabel.textContent = rows.length ? `（共 ${rows.length} 筆）` : '';
  emptyHint.style.display = rows.length ? 'none' : 'block';

  rows.forEach((r) => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${escapeHtml(r.empId)}</td>
      <td>${escapeHtml(r.name)}</td>
      <td>${escapeHtml(r.department)}</td>
      <td>${escapeHtml(r.position)}</td>
      <td>${escapeHtml(r.hireDate)}</td>
      <td>${escapeHtml(r.email)}</td>
      <td>${escapeHtml(r.phone)}</td>
      <td>${r.salary != null ? Number(r.salary).toLocaleString() : ''}</td>
      <td><span class="status-badge status-${escapeHtml(r.status)}">${escapeHtml(r.status)}</span></td>
      <td><button class="btn btn-danger" data-id="${r.empId}">刪除</button></td>
    `;
    tableBody.appendChild(tr);
  });

  tableBody.querySelectorAll('button[data-id]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      if (!confirm(`確定要刪除員工 ${btn.dataset.id} 嗎？`)) return;
      try {
        const res = await authFetch(`/api/employees/${btn.dataset.id}`, { method: 'DELETE' });
        if (!res.ok) throw new Error((await res.json()).error);
        loadEmployees();
      } catch (err) {
        alert('刪除失敗：' + err.message);
      }
    });
  });
}

function escapeHtml(v) {
  if (v === undefined || v === null) return '';
  return String(v)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
