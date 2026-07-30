document.addEventListener("DOMContentLoaded", function () {
    const token = localStorage.getItem('access_token');
    if (!token && window.location.pathname !== '/admin/login') {
        window.location.href = '/admin/login';
    }
});