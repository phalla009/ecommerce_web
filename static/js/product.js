document.addEventListener('DOMContentLoaded', () => {
    let allProducts = [];
    let categoriesList = [];

    // DOM Elements
    const productTableBody = document.getElementById('productTableBody');
    const categoryFilter = document.getElementById('categoryFilter');
    const searchInput = document.getElementById('productSearchInput');
    const refreshBtn = document.getElementById('refreshBtn');

    // Modals
    const addModal = document.getElementById('addModal');
    const editModal = document.getElementById('editModal');
    const deleteModal = document.getElementById('deleteModal');
    const detailModal = document.getElementById('detailModal');

    // Forms
    const addProductForm = document.getElementById('addProductForm');
    const editProductForm = document.getElementById('editProductForm');
    const deleteProductForm = document.getElementById('deleteProductForm');

    // Get Auth Token Helper
    function getAuthHeader(isFormData = false) {
        const token = localStorage.getItem('access_token');
        const headers = {};
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }
        if (!isFormData) {
            headers['Content-Type'] = 'application/json';
        }
        return headers;
    }

    // ===== HELPER: TOAST NOTIFICATIONS =====
    function showToast(message, type = 'success') {
        const container = document.getElementById('toastContainer') || createToastContainer();
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.innerHTML = `
            <span>${message}</span>
            <button style="background:none; border:none; color:#fff; cursor:pointer; font-weight:bold; margin-left:10px;" onclick="this.parentElement.remove()">&times;</button>
        `;
        container.appendChild(toast);

        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transition = 'opacity 0.3s ease';
            setTimeout(() => toast.remove(), 300);
        }, 4000);
    }

    function createToastContainer() {
        const container = document.createElement('div');
        container.id = 'toastContainer';
        container.className = 'toast-container';
        document.body.appendChild(container);
        return container;
    }

    // --- 1. FETCH & RENDER PRODUCTS ---
    async function loadProducts() {
        try {
            productTableBody.innerHTML = `<tr><td colspan="7" style="text-align: center;" class="muted">Loading products...</td></tr>`;
            const res = await fetch('/api/products/list', {
                headers: getAuthHeader()
            });

            if (res.status === 403) {
                showToast('Access Denied: Admin privileges required.', 'error');
                return;
            }
            if (!res.ok) throw new Error('Failed to fetch products');

            const data = await res.json();
            allProducts = data.products || [];

            updateStats(data);
            renderTable(allProducts);
        } catch (err) {
            console.error(err);
            productTableBody.innerHTML = `<tr><td colspan="7" style="text-align: center; color: var(--red, #dc2626);">Error loading products. Please check server connection.</td></tr>`;
            showToast('Failed to load product data!', 'error');
        }
    }

    // Fetch Categories for Dropdowns
    async function loadCategories() {
        try {
            const res = await fetch('/api/category/list', {
                headers: getAuthHeader()
            });
            if (!res.ok) throw new Error('Failed to fetch categories');

            categoriesList = await res.json();
            populateCategoryDropdowns(categoriesList);
        } catch (err) {
            console.warn('Could not load categories:', err);
        }
    }

    function populateCategoryDropdowns(categories) {
        const addSelect = document.getElementById('addCategory');
        const editSelect = document.getElementById('editCategory');
        const filterSelect = document.getElementById('categoryFilter');

        let optionsHtml = '<option value="" disabled selected>Select category</option>';
        let filterHtml = '<option value="">All Categories</option>';

        categories.forEach(cat => {
            optionsHtml += `<option value="${cat.id}">${cat.name}</option>`;
            filterHtml += `<option value="${cat.id}">${cat.name}</option>`;
        });

        if (addSelect) addSelect.innerHTML = optionsHtml;
        if (editSelect) editSelect.innerHTML = optionsHtml;
        if (filterSelect) filterSelect.innerHTML = filterHtml;
    }

    function updateStats(data) {
        document.getElementById('statTotal').textContent = data.total_products || 0;

        let inStock = 0, lowStock = 0, outStock = 0;
        (data.products || []).forEach(p => {
            if (p.stock <= 0) outStock++;
            else if (p.stock <= 5) lowStock++;
            else inStock++;
        });

        document.getElementById('statInStock').textContent = inStock;
        document.getElementById('statLowStock').textContent = lowStock;
        document.getElementById('statOutOfStock').textContent = outStock;
    }

    // --- RENDER TABLE WITH VIEW EYE BUTTON ---
    function renderTable(products) {
        if (!products || products.length === 0) {
            productTableBody.innerHTML = `<tr><td colspan="7" style="text-align: center;" class="muted">No products found.</td></tr>`;
            return;
        }

        productTableBody.innerHTML = products.map(prod => {
            const imgTag = prod.image
                ? `<img src="${prod.image}" alt="${prod.product_name}" class="prod-thumb">`
                : `<div class="prod-thumb" style="background:#e2e8f0;display:inline-block;"></div>`;

            const statusBadge = prod.stock > 5
                ? `<span class="badge badge-success">In Stock</span>`
                : prod.stock > 0
                ? `<span class="badge badge-warning">Low Stock</span>`
                : `<span class="badge badge-danger">Out of Stock</span>`;

            return `
                <tr>
                    <td><span class="mono">PROD-${String(prod.id).padStart(4, '0')}</span></td>
                    <td>
                        <div style="display:flex; align-items:center; gap:0.75rem;">
                            ${imgTag}
                            <strong>${prod.product_name}</strong>
                        </div>
                    </td>
                    <td>${prod.category_name || 'Uncategorized'}</td>
                    <td class="mono">$${parseFloat(prod.price).toFixed(2)}</td>
                    <td class="mono">${prod.stock}</td>
                    <td>${statusBadge}</td>
                    <td>
                        <div class="action-buttons">
                            <button class="btn-icon btn-view" data-id="${prod.id}" title="View Details">
                                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
                            </button>
                            <button class="btn-icon btn-edit" data-id="${prod.id}" title="Edit Product">
                                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                            </button>
                            <button class="btn-icon btn-delete" data-id="${prod.id}" data-name="${prod.product_name}" title="Delete Product">
                                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                            </button>
                        </div>
                    </td>
                </tr>
            `;
        }).join('');
    }

    // --- 2. SEARCH & FILTER ---
    searchInput?.addEventListener('input', filterProducts);
    categoryFilter?.addEventListener('change', filterProducts);

    function filterProducts() {
        const query = searchInput ? searchInput.value.toLowerCase().trim() : '';
        const categoryId = categoryFilter ? categoryFilter.value : '';

        const filtered = allProducts.filter(p => {
            const matchesSearch = p.product_name.toLowerCase().includes(query) ||
                                  `prod-${String(p.id).padStart(4, '0')}`.includes(query);
            const matchesCategory = categoryId === '' || p.category_id == categoryId;
            return matchesSearch && matchesCategory;
        });

        renderTable(filtered);
    }

    // --- 3. EVENT DELEGATION (HANDLES VIEW, EDIT & DELETE) ---
    productTableBody.addEventListener('click', (e) => {
        const viewBtn = e.target.closest('.btn-view');
        const editBtn = e.target.closest('.btn-edit');
        const deleteBtn = e.target.closest('.btn-delete');

        if (viewBtn) {
            openDetailModal(viewBtn.getAttribute('data-id'));
        } else if (editBtn) {
            openEditModal(editBtn.getAttribute('data-id'));
        } else if (deleteBtn) {
            openDeleteModal(deleteBtn.getAttribute('data-id'), deleteBtn.getAttribute('data-name'));
        }
    });

    // --- 4. OPEN DETAIL MODAL ---
    async function openDetailModal(id) {
        try {
            const res = await fetch(`/api/products/list/${id}`, { headers: getAuthHeader() });
            if (!res.ok) throw new Error('Product details could not be retrieved');

            const prod = await res.json();

            document.getElementById('detailImage').src = prod.image || '/static/images/placeholder.png';
            document.getElementById('detailName').textContent = prod.product_name || 'N/A';
            document.getElementById('detailCategory').textContent = prod.category_name || 'Uncategorized';
            document.getElementById('detailSku').textContent = `SKU: PROD-${String(prod.id).padStart(4, '0')}`;
            document.getElementById('detailPrice').textContent = `$${parseFloat(prod.price).toFixed(2)}`;
            document.getElementById('detailStock').textContent = prod.stock;
            document.getElementById('detailDescription').textContent = prod.description || 'No description provided.';

            const statusEl = document.getElementById('detailStatus');
            if (prod.stock > 5) {
                statusEl.innerHTML = `<span class="badge badge-success">In Stock</span>`;
            } else if (prod.stock > 0) {
                statusEl.innerHTML = `<span class="badge badge-warning">Low Stock</span>`;
            } else {
                statusEl.innerHTML = `<span class="badge badge-danger">Out of Stock</span>`;
            }

            document.getElementById('detailEditBtn').onclick = () => {
                detailModal.classList.remove('active');
                openEditModal(prod.id);
            };

            detailModal.classList.add('active');
        } catch (err) {
            console.error(err);
            showToast('Failed to load product details.', 'error');
        }
    }

    // --- 5. OPEN EDIT MODAL ---
    async function openEditModal(id) {
        try {
            const res = await fetch(`/api/products/list/${id}`, { headers: getAuthHeader() });
            if (!res.ok) throw new Error('Product not found');
            const prod = await res.json();

            document.getElementById('editProductId').value = prod.id;
            document.getElementById('editSku').value = `PROD-${String(prod.id).padStart(4, '0')}`;
            document.getElementById('editName').value = prod.product_name;
            document.getElementById('editPrice').value = prod.price;
            document.getElementById('editStock').value = prod.stock;
            document.getElementById('editDescription').value = prod.description || '';

            if (prod.category_id) {
                document.getElementById('editCategory').value = prod.category_id;
            }

            editModal.classList.add('active');
        } catch (err) {
            console.error(err);
            showToast('Could not fetch details for this product.', 'error');
        }
    }

    // --- 6. OPEN DELETE MODAL ---
    function openDeleteModal(id, name) {
        document.getElementById('deleteProductId').value = id;
        document.getElementById('deleteProductName').textContent = name;
        deleteModal.classList.add('active');
    }

    // --- 7. SUBMIT ADD FORM (POST) ---
    addProductForm?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const formData = new FormData(addProductForm);

        try {
            const res = await fetch('/api/admin/products/create', {
                method: 'POST',
                headers: getAuthHeader(true),
                body: formData
            });

            const result = await res.json();
            if (res.status === 403) {
                showToast('Access Denied: Admin role required.', 'error');
                return;
            }

            if (res.ok) {
                addModal.classList.remove('active');
                addProductForm.reset();
                showToast('Product created successfully!', 'success');
                loadProducts();
            } else {
                showToast(result.error || 'Failed to create product', 'error');
            }
        } catch (err) {
            console.error(err);
            showToast('Server connection error', 'error');
        }
    });

    // --- 8. SUBMIT EDIT FORM (PUT) ---
    editProductForm?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const id = document.getElementById('editProductId').value;
        const formData = new FormData(editProductForm);

        try {
            const res = await fetch(`/api/admin/products/update/${id}`, {
                method: 'PUT',
                headers: getAuthHeader(true),
                body: formData
            });

            const textResponse = await res.text();
            let result;
            try {
                result = JSON.parse(textResponse);
            } catch (e) {
                console.error("Server HTML Error:", textResponse);
                showToast('Server Error (500). Check terminal for Python traceback.', 'error');
                return;
            }

            if (res.status === 403) {
                showToast('Access Denied: Admin role required.', 'error');
                return;
            }

            if (res.ok) {
                editModal.classList.remove('active');
                showToast('Product updated successfully!', 'success');
                loadProducts();
            } else {
                showToast(result.error || 'Failed to update product', 'error');
            }
        } catch (err) {
            console.error(err);
            showToast('Error sending update request', 'error');
        }
    });

    // --- 9. SUBMIT DELETE FORM (DELETE) ---
    deleteProductForm?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const id = document.getElementById('deleteProductId').value;

        try {
            const res = await fetch('/api/admin/products/delete', {
                method: 'DELETE',
                headers: getAuthHeader(),
                body: JSON.stringify({ product_id: parseInt(id) })
            });

            const textResponse = await res.text();
            let result;
            try {
                result = JSON.parse(textResponse);
            } catch (err) {
                console.error("Server HTML Error:", textResponse);
                showToast('Server Error (500). Check terminal for Python traceback.', 'error');
                return;
            }

            if (res.status === 403) {
                showToast('Access Denied: Admin role required.', 'error');
                return;
            }

            if (res.ok) {
                deleteModal.classList.remove('active');
                showToast('Product deleted successfully!', 'success');
                loadProducts();
            } else {
                showToast(result.error || 'Failed to delete product', 'error');
            }
        } catch (err) {
            console.error(err);
            showToast('Error sending delete request', 'error');
        }
    });

    // --- MODAL CLOSE HANDLERS ---
    document.querySelectorAll('[data-close]').forEach(btn => {
        btn.addEventListener('click', () => {
            const targetModalId = btn.getAttribute('data-close');
            document.getElementById(targetModalId)?.classList.remove('active');
        });
    });

    // Add Modal Open Button
    document.getElementById('openAddModalBtn')?.addEventListener('click', () => {
        addModal.classList.add('active');
    });

    // Refresh Button
    refreshBtn?.addEventListener('click', () => {
        loadProducts();
        showToast('Product list refreshed', 'success');
    });

    // Initial Load
    loadProducts();
    loadCategories();
});