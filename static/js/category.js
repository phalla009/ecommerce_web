document.addEventListener('DOMContentLoaded', () => {
  const tableBody = document.getElementById('categoryTableBody');
  const totalCountEl = document.getElementById('totalCatCount');
  const searchInput = document.getElementById('searchInput');

  // Modals
  const addModal = document.getElementById('addCategoryModal');
  const editModal = document.getElementById('editCategoryModal');
  const deleteModal = document.getElementById('deleteCategoryModal');
  const detailModal = document.getElementById('detailCategoryModal');

  const openAddBtn = document.getElementById('openAddCategoryModalBtn');

  // Forms
  const addForm = document.getElementById('addCategoryForm');
  const editForm = document.getElementById('editCategoryForm');
  const deleteForm = document.getElementById('deleteCategoryForm');

  // In-memory categories cache for quick searching
  let categoriesCache = [];

  // Get Auth Token
  function getAuthHeader() {
    const token = localStorage.getItem('access_token');
    return {
      'Content-Type': 'application/json',
      'Authorization': token ? `Bearer ${token}` : ''
    };
  }

  // ===== HELPER: SHOW TOAST NOTIFICATION =====
  function showToast(message, type = 'error') {
    let container = document.getElementById('toastContainer');

    if (!container) {
      container = document.createElement('div');
      container.id = 'toastContainer';
      container.className = 'toast-container';
      document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `
      <span>${escapeHtml(message)}</span>
      <span class="toast-close">&times;</span>
    `;

    toast.querySelector('.toast-close').addEventListener('click', () => toast.remove());
    container.appendChild(toast);

    setTimeout(() => {
      toast.classList.add('fade-out');
      toast.addEventListener('animationend', () => toast.remove());
    }, 4000);
  }

  // Prevent XSS
  function escapeHtml(text) {
    if (!text) return '';
    return String(text)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  // Open Add Modal
  openAddBtn?.addEventListener('click', () => {
    addForm?.reset();
    addModal?.classList.add('open');
  });

  // ===== 1. FETCH & STORE CATEGORIES =====
  async function loadCategories() {
    try {
      tableBody.innerHTML = `<tr><td colspan="6" style="text-align: center;" class="muted">Loading...</td></tr>`;
      const response = await fetch('/api/category/list', {
        headers: getAuthHeader()
      });

      if (response.status === 403) {
        showToast('Access Denied: Admin privileges required.', 'error');
        return;
      }

      if (!response.ok) {
        throw new Error(`Server returned status ${response.status}`);
      }

      const data = await response.json();
      categoriesCache = Array.isArray(data) ? data : [];

      renderTable(categoriesCache);
    } catch (error) {
      console.error('Error loading categories:', error);
      tableBody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: var(--red);">Failed to load data. Please check server connection.</td></tr>`;
      showToast('Failed to fetch category list', 'error');
    }
  }

  // ===== 2. RENDER TABLE DATA =====
  function renderTable(categories) {
    if (!categories || categories.length === 0) {
      tableBody.innerHTML = `<tr><td colspan="6" style="text-align: center;" class="muted">No categories found.</td></tr>`;
      if (totalCountEl) totalCountEl.textContent = '0';
      return;
    }

    if (totalCountEl) totalCountEl.textContent = categories.length;
    tableBody.innerHTML = '';

    categories.forEach(cat => {
      const row = document.createElement('tr');
      row.innerHTML = `
        <td class="mono">#${cat.id}</td>
        <td><strong>${escapeHtml(cat.name)}</strong></td>
        <td class="muted">${escapeHtml(cat.description || '-')}</td>
        <td><span class="badge badge-paid">${cat.active === 'true' || cat.active === true ? 'Active' : 'Inactive'}</span></td>
        <td class="muted">${cat.create_at ? cat.create_at : 'N/A'}</td>
        <td>
          <div class="action-buttons">
            <!-- View Icon Button -->
            <button 
              type="button" 
              class="btn-icon btn-view" 
              title="View Details"
              aria-label="View category ${escapeHtml(cat.name)}"
              data-id="${cat.id}"
            >
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                <circle cx="12" cy="12" r="3"></circle>
              </svg>
            </button>

            <!-- Edit Icon Button -->
            <button 
              type="button" 
              class="btn-icon btn-edit" 
              title="Edit Category"
              aria-label="Edit category ${escapeHtml(cat.name)}"
              data-id="${cat.id}" 
              data-name="${escapeHtml(cat.name)}" 
              data-desc="${escapeHtml(cat.description || '')}"
            >
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
              </svg>
            </button>

            <!-- Delete Icon Button -->
            <button 
              type="button" 
              class="btn-icon btn-delete" 
              title="Delete Category"
              aria-label="Delete category ${escapeHtml(cat.name)}"
              data-id="${cat.id}" 
              data-name="${escapeHtml(cat.name)}"
            >
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="3 6 5 6 21 6"></polyline>
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
              </svg>
            </button>
          </div>
        </td>
      `;
      tableBody.appendChild(row);
    });

    attachActionEvents();
  }

  // ===== 3. LIVE SEARCH FILTER =====
  searchInput?.addEventListener('input', (e) => {
    const query = e.target.value.toLowerCase().trim();
    if (!query) {
      renderTable(categoriesCache);
      return;
    }

    const filtered = categoriesCache.filter(cat =>
      String(cat.id).includes(query) ||
      (cat.name && cat.name.toLowerCase().includes(query)) ||
      (cat.description && cat.description.toLowerCase().includes(query))
    );

    renderTable(filtered);
  });

  // ===== 4. ATTACH CLICK LISTENERS (VIEW / EDIT / DELETE) =====
  function attachActionEvents() {
    // View Click
    document.querySelectorAll('.btn-view').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        const catId = e.currentTarget.dataset.id;
        const cat = categoriesCache.find(c => String(c.id) === String(catId));

        if (cat) {
          document.getElementById('detailCatId').textContent = `#${cat.id}`;
          document.getElementById('detailCatName').textContent = cat.name;
          document.getElementById('detailCatDesc').textContent = cat.description || 'No description provided.';
          document.getElementById('detailCatCreated').textContent = cat.create_at || 'N/A';
          document.getElementById('detailCatStatus').innerHTML = `<span class="badge badge-paid">${cat.active === 'true' || cat.active === true ? 'Active' : 'Inactive'}</span>`;

          // Quick switch to edit modal from view modal
          const editBtn = document.getElementById('detailCatEditBtn');
          if (editBtn) {
            editBtn.onclick = () => {
              detailModal.classList.remove('open');
              document.getElementById('editCatId').value = cat.id;
              document.getElementById('editCatName').value = cat.name;
              document.getElementById('editCatDesc').value = cat.description || '';
              editModal.classList.add('open');
            };
          }

          detailModal.classList.add('open');
        }
      });
    });

    // Edit Click
    document.querySelectorAll('.btn-edit').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        const targetBtn = e.currentTarget;
        document.getElementById('editCatId').value = targetBtn.dataset.id;
        document.getElementById('editCatName').value = targetBtn.dataset.name;
        document.getElementById('editCatDesc').value = targetBtn.dataset.desc;
        editModal.classList.add('open');
      });
    });

    // Delete Click
    document.querySelectorAll('.btn-delete').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        const targetBtn = e.currentTarget;
        document.getElementById('deleteCatId').value = targetBtn.dataset.id;
        document.getElementById('deleteCatName').textContent = targetBtn.dataset.name;
        deleteModal.classList.add('open');
      });
    });
  }

  // ===== 5. CREATE CATEGORY (POST) =====
  addForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const nameInput = document.getElementById('addCatName').value;
    const descInput = document.getElementById('addCatDesc').value;

    try {
      const res = await fetch('/api/category/create', {
        method: 'POST',
        headers: getAuthHeader(),
        body: JSON.stringify({
          name: nameInput,
          description: descInput
        })
      });

      const result = await res.json();

      if (res.status === 403) {
        showToast('Access Denied: Admin role required to create categories.', 'error');
        return;
      }

      if (res.ok && !result.error) {
        addForm.reset();
        addModal.classList.remove('open');
        showToast('Category created successfully!', 'success');
        loadCategories();
      } else {
        showToast(result.error || 'Failed to add category', 'error');
      }
    } catch (err) {
      showToast('Error creating category. Server error.', 'error');
    }
  });

  // ===== 6. UPDATE CATEGORY (PUT) =====
  editForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const catId = document.getElementById('editCatId').value;
    const catName = document.getElementById('editCatName').value;
    const catDesc = document.getElementById('editCatDesc').value;

    try {
      const res = await fetch('/api/category/update', {
        method: 'PUT',
        headers: getAuthHeader(),
        body: JSON.stringify({
          category_id: parseInt(catId),
          name: catName,
          description: catDesc
        })
      });

      const result = await res.json();

      if (res.status === 403) {
        showToast('Access Denied: Admin role required to update categories.', 'error');
        return;
      }

      if (res.ok && !result.error) {
        editModal.classList.remove('open');
        showToast('Category updated successfully!', 'success');
        loadCategories();
      } else {
        showToast(result.error || 'Failed to update category', 'error');
      }
    } catch (err) {
      showToast('Error updating category. Server error.', 'error');
    }
  });

  // ===== 7. DELETE CATEGORY (DELETE) =====
  deleteForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const catId = document.getElementById('deleteCatId').value;

    try {
      const res = await fetch('/api/category/delete', {
        method: 'DELETE',
        headers: getAuthHeader(),
        body: JSON.stringify({ category_id: parseInt(catId) })
      });

      const result = await res.json();

      if (res.status === 403) {
        showToast('Access Denied: Admin role required to delete categories.', 'error');
        return;
      }

      if (res.ok && !result.error) {
        deleteModal.classList.remove('open');
        showToast('Category deleted successfully!', 'success');
        loadCategories();
      } else {
        showToast(result.error || 'Failed to delete category', 'error');
      }
    } catch (err) {
      showToast('Error deleting category. Server error.', 'error');
    }
  });

  // ===== 8. CLOSE MODAL LISTENERS =====
  document.querySelectorAll('.modal-close, [data-close]').forEach(element => {
    element.addEventListener('click', () => {
      addModal?.classList.remove('open');
      editModal?.classList.remove('open');
      deleteModal?.classList.remove('open');
      detailModal?.classList.remove('open');
    });
  });

  // Refresh Button
  document.getElementById('refreshBtn')?.addEventListener('click', () => {
    if (searchInput) searchInput.value = '';
    loadCategories();
  });

  // Initial Load
  loadCategories();
});