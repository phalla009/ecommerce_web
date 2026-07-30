document.addEventListener("DOMContentLoaded", function () {
  // 1. Mobile Sidebar & Backdrop Overlay Logic
  const menuToggle = document.getElementById("menuToggle");
  const sidebar = document.getElementById("sidebar");
  const sidebarOverlay = document.getElementById("sidebarOverlay");

  function openSidebar() {
    if (sidebar) sidebar.classList.add("open");
    if (sidebarOverlay) sidebarOverlay.classList.add("active");
  }

  function closeSidebar() {
    if (sidebar) sidebar.classList.remove("open");
    if (sidebarOverlay) sidebarOverlay.classList.remove("active");
  }

  if (menuToggle) menuToggle.addEventListener("click", openSidebar);
  if (sidebarOverlay) sidebarOverlay.addEventListener("click", closeSidebar);

  // Close sidebar on outer click if overlay is not used
  document.addEventListener("click", function (e) {
    if (
      sidebar &&
      sidebar.classList.contains("open") &&
      !sidebar.contains(e.target) &&
      menuToggle &&
      !menuToggle.contains(e.target) &&
      (!sidebarOverlay || !sidebarOverlay.contains(e.target))
    ) {
      closeSidebar();
    }
  });

  // 2. Modals General Logic (Add, Edit, Close)
  const addModal = document.getElementById("addModal");
  const editModal = document.getElementById("editModal");
  const openAddBtn = document.getElementById("openAddModalBtn");
  const closeBtns = document.querySelectorAll("[data-close]");

  if (openAddBtn && addModal) {
    openAddBtn.addEventListener("click", () => addModal.classList.add("open"));
  }

  closeBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      const targetModal = document.getElementById(btn.dataset.close);
      if (targetModal) targetModal.classList.remove("open");
    });
  });

  // Populate & Open Product Edit Modal
  const editBtns = document.querySelectorAll(".edit-btn");
  editBtns.forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      if (!editModal) return;

      document.getElementById("editSku").value = btn.getAttribute("data-sku") || "";
      document.getElementById("editName").value = btn.getAttribute("data-name") || "";
      document.getElementById("editCategory").value = btn.getAttribute("data-category") || "";
      document.getElementById("editPrice").value = btn.getAttribute("data-price") || "0";
      document.getElementById("editStock").value = btn.getAttribute("data-stock") || "0";

      editModal.classList.add("open");
    });
  });

  // 3. Category Modals Logic
  const addCatModal = document.getElementById("addCategoryModal");
  const editCatModal = document.getElementById("editCategoryModal");
  const openAddCatBtn = document.getElementById("openAddCategoryModalBtn");

  if (openAddCatBtn && addCatModal) {
    openAddCatBtn.addEventListener("click", () => addCatModal.classList.add("open"));
  }

  const editCatBtns = document.querySelectorAll(".edit-cat-btn");
  editCatBtns.forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      if (!editCatModal) return;

      document.getElementById("editCatSlug").value = btn.getAttribute("data-slug") || "";
      document.getElementById("editCatName").value = btn.getAttribute("data-name") || "";
      document.getElementById("editCatDesc").value = btn.getAttribute("data-desc") || "";
      document.getElementById("editCatStatus").value = btn.getAttribute("data-status") || "active";

      editCatModal.classList.add("open");
    });
  });

  // 4. Logout Modal & API Logic
  const logoutBtn = document.getElementById('logoutBtn');
  const logoutModal = document.getElementById('logoutModal');
  const confirmLogoutBtn = document.getElementById('confirmLogoutBtn');

  if (logoutBtn && logoutModal) {
    logoutBtn.addEventListener('click', function (e) {
      e.preventDefault();
      logoutModal.classList.add('open');
    });
  }

  if (confirmLogoutBtn) {
    confirmLogoutBtn.addEventListener('click', async function () {
      const token = localStorage.getItem('access_token');

      try {
        if (token) {
          await fetch('/logout', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          });
        }
      } catch (error) {
        console.error('Logout error:', error);
      } finally {
        localStorage.removeItem('access_token');
        window.location.href = '/admin/login';
      }
    });
  }

  // 5. Fetch User Profile & Populate Sidebar Foot
  const token = localStorage.getItem('access_token');
  if (token) {
    fetch('/api/user/profile', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    })
    .then(response => response.json())
    .then(result => {
      if (result && result.data) {
        const nameEl = document.getElementById('userName');
        const roleEl = document.getElementById('userRole');
        const avatarEl = document.getElementById('userAvatar');

        const fullName = result.data.name || 'Admin';
        const roleName = result.data.role || 'Administrator';

        if (nameEl) nameEl.textContent = fullName;
        if (roleEl) roleEl.textContent = roleName;

        if (avatarEl && fullName) {
          avatarEl.textContent = fullName.charAt(0).toUpperCase();
        }
      }
    })
    .catch(error => {
      console.error('Failed to fetch user profile:', error);
    });
  }
});

// 6. Global Toast Notification Helper
function showToast(message, type = "error") {
  let container = document.getElementById("toastContainer");
  if (!container) {
    container = document.createElement("div");
    container.id = "toastContainer";
    container.className = "toast-container";
    document.body.appendChild(container);
  }

  const toast = document.createElement("div");
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `
    <span>${message}</span>
    <span style="cursor:pointer; margin-left:12px; font-weight:bold;" onclick="this.parentElement.remove()">&times;</span>
  `;

  container.appendChild(toast);

  setTimeout(() => {
    toast.classList.add("fade-out");
    toast.addEventListener("animationend", () => toast.remove());
  }, 4000);
}