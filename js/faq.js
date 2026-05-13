/*
==============================================
  faq.js — Knowledge Hub interactive logic:
  House vs Apartment toggle, Are You Ready
  readiness tracker, and live search.

  Accordion interactions (toggleCard,
  toggleSubAcc) are handled by app.js.
==============================================
*/

// ── House vs Apartment toggle ──────────────

function hvaSwitch(panel, btn) {
  document.querySelectorAll('.hva-tab').forEach(b => b.classList.remove('active'));
  document.querySelectorAll('.hva-panel').forEach(p => p.style.display = 'none');
  btn.classList.add('active');
  document.getElementById('hva-' + panel).style.display = 'flex';
}

// ── Are You Ready readiness tracker ────────

function updateReadiness() {
  const boxes   = document.querySelectorAll('.ready-cb');
  const total   = boxes.length;
  const checked = Array.from(boxes).filter(b => b.checked).length;
  const pct     = Math.round((checked / total) * 100);

  const fill    = document.getElementById('ready-fill');
  const score   = document.getElementById('ready-score');
  const verdict = document.getElementById('ready-verdict');

  if (!fill) return;

  fill.style.width = pct + '%';
  score.textContent = checked + ' / ' + total;

  // Colour tiers
  fill.className = 'ready-fill';
  if (pct === 0)       { fill.classList.add('');         }
  else if (pct <= 33)  { fill.classList.add('r-low');    }
  else if (pct <= 66)  { fill.classList.add('r-mid');    }
  else if (pct < 100)  { fill.classList.add('r-good');   }
  else                 { fill.classList.add('r-ready');  }

  // Verdict label
  const labels = ['Not started', 'Early stages', 'Getting there', 'Almost ready', 'Ready to go! 🎉'];
  const idx = pct === 0 ? 0 : pct <= 33 ? 1 : pct <= 66 ? 2 : pct < 100 ? 3 : 4;
  verdict.textContent = labels[idx];

  const colours = ['var(--muted)', '#ef4444', '#f97316', '#16a34a', 'var(--teal-dark)'];
  verdict.style.color = colours[idx];
}

// ── Knowledge Hub live search ───────────────

function kbSearch(value) {
  const query    = value.trim().toLowerCase();
  const clearBtn = document.getElementById('kb-search-clear');
  const noResults = document.getElementById('kb-no-results');
  const gsSection = document.getElementById('kb-section-gs');

  if (!query) {
    kbClearSearch();
    return;
  }

  if (clearBtn) clearBtn.style.display = 'flex';

  let anyVisible = false;

  // Getting Started section — search its full text
  if (gsSection) {
    const gsText = 'house apartment ready checklist financial stability savings habit emotional readiness first home getting started decision guide ' + gsSection.textContent.toLowerCase();
    const match  = gsText.includes(query);
    gsSection.style.display = match ? '' : 'none';
    if (match) anyVisible = true;
  }

  // Accordion items inside category boxes
  document.querySelectorAll('.kb-acc-item').forEach(item => {
    const keywords = (item.dataset.kbKeywords || '') + ' ' + item.textContent.toLowerCase();
    const match    = keywords.includes(query);
    item.style.display = match ? '' : 'none';
    if (match) anyVisible = true;
  });

  // Hide category containers when all items are hidden
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

function kbClearSearch() {
  const input     = document.getElementById('kb-search');
  const clearBtn  = document.getElementById('kb-search-clear');
  const noResults = document.getElementById('kb-no-results');
  const gsSection = document.getElementById('kb-section-gs');

  if (input)     input.value = '';
  if (clearBtn)  clearBtn.style.display = 'none';
  if (noResults) noResults.style.display = 'none';
  if (gsSection) gsSection.style.display = '';

  document.querySelectorAll('.kb-acc-item').forEach(i => i.style.display = '');
  document.querySelectorAll('.kb-cat').forEach(c => c.style.display = '');
}
