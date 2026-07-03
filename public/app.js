'use strict';

/* ── State ──────────────────────────────────────────────────────── */
let archives = [];
let pendingDeleteId = null;
let debounceTimer = null;

/* ── DOM refs ───────────────────────────────────────────────────── */
const archiveList    = document.getElementById('archiveList');
const emptyState     = document.getElementById('emptyState');
const statsText      = document.getElementById('statsText');
const searchInput    = document.getElementById('searchInput');
const categoryFilter = document.getElementById('categoryFilter');
const categorySugg   = document.getElementById('categorySuggestions');

const modal          = document.getElementById('modal');
const modalTitle     = document.getElementById('modalTitle');
const archiveForm    = document.getElementById('archiveForm');
const archiveId      = document.getElementById('archiveId');
const fieldTitle     = document.getElementById('fieldTitle');
const fieldCategory  = document.getElementById('fieldCategory');
const fieldDate      = document.getElementById('fieldDate');
const fieldAuthor    = document.getElementById('fieldAuthor');
const fieldDesc      = document.getElementById('fieldDescription');
const errTitle       = document.getElementById('errTitle');
const errCategory    = document.getElementById('errCategory');
const errDate        = document.getElementById('errDate');
const errAuthor      = document.getElementById('errAuthor');

const confirmDialog  = document.getElementById('confirmDialog');

/* ── API helpers ─────────────────────────────────────────────────── */
async function apiFetch(url, options = {}) {
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (res.status === 204) return null;
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || '请求失败');
  return data;
}

/* ── Load & render ───────────────────────────────────────────────── */
async function loadArchives() {
  const q        = searchInput.value.trim();
  const category = categoryFilter.value;
  const params   = new URLSearchParams();
  if (q)        params.set('q', q);
  if (category) params.set('category', category);

  archives = await apiFetch(`/api/archives?${params}`);
  renderList();
  await refreshCategoryFilter();
}

function renderList() {
  // Remove existing cards (keep emptyState)
  Array.from(archiveList.children)
    .filter((el) => el !== emptyState)
    .forEach((el) => el.remove());

  statsText.textContent = `共 ${archives.length} 条档案`;

  if (archives.length === 0) {
    emptyState.style.display = '';
    return;
  }
  emptyState.style.display = 'none';

  archives.forEach((a) => {
    const card = buildCard(a);
    archiveList.appendChild(card);
  });
}

function buildCard(a) {
  const card = document.createElement('div');
  card.className = 'archive-card';
  card.dataset.id = a.id;
  card.innerHTML = `
    <div class="card-header">
      <span class="card-title">${esc(a.title)}</span>
      <span class="card-badge">${esc(a.category)}</span>
    </div>
    <div class="card-meta">
      <span>📅 ${esc(a.date)}</span>
      <span>👤 ${esc(a.author)}</span>
    </div>
    ${a.description ? `<p class="card-description">${esc(a.description)}</p>` : ''}
    <div class="card-actions">
      <button class="btn btn-sm btn-secondary btn-edit" data-id="${esc(a.id)}">编辑</button>
      <button class="btn btn-sm btn-danger btn-delete" data-id="${esc(a.id)}">删除</button>
    </div>
  `;
  return card;
}

