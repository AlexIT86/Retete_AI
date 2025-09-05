// Rețetă din context
// Colectăm datele din DOM pentru a evita script inline cu obiect JS
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

// Salvare rețetă
async function saveRecipe() {
    var btn = document.getElementById('saveRecipeBtn');
    if (btn) {
        btn.disabled = true;
        btn.dataset.original = btn.innerHTML;
        btn.innerHTML = '<span class="loading"></span> Salvez...';
    }

    try {
        var response = await fetch('/save_recipe', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(recipeData)
        });
        var result = await response.json();

        if (result && result.success) {
            window.location.href = '/gallery';
            return;
        }
        throw new Error(result && result.message ? result.message : 'Eroare la salvare');
    } catch (e) {
        if (btn) {
            btn.disabled = false;
            btn.innerHTML = btn.dataset.original || '<i class="fas fa-save"></i> Salvează în Galerie';
        }
        alert('Nu s-a putut salva rețeta: ' + (e.message || 'Eroare necunoscută'));
    }
}

function openShareModal() {
    var modal = new bootstrap.Modal(document.getElementById('shareModal'));
    modal.show();
}

function shareOnSocial(platform) {
    var recipeText = 'Am găsit o rețetă grozavă: ' + recipeData.title + '! Generată cu AI pe Recipe Generator.';
    var url = window.location.href;
    var shareUrl = '';
    switch (platform) {
        case 'facebook':
            shareUrl = 'https://www.facebook.com/sharer/sharer.php?u=' + encodeURIComponent(url) + '&quote=' + encodeURIComponent(recipeText);
            break;
        case 'twitter':
            shareUrl = 'https://twitter.com/intent/tweet?text=' + encodeURIComponent(recipeText) + '&url=' + encodeURIComponent(url);
            break;
        case 'whatsapp':
            shareUrl = 'https://wa.me/?text=' + encodeURIComponent(recipeText + ' ' + url);
            break;
    }
    if (shareUrl) window.open(shareUrl, '_blank', 'width=600,height=400');
}

async function copyToClipboard() {
    var recipeText = (
        recipeData.title + '\n\n' +
        'INGREDIENTE:\n' + recipeData.ingredients.map(function(ing){ return '• ' + ing; }).join('\n') + '\n\n' +
        'INSTRUCȚIUNI:\n' + recipeData.instructions.map(function(inst, idx){ return (idx+1) + '. ' + inst; }).join('\n') + '\n\n' +
        'DIFICULTATE: ' + recipeData.difficulty + '/5 stele\n\n' +
        'RECOMANDARE BĂUTURĂ: ' + recipeData.wine_pairing + '\n\n' +
        'Generat cu Recipe AI Generator'
    ).trim();
    try {
        await navigator.clipboard.writeText(recipeText);
        var btn = document.getElementById('copyTextBtn');
        var original = btn.innerHTML;
        btn.innerHTML = '<i class="fas fa-check"></i> Copiat!';
        btn.classList.add('btn-success');
        btn.classList.remove('btn-outline-secondary');
        setTimeout(function(){
            btn.innerHTML = original;
            btn.classList.remove('btn-success');
            btn.classList.add('btn-outline-secondary');
        }, 2000);
    } catch (e) {
        alert('Nu am putut copia textul. Încearcă să selectezi manual textul.');
    }
}

function initRecipeResultPage() {
    var saveBtn = document.getElementById('saveRecipeBtn');
    if (saveBtn && !saveBtn._bound) { saveBtn.addEventListener('click', saveRecipe); saveBtn._bound = true; }

    var shareBtn = document.getElementById('shareRecipeBtn');
    if (shareBtn && !shareBtn._bound) { shareBtn.addEventListener('click', openShareModal); shareBtn._bound = true; }

    document.querySelectorAll('.share-platform').forEach(function(btn){
        if (!btn._bound) {
            btn.addEventListener('click', function(){
                var platform = this.getAttribute('data-platform');
                shareOnSocial(platform);
            });
            btn._bound = true;
        }
    });
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initRecipeResultPage);
} else {
    initRecipeResultPage();
}


