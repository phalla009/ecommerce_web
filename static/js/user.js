document.addEventListener('DOMContentLoaded', async () => {
    let usersList = [];
    let currentUserRole = '';

    // ទាញយក Role របស់ User ដែលកំពុង Login មកផ្ទៀងផ្ទាត់
    try {
        const profileRes = await fetch('/api/user/profile', {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('access_token')}` // ឬផ្អែកតាម Session/JWT របស់អ្នក
            }
        });
        if (profileRes.ok) {
            const profileData = await profileRes.json();
            currentUserRole = (profileData.data?.role || '').toLowerCase();
        }
    } catch (e) {
        console.error('Could not fetch current user profile', e);
    }

    // ប្រសិនបើមិនមែនជា Admin ទេ សូមលាក់ប៊ូតុង Add User ចោល
    if (currentUserRole !== 'admin') {
        const addUserBtn = document.getElementById('openAddUserModalBtn');
        if (addUserBtn) addUserBtn.style.display = 'none';
    }

    // DOM Elements
    const userTableBody = document.getElementById('userTableBody');
    const userSearchInput = document.getElementById('userSearchInput');
    const roleFilter = document.getElementById('roleFilter');
    const refreshBtn = document.getElementById('refreshBtn');

    // Modals
    const addUserModal = document.getElementById('addUserModal');
    const editUserModal = document.getElementById('editUserModal');
    const deleteUserModal = document.getElementById('deleteUserModal');
    const userDetailModal = document.getElementById('userDetailModal');

    // Forms
    const addUserForm = document.getElementById('addUserForm');
    const editUserForm = document.getElementById('editUserForm');
    const deleteUserForm = document.getElementById('deleteUserForm');

    // Add Button Event
    document.getElementById('openAddUserModalBtn')?.addEventListener('click', () => {
        if (currentUserRole !== 'admin') {
            showToast('Access denied. Admins only.', 'error');
            return;
        }
        openModal(addUserModal);
    });

    // Filter & Refresh Events
    userSearchInput?.addEventListener('input', filterAndRenderUsers);
    roleFilter?.addEventListener('change', filterAndRenderUsers);
    refreshBtn?.addEventListener('click', fetchUsers);

    // Global Modal Close Event
    document.addEventListener('click', (e) => {
        const closeBtn = e.target.closest('[data-close]');
        if (closeBtn) {
            const modalId = closeBtn.getAttribute('data-close');
            const modalTarget = document.getElementById(modalId);
            if (modalTarget) closeModal(modalTarget);
        }
        if (e.target.classList.contains('modal-overlay')) {
            closeModal(e.target);
        }
    });

    fetchUsers();

    function showToast(message, type = 'success') {
        const container = document.getElementById('toastContainer');
        if (!container) return;
        const toast = document.createElement('div');
        toast.style.cssText = `
            background: ${type === 'success' ? '#10b981' : '#ef4444'};
            color: white; padding: 12px 18px; border-radius: 8px; margin-bottom: 10px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15); font-size: 0.9rem; font-weight: 500;
            display: flex; align-items: center; gap: 8px; opacity: 0; transform: translateY(-10px);
            transition: all 0.3s ease;
        `;
        toast.innerHTML = `<span>${type === 'success' ? '✓' : '⚠'}</span><span>${escapeHtml(message)}</span>`;
        container.appendChild(toast);
        requestAnimationFrame(() => {
            toast.style.opacity = '1';
            toast.style.transform = 'translateY(0)';
        });
        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transform = 'translateY(-10px)';
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }

    async function fetchUsers() {
        try {
            userTableBody.innerHTML = '<tr><td colspan="5" style="text-align: center;" class="muted">Loading users...</td></tr>';
            const res = await fetch('/api/admin/users');
            if (!res.ok) throw new Error('Failed to fetch users');
            const data = await res.json();
            usersList = Array.isArray(data) ? data : [];
            updateStats();
            filterAndRenderUsers();
        } catch (err) {
            console.error(err);
            userTableBody.innerHTML = '<tr><td colspan="5" style="text-align: center; color: var(--red, #dc2626);" class="muted">Error loading user data.</td></tr>';
            showToast('Failed to load users data', 'error');
        }
    }

    function updateStats() {
        document.getElementById('statTotalUsers').textContent = usersList.length;
        document.getElementById('statAdmins').textContent = usersList.filter(u => u.role?.toLowerCase() === 'admin').length;
        document.getElementById('statManagers').textContent = usersList.filter(u => u.role?.toLowerCase() === 'manager').length;
        document.getElementById('statStandardUsers').textContent = usersList.filter(u => !u.role || u.role?.toLowerCase() === 'sale' || u.role?.toLowerCase() === 'user').length;
    }

    function filterAndRenderUsers() {
        const query = (userSearchInput.value || '').toLowerCase();
        const selectedRole = roleFilter.value.toLowerCase();
        const filtered = usersList.filter(u => {
            const matchQuery = (u.name || '').toLowerCase().includes(query) || (u.email || '').toLowerCase().includes(query);
            const userRole = (u.role || 'sale').toLowerCase();
            const matchRole = selectedRole === '' || userRole === selectedRole;
            return matchQuery && matchRole;
        });
        renderTable(filtered);
    }

    function renderTable(data) {
        if (!data.length) {
            userTableBody.innerHTML = '<tr><td colspan="5" style="text-align: center;" class="muted">No users found.</td></tr>';
            return;
        }

        userTableBody.innerHTML = data.map(user => {
            const initial = user.name ? user.name.charAt(0).toUpperCase() : 'U';
            const roleLower = (user.role || 'sale').toLowerCase();
            let roleClass = roleLower === 'admin' ? 'badge-admin' : roleLower === 'manager' ? 'badge-manager' : 'badge-sale';
            const createdDate = user.create_at ? new Date(user.create_at).toLocaleDateString() : 'N/A';

            // បង្ហាញប៊ូតុង Edit និង Delete เฉพาะ Admin ប៉ុណ្ណោះ
            let actionButtonsHTML = `
                <button class="btn-icon" onclick="viewUser(${user.id})" title="View Details">
                    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
                </button>
            `;

            if (currentUserRole === 'admin') {
                actionButtonsHTML += `
                    <button class="btn-icon btn-edit" onclick="editUser(${user.id})" title="Edit User">
                        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                    </button>
                    <button class="btn-icon btn-delete" onclick="promptDeleteUser(${user.id}, '${escapeHtml(user.name)}')" title="Delete User">
                        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                    </button>
                `;
            }

            return `
                <tr>
                    <td>
                        <div style="display: flex; align-items: center; gap: 0.75rem;">
                            <div class="user-avatar-placeholder">${initial}</div>
                            <div><strong style="display: block;">${escapeHtml(user.name)}</strong></div>
                        </div>
                    </td>
                    <td>${escapeHtml(user.email)}</td>
                    <td class="mono">${createdDate}</td>
                    <td><span class="badge-role ${roleClass}">${roleLower.toUpperCase()}</span></td>
                    <td><div class="action-buttons">${actionButtonsHTML}</div></td>
                </tr>
            `;
        }).join('');
    }

    addUserForm?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const payload = {
            name: document.getElementById('addName').value.trim(),
            email: document.getElementById('addEmail').value.trim(),
            password: document.getElementById('addPassword').value,
            role: document.getElementById('addRole').value
        };
        try {
            const res = await fetch('/api/admin/users/create', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            const data = await res.json();
            if (res.ok) {
                closeModal(addUserModal);
                addUserForm.reset();
                fetchUsers();
                showToast('User created successfully!', 'success');
            } else {
                showToast(data.error || 'Failed to create user', 'error');
            }
        } catch (err) {
            showToast('Server error while creating user', 'error');
        }
    });

    editUserForm?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const userId = document.getElementById('editUserId').value;
        const payload = {
            name: document.getElementById('editName').value.trim(),
            email: document.getElementById('editEmail').value.trim(),
            password: document.getElementById('editPassword').value,
            role: document.getElementById('editRole').value
        };
        try {
            const res = await fetch(`/api/admin/users/update/${userId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            const data = await res.json();
            if (res.ok) {
                closeModal(editUserModal);
                editUserForm.reset();
                fetchUsers();
                showToast('User updated successfully!', 'success');
            } else {
                showToast(data.error || 'Failed to update user', 'error');
            }
        } catch (err) {
            showToast('Server error while updating user', 'error');
        }
    });

    deleteUserForm?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const userId = parseInt(document.getElementById('deleteUserId').value);
        try {
            const res = await fetch('/api/admin/users/delete', {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ user_id: userId })
            });
            const data = await res.json();
            if (res.ok && !data.error) {
                closeModal(deleteUserModal);
                fetchUsers();
                showToast('User deleted successfully!', 'success');
            } else {
                showToast(data.error || data.message || 'Failed to delete user', 'error');
            }
        } catch (err) {
            showToast('Server error while deleting user', 'error');
        }
    });

    window.viewUser = (id) => {
        const user = usersList.find(u => u.id === id);
        if (!user) return;
        document.getElementById('detailAvatar').textContent = user.name ? user.name.charAt(0).toUpperCase() : 'U';
        document.getElementById('detailName').textContent = user.name;
        document.getElementById('detailEmail').textContent = user.email;
        document.getElementById('detailUserId').textContent = `#${user.id}`;
        document.getElementById('detailCreatedAt').textContent = user.create_at ? new Date(user.create_at).toLocaleDateString() : 'N/A';

        const roleLower = (user.role || 'sale').toLowerCase();
        const badge = document.getElementById('detailRoleBadge');
        badge.textContent = roleLower.toUpperCase();
        badge.className = `badge-role ${roleLower === 'admin' ? 'badge-admin' : roleLower === 'manager' ? 'badge-manager' : 'badge-sale'}`;

        const editBtn = document.getElementById('detailEditBtn');
        if (currentUserRole === 'admin') {
            editBtn.style.display = 'inline-flex';
            editBtn.onclick = () => {
                closeModal(userDetailModal);
                editUser(user.id);
            };
        } else {
            editBtn.style.display = 'none';
        }

        openModal(userDetailModal);
    };

    window.editUser = (id) => {
        if (currentUserRole !== 'admin') {
            showToast('Access denied', 'error');
            return;
        }
        const user = usersList.find(u => u.id === id);
        if (!user) return;
        document.getElementById('editUserId').value = user.id;
        document.getElementById('editName').value = user.name || '';
        document.getElementById('editEmail').value = user.email || '';
        document.getElementById('editRole').value = (user.role || 'sale').toLowerCase();
        document.getElementById('editPassword').value = '';
        openModal(editUserModal);
    };

    window.promptDeleteUser = (id, name) => {
        if (currentUserRole !== 'admin') {
            showToast('Access denied', 'error');
            return;
        }
        document.getElementById('deleteUserId').value = id;
        document.getElementById('deleteUserName').textContent = name;
        openModal(deleteUserModal);
    };

    function openModal(el) { el?.classList.add('active'); }
    function closeModal(el) { el?.classList.remove('active'); }
    function escapeHtml(str) { return String(str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
});