function esc(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/* ── Category filter ─────────────────────────────────────────────── */
async function refreshCategoryFilter() {
  const categories = await apiFetch('/api/categories');
  const current = categoryFilter.value;

  // Keep the "all" option, rebuild the rest
  while (categoryFilter.options.length > 1) categoryFilter.remove(1);
  categorySugg.innerHTML = '';

  categories.forEach((cat) => {
    const opt = document.createElement('option');
    opt.value = cat;
    opt.textContent = cat;
    categoryFilter.appendChild(opt);

    const sugg = document.createElement('option');
    sugg.value = cat;
    categorySugg.appendChild(sugg);
  });

  if (current && categories.includes(current)) categoryFilter.value = current;
}

/* ── Modal helpers ───────────────────────────────────────────────── */
function openModal(archive = null) {
  clearErrors();
  archiveForm.reset();
  archiveId.value = '';

  if (archive) {
    modalTitle.textContent = '编辑档案';
    archiveId.value        = archive.id;
    fieldTitle.value       = archive.title;
    fieldCategory.value    = archive.category;
    fieldDate.value        = archive.date;
    fieldAuthor.value      = archive.author;
    fieldDesc.value        = archive.description || '';
  } else {
    modalTitle.textContent = '新建档案';
    // Default date to today (local date)
    const now = new Date();
    const localDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    fieldDate.value = localDate;
  }

  modal.classList.add('active');
  fieldTitle.focus();
}

function closeModal() {
  modal.classList.remove('active');
}

function clearErrors() {
  [errTitle, errCategory, errDate, errAuthor].forEach((el) => (el.textContent = ''));
  [fieldTitle, fieldCategory, fieldDate, fieldAuthor].forEach((el) =>
    el.classList.remove('invalid')
  );
}

function validateForm() {
  let valid = true;
  clearErrors();

  if (!fieldTitle.value.trim()) {
    errTitle.textContent = '请填写标题';
    fieldTitle.classList.add('invalid');
    valid = false;
  }
  if (!fieldCategory.value.trim()) {
    errCategory.textContent = '请填写分类';
    fieldCategory.classList.add('invalid');
    valid = false;
  }
  if (!fieldDate.value) {
    errDate.textContent = '请选择日期';
    fieldDate.classList.add('invalid');
    valid = false;
  }
  if (!fieldAuthor.value.trim()) {
    errAuthor.textContent = '请填写负责人';
    fieldAuthor.classList.add('invalid');
    valid = false;
  }
  return valid;
}

/* ── Event listeners ─────────────────────────────────────────────── */

// New archive button
document.getElementById('btnNew').addEventListener('click', () => openModal());

// Close modal
document.getElementById('modalClose').addEventListener('click', closeModal);
document.getElementById('btnCancel').addEventListener('click', closeModal);
modal.addEventListener('click', (e) => { if (e.target === modal) closeModal(); });

// Form submit (create / update)
archiveForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  if (!validateForm()) return;

  const payload = {
    title:       fieldTitle.value.trim(),
    category:    fieldCategory.value.trim(),
    date:        fieldDate.value,
    author:      fieldAuthor.value.trim(),
    description: fieldDesc.value.trim(),
  };

  try {
    const id = archiveId.value;
    if (id) {
      await apiFetch(`/api/archives/${id}`, { method: 'PUT', body: JSON.stringify(payload) });
    } else {
      await apiFetch('/api/archives', { method: 'POST', body: JSON.stringify(payload) });
    }
    closeModal();
    await loadArchives();
  } catch (err) {
    alert(err.message);
  }
});

// Edit / Delete buttons (event delegation on list)
archiveList.addEventListener('click', async (e) => {
  const editBtn   = e.target.closest('.btn-edit');
  const deleteBtn = e.target.closest('.btn-delete');

  if (editBtn) {
    const id = editBtn.dataset.id;
    const archive = archives.find((a) => a.id === id);
    if (archive) openModal(archive);
  }

  if (deleteBtn) {
    pendingDeleteId = deleteBtn.dataset.id;
    confirmDialog.classList.add('active');
  }
});

// Delete confirm
document.getElementById('btnConfirmDelete').addEventListener('click', async () => {
  if (!pendingDeleteId) return;
  try {
    await apiFetch(`/api/archives/${pendingDeleteId}`, { method: 'DELETE' });
    confirmDialog.classList.remove('active');
    pendingDeleteId = null;
    await loadArchives();
  } catch (err) {
    alert(err.message);
  }
});
document.getElementById('btnConfirmCancel').addEventListener('click', () => {
  confirmDialog.classList.remove('active');
  pendingDeleteId = null;
});
confirmDialog.addEventListener('click', (e) => {
  if (e.target === confirmDialog) {
    confirmDialog.classList.remove('active');
    pendingDeleteId = null;
  }
});

// Search with debounce
searchInput.addEventListener('input', () => {
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(loadArchives, 300);
});

// Category filter
categoryFilter.addEventListener('change', loadArchives);

// Keyboard: Escape closes modals
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    if (confirmDialog.classList.contains('active')) {
      confirmDialog.classList.remove('active');
      pendingDeleteId = null;
    } else if (modal.classList.contains('active')) {
      closeModal();
    }
  }
});

/* ── Init ──────────────────────────────────────────────────────── */
loadArchives();
