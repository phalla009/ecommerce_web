document.addEventListener('DOMContentLoaded', () => {
  const statRevenue = document.getElementById('statRevenue');
  const statRevenueDelta = document.getElementById('statRevenueDelta');
  const statOrders = document.getElementById('statOrders');
  const statOrdersDelta = document.getElementById('statOrdersDelta');
  const statProducts = document.getElementById('statProducts');
  const statStockDelta = document.getElementById('statStockDelta');
  const statCustomers = document.getElementById('statCustomers');
  const statCustomersDelta = document.getElementById('statCustomersDelta');

  const recentOrdersBody = document.getElementById('recentOrdersBody');
  const searchInput = document.getElementById('dashboardSearch');

  let ordersCache = [];

  // Helper to safely display HTML
  function escapeHtml(text) {
    if (!text) return '';
    return String(text)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  // Format Status Badge
  function getStatusBadge(status) {
    const s = String(status).toLowerCase();
    if (s === 'paid' || s === 'completed') {
      return `<span class="badge badge-paid">Paid</span>`;
    } else if (s === 'pending') {
      return `<span class="badge badge-pending">Pending</span>`;
    } else if (s === 'refunded' || s === 'cancelled') {
      return `<span class="badge badge-refunded">Refunded</span>`;
    }
    return `<span class="badge">${escapeHtml(status)}</span>`;
  }

  // 1. Fetch Dashboard Analytics Metrics (Revenue, Orders, Customers)
  async function loadDashboardStats() {
    try {
      const res = await fetch('/api/dashboard/stats');
      if (!res.ok) throw new Error('Failed to fetch dashboard stats');

      const data = await res.json();

      if (statRevenue) statRevenue.textContent = `$${parseFloat(data.revenue_today || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}`;
      if (statRevenueDelta) statRevenueDelta.innerHTML = data.revenue_delta || '&#9650; 0% vs yesterday';

      if (statOrders) statOrders.textContent = data.orders_today || 0;
      if (statOrdersDelta) statOrdersDelta.innerHTML = data.orders_delta || '&#9650; 0 new';

      if (statCustomers) statCustomers.textContent = data.new_customers || 0;
      if (statCustomersDelta) statCustomersDelta.innerHTML = data.customers_delta || '0% vs last week';

    } catch (err) {
      console.error('Error loading dashboard stats:', err);
    }
  }

  // 2. Fetch Products Live directly from Products API (/api/products)
  async function loadProductStats() {
    try {
      const res = await fetch('/api/products');
      if (!res.ok) throw new Error('Failed to fetch products');

      const data = await res.json();

      const totalProducts = data.total_products || (data.products ? data.products.length : 0);
      const lowStockCount = (data.products || []).filter(p => (p.stock || 0) <= 5).length;

      if (statProducts) statProducts.textContent = totalProducts;
      if (statStockDelta) statStockDelta.textContent = `${lowStockCount} low stock`;

    } catch (err) {
      console.error('Error loading product stats:', err);
    }
  }

  // 3. Fetch Recent Orders List
  async function loadRecentOrders() {
    try {
      recentOrdersBody.innerHTML = `<tr><td colspan="6" style="text-align: center;" class="muted">Loading recent orders...</td></tr>`;

      const res = await fetch('/api/dashboard/recent-orders');
      if (!res.ok) throw new Error('Failed to fetch recent orders');

      const data = await res.json();
      ordersCache = Array.isArray(data) ? data : [];

      renderOrders(ordersCache);
    } catch (err) {
      console.error('Error loading recent orders:', err);
      recentOrdersBody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: var(--red);">Failed to load recent orders.</td></tr>`;
    }
  }

  // 4. Render Orders Table
  function renderOrders(orders) {
    if (!orders || orders.length === 0) {
      recentOrdersBody.innerHTML = `<tr><td colspan="6" style="text-align: center;" class="muted">No recent orders found.</td></tr>`;
      return;
    }

    recentOrdersBody.innerHTML = orders.map(order => `
      <tr>
        <td class="mono">#${order.order_number || order.id}</td>
        <td>${escapeHtml(order.customer_name || 'Guest')}</td>
        <td>${order.item_count || 1}</td>
        <td class="mono">$${parseFloat(order.total_amount || 0).toFixed(2)}</td>
        <td>${getStatusBadge(order.status || 'Pending')}</td>
        <td class="muted">${order.order_date || 'Today'}</td>
      </tr>
    `).join('');
  }

  // 5. Search Filter
  searchInput?.addEventListener('input', (e) => {
    const query = e.target.value.toLowerCase().trim();
    if (!query) {
      renderOrders(ordersCache);
      return;
    }

    const filtered = ordersCache.filter(order =>
      String(order.id).includes(query) ||
      String(order.order_number).toLowerCase().includes(query) ||
      (order.customer_name && order.customer_name.toLowerCase().includes(query)) ||
      (order.status && order.status.toLowerCase().includes(query))
    );

    renderOrders(filtered);
  });

  // Initial Load
  loadDashboardStats();
  loadProductStats();
  loadRecentOrders();
});