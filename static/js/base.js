/**
 * base.js - Script comun pentru toate paginile
 * 
 * Funcționalități:
 * - Smooth scroll pentru linkuri interne (ancora)
 * - Auto-închidere alert-uri după 5 secunde
 * - CSRF token injection automat în toate request-urile fetch
 */

// ==================== SMOOTH SCROLL ====================
// Animații smooth scroll pentru ancora (linkuri #sectiune)
document.querySelectorAll('a[href^="#"]').forEach(function(anchor) {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        var target = document.querySelector(this.getAttribute('href'));
        if (target) {
            target.scrollIntoView({ behavior: 'smooth' });
        }
    });
});

// ==================== AUTO-HIDE ALERTS ====================
// Auto-hide alerts după 5 secunde pentru UX mai fluid
setTimeout(function() {
    var alerts = document.querySelectorAll('.alert');
    alerts.forEach(function(alert) {
        try {
            var bsAlert = new bootstrap.Alert(alert);
            bsAlert.close();
        } catch (e) {}
    });
}, 5000);

// ==================== CSRF PROTECTION ====================
// Helper pentru CSRF: citește tokenul din meta tag
function getCsrfToken() {
    var meta = document.querySelector('meta[name="csrf-token"]');
    return meta ? meta.getAttribute('content') : '';
}

// Interceptează toate apelurile fetch și adaugă automat header-ul X-CSRFToken
// Astfel nu trebuie să adăugăm manual token-ul în fiecare fetch
(function() {
    var originalFetch = window.fetch;
    window.fetch = function(input, init) {
        init = init || {};
        init.headers = init.headers || {};
        if (!('X-CSRFToken' in init.headers)) {
            init.headers['X-CSRFToken'] = getCsrfToken();
        }
        return originalFetch(input, init);
    }
})();


