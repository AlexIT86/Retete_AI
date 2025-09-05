// Animații smooth scroll pentru ancora
document.querySelectorAll('a[href^="#"]').forEach(function(anchor) {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        var target = document.querySelector(this.getAttribute('href'));
        if (target) {
            target.scrollIntoView({ behavior: 'smooth' });
        }
    });
});

// Auto-hide alerts după 5 secunde
setTimeout(function() {
    var alerts = document.querySelectorAll('.alert');
    alerts.forEach(function(alert) {
        try {
            var bsAlert = new bootstrap.Alert(alert);
            bsAlert.close();
        } catch (e) {}
    });
}, 5000);

// Helper pentru CSRF: citește tokenul din meta
function getCsrfToken() {
    var meta = document.querySelector('meta[name="csrf-token"]');
    return meta ? meta.getAttribute('content') : '';
}

// Interceptează fetch pentru a adăuga headerul CSRF automat
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


