/*
==============================================
  faq.js — Knowledge Base search logic.

  Accordion body interactions (toggleCard,
  toggleSubAcc) are handled by shared
  functions in app.js.
==============================================
*/

// Live search — filters the featured stepper card and all accordion items.
function kbSearch(value) {
  const query = value.trim().toLowerCase();
  const clearBtn = document.getElementById('kb-search-clear');
  const noResults = document.getElementById('kb-no-results');
  const feat = document.getElementById('kb-feat-process');

  if (!query) {
    kbClearSearch();
    return;
  }

  if (clearBtn) clearBtn.style.display = 'flex';

  let anyVisible = false;

  // Featured stepper card
  if (feat) {
    const featText = (feat.dataset.kbSearchable || '') + ' ' + feat.textContent.toLowerCase();
    const match = featText.includes(query);
    feat.style.display = match ? '' : 'none';
    if (match) anyVisible = true;
  }

  // Accordion items inside category boxes
  document.querySelectorAll('.kb-acc-item').forEach(item => {
    const keywords = (item.dataset.kbKeywords || '') + ' ' + item.textContent.toLowerCase();
    const match = keywords.includes(query);
    item.style.display = match ? '' : 'none';
    if (match) anyVisible = true;
  });

  // Hide category containers when all their items are hidden
  document.querySelectorAll('.kb-cat').forEach(cat => {
    const hasVisible = Array.from(cat.querySelectorAll('.kb-acc-item'))
      .some(i => i.style.display !== 'none');
    cat.style.display = hasVisible ? '' : 'none';
  });

  // No-results message
  if (noResults) {
    noResults.style.display = anyVisible ? 'none' : 'block';
    const term = document.getElementById('kb-no-results-term');
    if (!anyVisible && term) term.textContent = value.trim();
  }
}

// Clear search — restore all items.
function kbClearSearch() {
  const input    = document.getElementById('kb-search');
  const clearBtn = document.getElementById('kb-search-clear');
  const noResults = document.getElementById('kb-no-results');
  const feat     = document.getElementById('kb-feat-process');

  if (input)    input.value = '';
  if (clearBtn) clearBtn.style.display = 'none';
  if (noResults) noResults.style.display = 'none';
  if (feat)     feat.style.display = '';

  document.querySelectorAll('.kb-acc-item').forEach(i => i.style.display = '');
  document.querySelectorAll('.kb-cat').forEach(c => c.style.display = '');
}
