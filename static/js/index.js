/**
 * index.js - Logică pentru pagina principală (formularul de generare rețete)
 * 
 * Funcționalități:
 * - Validare în timp real a câmpului de ingrediente
 * - Loading animation la submit
 */


// ==================== LOADING ANIMATION ====================
// Când se submit formularul, butonul devine disabled și arată loading spinner
document.getElementById('ingredientsForm').addEventListener('submit', function() {
    var btn = document.getElementById('generateBtn');
    btn.innerHTML = '<span class="loading"></span> Generez rețeta...';
    btn.disabled = true;
});

// ==================== VALIDARE INGREDIENTE ====================
// Validare în timp real: butonul devine activ doar când există text în textarea
document.getElementById('ingredients').addEventListener('input', function() {
    var value = this.value.trim();
    var btn = document.getElementById('generateBtn');
    if (value.length > 0) {
        btn.classList.remove('btn-secondary');
        btn.classList.add('btn-primary');
        btn.disabled = false;
    } else {
        btn.classList.remove('btn-primary');
        btn.classList.add('btn-secondary');
        btn.disabled = true;
    }
});



