// Funcție pentru auto-completarea ingredientelor
function fillIngredients(ingredients) {
    var textarea = document.getElementById('ingredients');
    textarea.value = ingredients;
    textarea.focus();

    textarea.style.transform = 'scale(1.02)';
    textarea.style.borderColor = 'var(--primary-color)';

    setTimeout(function() {
        textarea.style.transform = 'scale(1)';
        textarea.style.borderColor = '';
    }, 300);
}

// Loading animation pentru buton
document.getElementById('ingredientsForm').addEventListener('submit', function() {
    var btn = document.getElementById('generateBtn');
    btn.innerHTML = '<span class="loading"></span> Generez rețeta...';
    btn.disabled = true;
});

// Validare ingrediente
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

// Efecte vizuale pentru carduri + click pentru umplere
document.querySelectorAll('.ingredient-suggestion').forEach(function(card) {
    card.addEventListener('mouseenter', function() {
        this.style.backgroundColor = 'rgba(230, 126, 34, 0.05)';
    });
    card.addEventListener('mouseleave', function() {
        this.style.backgroundColor = '';
    });
    card.addEventListener('click', function() {
        var val = this.getAttribute('data-fill');
        if (val) fillIngredients(val);
    });
});


