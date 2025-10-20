/**
 * gallery.js - Logică pentru pagina de galerie (listă rețete salvate)
 * 
 * Funcționalități:
 * - Filtrare rețete după text (căutare în titlu)
 * - Filtrare după dificultate (1-5 stele)
 * - Confirmare ștergere cu modal
 */

// ==================== DATE GLOBALE ====================
// Array cu toate rețetele și referințe la elementele DOM
var recipesData = [];

// ==================== INIȚIALIZARE LA DOM READY ====================
document.addEventListener('DOMContentLoaded', function() {
    // Colectează toate cardurile de rețete și extrage datele relevante
    var recipeCards = document.querySelectorAll('.recipe-card');
    recipesData = Array.from(recipeCards).map(function(card) {
        return {
            element: card,                                      // Referință DOM
            difficulty: parseInt(card.dataset.difficulty),      // Dificultate 1-5
            title: card.dataset.title                           // Titlu lowercase pentru căutare
        };
    });

    initializeFilters();

    // Atașează event listeners pe butoanele de ștergere
    document.querySelectorAll('.delete-btn').forEach(function(btn){
        btn.addEventListener('click', function() {
            var id = this.getAttribute('data-id');
            var title = this.getAttribute('data-title');
            confirmDelete(id, title);
        });
    });
});

// ==================== INIȚIALIZARE FILTRE ====================
/**
 * Atașează event listeners pe controalele de filtrare
 */
function initializeFilters() {
    var searchInput = document.getElementById('searchInput');
    var difficultyFilter = document.getElementById('difficultyFilter');

    if (searchInput) searchInput.addEventListener('input', filterRecipes);
    if (difficultyFilter) difficultyFilter.addEventListener('change', filterRecipes);
}

// ==================== FILTRARE ====================
/**
 * Filtrează rețetele conform criteriilor selectate
 * Ascunde/arată cardurile corespunzătoare
 */
function filterRecipes() {
    var searchTerm = (document.getElementById('searchInput')?.value || '').toLowerCase();
    var difficultyValue = document.getElementById('difficultyFilter')?.value || '';

    // FILTRARE
    var filteredRecipes = recipesData.filter(function(recipe){
        var matchesSearch = recipe.title.includes(searchTerm);
        var matchesDifficulty = !difficultyValue || (recipe.difficulty + '') === difficultyValue;
        return matchesSearch && matchesDifficulty;
    });

    // AFIȘARE REZULTATE
    var recipesGrid = document.getElementById('recipesGrid');
    var noResults = document.getElementById('noResults');
    
    if (recipesGrid && noResults) {
        // Ascunde toate cardurile mai întâi
        recipesData.forEach(function(recipe){ recipe.element.style.display = 'none'; });
        
        if (filteredRecipes.length > 0) {
            // Arată doar cardurile filtrate
            filteredRecipes.forEach(function(recipe){
                recipe.element.style.display = 'block';
            });
            noResults.style.display = 'none';
        } else {
            // Mesaj "Nu am găsit nicio rețetă"
            noResults.style.display = 'block';
        }
    }
}

// ==================== ȘTERGERE REȚETĂ ====================
/**
 * Deschide modal-ul de confirmare ștergere
 * @param {string} recipeId - ID-ul rețetei de șters
 * @param {string} recipeTitle - Titlul rețetei (pentru afișare în modal)
 */
function confirmDelete(recipeId, recipeTitle) {
    document.getElementById('recipeToDelete').textContent = recipeTitle;
    document.getElementById('deleteForm').action = '/delete_recipe/' + recipeId;
    var modal = new bootstrap.Modal(document.getElementById('deleteModal'));
    modal.show();
}

// ==================== EFECTE VIZUALE ====================
// Hover effect pentru carduri - bordură albastră
document.addEventListener('DOMContentLoaded', function() {
    var cards = document.querySelectorAll('.recipe-item');
    cards.forEach(function(card){
        card.addEventListener('mouseenter', function(){ 
            this.style.borderColor = 'var(--primary-color)'; 
        });
        card.addEventListener('mouseleave', function(){ 
            this.style.borderColor = ''; 
        });
    });
});
