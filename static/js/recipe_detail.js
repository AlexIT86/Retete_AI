var timerInterval = null;
var timerSeconds = 300;
var currentTimerStep = 1;
var currentCookingStep = 1;
var totalSteps = (function(){
  var el = document.querySelectorAll('.instructions-list .instruction-item, .instructions-list ol li');
  return el ? el.length : 0;
})();

function updateIngredientsProgress() {
  var checkboxes = document.querySelectorAll('.ingredient-checkbox input[type="checkbox"]');
  var checked = document.querySelectorAll('.ingredient-checkbox input[type="checkbox"]:checked');
  var progress = (checked.length / (checkboxes.length || 1)) * 100;
  var progressBar = document.querySelector('.ingredients-progress .progress-bar');
  var progressText = document.querySelector('.progress-text');
  if (progressBar && progressText) {
    progressBar.style.width = progress + '%';
    progressText.textContent = checked.length + ' / ' + checkboxes.length;
  }
}

function markStepDone(stepNumber) {
  var step = document.querySelector('.instructions-list .instruction-item:nth-child(' + stepNumber + ')');
  if (step) {
    step.classList.add('completed');
    var button = step.querySelector('.instruction-done');
    if (button) {
      button.innerHTML = '<i class="fas fa-check-double"></i> Făcut';
      button.classList.remove('btn-outline-success');
      button.classList.add('btn-success');
      button.disabled = true;
    }
  }
}

function startTimer(stepNumber) {
  currentTimerStep = stepNumber;
  document.getElementById('timerStep').textContent = stepNumber;
  var modalEl = document.getElementById('timerModal');
  var existing = bootstrap.Modal.getInstance(modalEl);
  if (existing) { existing.hide(); }
  var modal = new bootstrap.Modal(modalEl, { backdrop: true, keyboard: true });
  modal.show();
}

function updateTimerDisplay() {
  var minutes = Math.floor(timerSeconds / 60).toString().padStart(2, '0');
  var seconds = (timerSeconds % 60).toString().padStart(2, '0');
  var display = document.getElementById('timerDisplay');
  if (display) display.textContent = minutes + ':' + seconds;
}

function toggleTimer() {
  if (timerInterval) {
    clearInterval(timerInterval);
    timerInterval = null;
    document.getElementById('startTimerBtn').innerHTML = '<i class="fas fa-play"></i> Start';
    return;
  }
  document.getElementById('startTimerBtn').innerHTML = '<i class="fas fa-pause"></i> Pauză';
  timerInterval = setInterval(function(){
    if (timerSeconds > 0) {
      timerSeconds -= 1; updateTimerDisplay();
    } else {
      clearInterval(timerInterval); timerInterval = null; alert('Timer finalizat!');
    }
  }, 1000);
}

function setTimer(seconds) { timerSeconds = seconds; updateTimerDisplay(); }
function resetTimer() { clearInterval(timerInterval); timerInterval = null; timerSeconds = 300; updateTimerDisplay(); }
function setCustomTimer() {
  var minutes = parseInt(document.getElementById('customMinutes').value || '0', 10);
  if (minutes > 0) { setTimer(minutes * 60); }
}

function printRecipe() { window.print(); }

function startCookingMode() {
  var modal = new bootstrap.Modal(document.getElementById('cookingModeModal'));
  modal.show();
  currentCookingStep = 1; updateCookingStep();
}

function updateCookingStep() {
  var currentText = document.getElementById('currentStepText');
  var items = document.querySelectorAll('.instructions-list .instruction-item, .instructions-list ol li');
  var stepCounter = document.getElementById('stepCounter');
  var progress = document.getElementById('cookingProgress');
  var badge = document.getElementById('currentStepNumber');
  if (items.length && currentText) { currentText.textContent = items[currentCookingStep - 1].textContent.trim(); }
  if (stepCounter) stepCounter.textContent = currentCookingStep;
  if (badge) badge.textContent = currentCookingStep;
  if (progress) progress.style.width = (currentCookingStep / (items.length || 1) * 100) + '%';
  document.getElementById('prevStepBtn').disabled = currentCookingStep <= 1;
  document.getElementById('nextStepBtn').disabled = currentCookingStep >= items.length;
}

function nextStep() { var items = document.querySelectorAll('.instructions-list .instruction-item, .instructions-list ol li'); if (currentCookingStep < items.length) { currentCookingStep += 1; updateCookingStep(); } }
function previousStep() { if (currentCookingStep > 1) { currentCookingStep -= 1; updateCookingStep(); } }
function pauseCooking() { /* noop for now */ }

function confirmDelete(recipeId, recipeTitle) {
  document.getElementById('recipeToDelete').textContent = recipeTitle;
  var modal = new bootstrap.Modal(document.getElementById('deleteModal'));
  modal.show();
}

function initRecipeDetailPage() {
  // ingredient progress
  document.querySelectorAll('.ingredient-checkbox input[type="checkbox"]').forEach(function(cb){
    cb.addEventListener('change', updateIngredientsProgress);
  });
  updateIngredientsProgress();

  // instruction buttons
  document.querySelectorAll('.instruction-done').forEach(function(btn){
    btn.addEventListener('click', function(){
      var step = parseInt(this.getAttribute('data-step'), 10); if (step) markStepDone(step);
    });
  });
  document.querySelectorAll('.instruction-timer').forEach(function(btn){
    btn.addEventListener('click', function(){
      var step = parseInt(this.getAttribute('data-step'), 10); if (step) startTimer(step);
    });
  });

  // timer
  var startBtn = document.getElementById('startTimerBtn');
  if (startBtn && !startBtn._bound) { startBtn.addEventListener('click', toggleTimer); startBtn._bound = true; }
  var resetBtn = document.getElementById('resetTimerBtn');
  if (resetBtn && !resetBtn._bound) { resetBtn.addEventListener('click', resetTimer); resetBtn._bound = true; }
  var setBtn = document.getElementById('setCustomTimerBtn');
  if (setBtn && !setBtn._bound) { setBtn.addEventListener('click', setCustomTimer); setBtn._bound = true; }
  document.querySelectorAll('.timer-preset').forEach(function(btn){
    if (!btn._bound) {
      btn.addEventListener('click', function(){ setTimer(parseInt(this.getAttribute('data-seconds'), 10)); });
      btn._bound = true;
    }
  });
  updateTimerDisplay();

  // top buttons
  document.getElementById('printRecipeBtn')?.addEventListener('click', printRecipe);
  document.getElementById('startCookingModeBtn')?.addEventListener('click', startCookingMode);
  document.getElementById('nextStepBtn')?.addEventListener('click', nextStep);
  document.getElementById('prevStepBtn')?.addEventListener('click', previousStep);
  document.getElementById('pauseCookingBtn')?.addEventListener('click', pauseCooking);
  document.getElementById('deleteRecipeBtn')?.addEventListener('click', function(){
    var id = this.getAttribute('data-id'); var title = this.getAttribute('data-title'); confirmDelete(id, title);
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initRecipeDetailPage);
} else {
  initRecipeDetailPage();
}


