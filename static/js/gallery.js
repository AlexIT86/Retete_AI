var recipesData = [];

document.addEventListener('DOMContentLoaded', function() {
    var recipeCards = document.querySelectorAll('.recipe-card');
    recipesData = Array.from(recipeCards).map(function(card) {
        return {
            element: card,
            difficulty: parseInt(card.dataset.difficulty),
            title: card.dataset.title,
            created: card.dataset.created
        };
    });

    initializeFilters();

    // Attach delete buttons
    document.querySelectorAll('.delete-btn').forEach(function(btn){
        btn.addEventListener('click', function() {
            var id = this.getAttribute('data-id');
            var title = this.getAttribute('data-title');
            confirmDelete(id, title);
        });
    });
});

function initializeFilters() {
    var searchInput = document.getElementById('searchInput');
    var difficultyFilter = document.getElementById('difficultyFilter');
    var sortFilter = document.getElementById('sortFilter');

    if (searchInput) searchInput.addEventListener('input', filterRecipes);
    if (difficultyFilter) difficultyFilter.addEventListener('change', filterRecipes);
    if (sortFilter) sortFilter.addEventListener('change', filterRecipes);
}

function filterRecipes() {
    var searchTerm = (document.getElementById('searchInput')?.value || '').toLowerCase();
    var difficultyValue = document.getElementById('difficultyFilter')?.value || '';
    var sortValue = document.getElementById('sortFilter')?.value || 'newest';

    var filteredRecipes = recipesData.filter(function(recipe){
        var matchesSearch = recipe.title.includes(searchTerm);
        var matchesDifficulty = !difficultyValue || (recipe.difficulty + '') === difficultyValue;
        return matchesSearch && matchesDifficulty;
    });

    filteredRecipes.sort(function(a, b){
        switch (sortValue) {
            case 'oldest': return new Date(a.created) - new Date(b.created);
            case 'difficulty-asc': return a.difficulty - b.difficulty;
            case 'difficulty-desc': return b.difficulty - a.difficulty;
            case 'title': return a.title.localeCompare(b.title);
            case 'newest':
            default: return new Date(b.created) - new Date(a.created);
        }
    });

    var recipesGrid = document.getElementById('recipesGrid');
    var noResults = document.getElementById('noResults');
    if (recipesGrid && noResults) {
        recipesData.forEach(function(recipe){ recipe.element.style.display = 'none'; });
        if (filteredRecipes.length > 0) {
            filteredRecipes.forEach(function(recipe, index){
                recipe.element.style.display = 'block';
                recipe.element.style.animationDelay = (index * 0.1) + 's';
            });
            noResults.style.display = 'none';
        } else {
            noResults.style.display = 'block';
        }
    }

    setTimeout(function(){
        filteredRecipes.forEach(function(recipe){ recipe.element.classList.add('recipe-card'); });
    }, 50);
}

function confirmDelete(recipeId, recipeTitle) {
    document.getElementById('recipeToDelete').textContent = recipeTitle;
    document.getElementById('deleteForm').action = '/delete_recipe/' + recipeId;
    var modal = new bootstrap.Modal(document.getElementById('deleteModal'));
    modal.show();
}

document.addEventListener('DOMContentLoaded', function() {
    var cards = document.querySelectorAll('.recipe-item');
    cards.forEach(function(card){
        card.addEventListener('mouseenter', function(){ this.style.borderColor = 'var(--primary-color)'; });
        card.addEventListener('mouseleave', function(){ this.style.borderColor = ''; });
    });

    var searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.addEventListener('focus', function(){
            this.parentElement.parentElement.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        });
    }
});

document.addEventListener('keydown', function(e) {
    if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
        e.preventDefault();
        var searchInput = document.getElementById('searchInput');
        if (searchInput) { searchInput.focus(); searchInput.select(); }
    }
});

function saveFilterPreferences() {
    var searchInput = document.getElementById('searchInput');
    var difficultyFilter = document.getElementById('difficultyFilter');
    var sortFilter = document.getElementById('sortFilter');
    var preferences = {
        search: searchInput?.value || '',
        difficulty: difficultyFilter?.value || '',
        sort: sortFilter?.value || 'newest'
    };
    localStorage.setItem('recipeFilters', JSON.stringify(preferences));
}

function loadFilterPreferences() {
    var saved = localStorage.getItem('recipeFilters');
    if (saved) {
        var preferences = JSON.parse(saved);
        var searchInput = document.getElementById('searchInput');
        var difficultyFilter = document.getElementById('difficultyFilter');
        var sortFilter = document.getElementById('sortFilter');
        if (searchInput) searchInput.value = preferences.search || '';
        if (difficultyFilter) difficultyFilter.value = preferences.difficulty || '';
        if (sortFilter) sortFilter.value = preferences.sort || 'newest';
        filterRecipes();
    }
}

document.addEventListener('DOMContentLoaded', loadFilterPreferences);
document.addEventListener('DOMContentLoaded', function(){
    ['searchInput', 'difficultyFilter', 'sortFilter'].forEach(function(id){
        var el = document.getElementById(id);
        if (el) {
            el.addEventListener('change', saveFilterPreferences);
            el.addEventListener('input', saveFilterPreferences);
        }
    });
});


