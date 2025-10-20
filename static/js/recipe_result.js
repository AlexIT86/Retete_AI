/**
 * recipe_result.js - Logică pentru pagina de rezultate după generarea rețetei
 * 
 * Funcționalități:
 * - Salvarea rețetei în baza de date (fetch la /save_recipe)
 * - Colectare date rețetă din DOM (evită JSON inline în HTML)
 */

// ==================== COLECTARE DATE REȚETĂ DIN DOM ====================
// Rețetă din context - colectăm datele din DOM pentru a evita script inline cu obiect JS
// Acest obiect va fi folosit pentru salvare
var recipeData = (function collectRecipeFromDom() {
    try {
        var title = document.querySelector('h1.display-5').textContent.trim();
        var ingredients = Array.from(document.querySelectorAll('.ingredients-list ul li')).map(function(li){
            return li.textContent.trim();
        });
        var instructions = Array.from(document.querySelectorAll('.instructions-list ol li')).map(function(li){
            return li.textContent.trim();
        });
        var difficultyText = document.querySelector('.mb-3 .text-muted')?.textContent || '';
        var difficulty = parseInt((difficultyText.match(/(\d+)/) || [0, 3])[1], 10) || 3;
        var wine = document.querySelector('.wine-pairing p')?.textContent.trim() || '';
        return { title: title, ingredients: ingredients, instructions: instructions, difficulty: difficulty, wine_pairing: wine };
    } catch (e) {
        return {};
    }
})();

// ==================== SALVARE REȚETĂ ====================
/**
 * Salvează rețeta în baza de date prin POST JSON la /save_recipe
 * La succes, redirecționează la galerie
 */
async function saveRecipe() {
    var btn = document.getElementById('saveRecipeBtn');
    if (btn) {
        btn.disabled = true;
        btn.dataset.original = btn.innerHTML;
        btn.innerHTML = '<span class="loading"></span> Salvez...';
    }

    try {
        // Trimite JSON cu datele rețetei (CSRF token se adaugă automat din base.js)
        var response = await fetch('/save_recipe', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(recipeData)
        });
        var result = await response.json();

        if (result && result.success) {
            // La succes, redirecționează la galerie
            window.location.href = '/gallery';
            return;
        }
        throw new Error(result && result.message ? result.message : 'Eroare la salvare');
    } catch (e) {
        // La eroare, restaurează butonul și afișează alert
        if (btn) {
            btn.disabled = false;
            btn.innerHTML = btn.dataset.original || '<i class="fas fa-save"></i> Salvează în Galerie';
        }
        alert('Nu s-a putut salva rețeta: ' + (e.message || 'Eroare necunoscută'));
    }
}

// ==================== INIȚIALIZARE EVENT LISTENERS ====================
/**
 * Atașează event listeners la butoane (la load sau când DOM-ul e ready)
 * Flag _bound previne dublarea listener-urilor
 */
function initRecipeResultPage() {
    var saveBtn = document.getElementById('saveRecipeBtn');
    if (saveBtn && !saveBtn._bound) { 
        saveBtn.addEventListener('click', saveRecipe); 
        saveBtn._bound = true; 
    }
}

// Rulează inițializarea când DOM-ul e gata
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initRecipeResultPage);
} else {
    initRecipeResultPage();
}
