/*
==============================================
  app.js — Core application logic: tab switching,
  stats panel toggle and highlight, Google
  Translate toggle, nav scroll indicator,
  state sub-navigation, accordion toggles,
  and app initialisation.
==============================================
*/

// ---- TAB CONTENT ANIMATION ----

// Elements that manage their own entrance animation — skip the generic slide-in.
const _ANIM_SKIP = new Set([
  'deposit-quote-banner',   // has quote-rise animation triggered by .quote-animate
  'deposit-pathways-wrapper', // has pathway-slide-in triggered by .cards-animate
]);

// Add .tab-anim-item with staggered animationDelay to each direct child of the
// tab panel, then force-reflow so re-visits re-trigger the animation from scratch.
function animateTabContent(tabId) {
  const panel = document.getElementById('tab-' + tabId);
  if (!panel) return;

  const children = Array.from(panel.children);

  // Step 1 — strip the animation class so a re-visit replays from the start.
  //           Do this synchronously so the browser can process the removal.
  children.forEach(el => {
    el.classList.remove('tab-anim-item');
    el.style.animationDelay = '';
  });

  // Step 2 — re-add in the NEXT animation frame.
  //           Using requestAnimationFrame (not a force-reflow) avoids disrupting
  //           other animation systems on the panel (e.g. deposit card slide-in).
  requestAnimationFrame(() => {
    let delay = 0;
    children.forEach(el => {
      if (!el.isConnected) return; // guard: element may have been removed
      if ([...el.classList].some(c => _ANIM_SKIP.has(c))) return;
      el.style.animationDelay = delay + 'ms';
      el.classList.add('tab-anim-item');
      delay += 80;
    });
  });
}

// ---- TAB SWITCHING ----

// Switch to the given tab and activate the nav button.
// Also triggers calc/rental updates and highlights the relevant stats widgets.
function switchTab(tab, btn) {
  closeSidebar();
  document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  document.getElementById('tab-' + tab).classList.add('active');
  btn.classList.add('active');
  animateTabContent(tab);
  if (tab === 'calc') updateCalc();
  if (tab === 'deposit') {
    // Trigger pathway card entrance animations on first visit to this tab
    const wrapper = document.querySelector('.deposit-pathways-wrapper');
    if (wrapper) wrapper.classList.add('cards-animate');
    // Trigger quote banner animation (slight delay after cards)
    const quote = document.querySelector('.deposit-quote-banner');
    if (quote) quote.classList.add('quote-animate');
  }
  if (tab === 'rental') {
    if (!rentalInitialised) {
      initRental();
      rentalInitialised = true;
    } else {
      updateRental();
    }
  }
  updateStatsHighlight(tab);
}

// ---- STATS PANEL ----

// Map: tab → which widgets to highlight
const STATS_HIGHLIGHT_MAP = {
  home:    [],
  advice:  [],
  deposit: [],
  grants:  ['sw-median'],
  borrow:  ['sw-rates'],
  calc:    ['sw-rba'],
  rental:  ['sw-median', 'sw-auction'],
  faq:     [],
};

let _statsPanelOpen = false;

// Toggle the fixed right-side stats panel open/closed.
function toggleStatsPanel() {
  _statsPanelOpen = !_statsPanelOpen;
  document.body.classList.toggle('sp-open', _statsPanelOpen);
}

// Initialise the stats panel on page load.
function initStats() {
  // Data is hardcoded — fetched/verified once per session.
  // Panel starts minimised; body.sp-open class drives all visual state.
  updateStatsHighlight('home');
}

// Highlight stats widgets relevant to the current tab.
function updateStatsHighlight(tab) {
  const highlighted = STATS_HIGHLIGHT_MAP[tab] || [];
  document.querySelectorAll('#stats-panel .sp-widget').forEach(w => {
    const active = highlighted.includes(w.id);
    w.classList.toggle('sp-highlight', active);
  });
}

// ---- GOOGLE TRANSLATE TOGGLE ----

let _translated = false;

// Fire the Google Translate combo select to switch language.
function _fireCombo(lang) {
  const select = document.querySelector('.goog-te-combo');
  if (!select) return false;
  select.value = lang;
  const ev = document.createEvent('HTMLEvents');
  ev.initEvent('change', true, true);
  select.dispatchEvent(ev);
  return true;
}

// Retry translation up to `attempts` times with 250ms delay (widget may not be ready).
function _tryTranslate(lang, attempts) {
  if (!_fireCombo(lang) && attempts > 0) {
    setTimeout(() => _tryTranslate(lang, attempts - 1), 250);
  }
}

// Clear Google Translate cookie across all domain variants.
function _clearGoogTransCookie() {
  const past = 'expires=Thu, 01 Jan 1970 00:00:01 GMT; path=/;';
  document.cookie = 'googtrans=; ' + past;
  document.cookie = 'googtrans=; domain=' + window.location.hostname + '; ' + past;
  document.cookie = 'googtrans=; domain=.' + window.location.hostname + '; ' + past;
}

// Sync both desktop and mobile translate buttons to the same state.
function _syncTranslateBtns(active, text) {
  ['translate-btn', 'translate-btn-mobile'].forEach(id => {
    const btn   = document.getElementById(id);
    const label = document.getElementById(id + '-label');
    if (!btn) return;
    label.textContent = text;
    active ? btn.classList.add('active') : btn.classList.remove('active');
  });
}

// Toggle between Chinese translation and English (reload to revert).
function toggleTranslate() {
  if (!_translated) {
    // Save active tab so we can restore it if the user later reverts
    const active = document.querySelector('.tab-panel.active');
    if (active) sessionStorage.setItem('hp_tab', active.id);

    _tryTranslate('zh-CN', 12);
    _translated = true;
    _syncTranslateBtns(true, 'English');
  } else {
    // Save current tab, clear Google's cookie, then reload — the only
    // reliable way to fully revert all DOM text back to English.
    const active = document.querySelector('.tab-panel.active');
    if (active) sessionStorage.setItem('hp_tab', active.id);
    sessionStorage.setItem('hp_restoring', '1');
    _clearGoogTransCookie();
    window.location.reload();
  }
}

// After an English-restore reload, re-activate whichever tab was open.
(function () {
  if (!sessionStorage.getItem('hp_restoring')) return;
  sessionStorage.removeItem('hp_restoring');
  const tabId = sessionStorage.getItem('hp_tab') || 'tab-home';
  sessionStorage.removeItem('hp_tab');
  const panel = document.getElementById(tabId);
  if (!panel) return;
  document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.tab-btn').forEach(b => {
    b.classList.remove('active');
    if ((b.getAttribute('onclick') || '').includes("'" + tabId.replace('tab-', '') + "'")) {
      b.classList.add('active');
    }
  });
  panel.classList.add('active');
})();

// Navigate back to the home tab and deactivate all nav buttons.
function switchHome() {
  closeSidebar();
  document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  document.getElementById('tab-home').classList.add('active');
  animateTabContent('home');
  updateStatsHighlight('home');
}

// ---- NAV SCROLL INDICATOR (MOBILE) ----

// Update the teal scroll-position bar under the mobile nav.
(function () {
  const nav = document.querySelector('nav');
  const bar = document.getElementById('nav-scroll-bar');
  if (!nav || !bar) return;
  nav.addEventListener('scroll', function () {
    const scrollable = nav.scrollWidth - nav.clientWidth;
    const pct = scrollable > 0 ? (nav.scrollLeft / scrollable) * 100 : 0;
    bar.style.width = pct + '%';
  }, { passive: true });
})();

// ---- STATE SUB-NAVIGATION (GRANTS TAB) ----

// Switch between NSW and QLD state panels inside the Grants tab.
function switchState(state, btn) {
  document.querySelectorAll('.state-panel').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.state-subnav-btn').forEach(b => b.classList.remove('active'));
  document.getElementById('state-' + state).classList.add('active');
  btn.classList.add('active');
}

// ---- ACCORDION ----

// Toggle a main card accordion open/closed by its element id.
function toggleCard(id) {
  const card = document.getElementById(id);
  card.classList.toggle('open');
}

// Toggle a sub-accordion (nested inside a card) open/closed.
function toggleSubAcc(id) {
  const el = document.getElementById(id);
  el.classList.toggle('open');
}

// ---- MOBILE SIDEBAR ----

// Toggle the slide-in sidebar drawer on mobile.
function toggleSidebar() {
  document.body.classList.toggle('sidebar-open');
}

// Close the sidebar drawer (called from overlay click or nav selection).
function closeSidebar() {
  document.body.classList.remove('sidebar-open');
}

// ---- HELP BUTTON ----

// Open the decision-tree guide from the Help button.
function openHelpGuide() {
  closeSidebar();
  if (window._dtShow) window._dtShow();
}

// ---- SPLASH SCREEN ----

// Auto-show the splash screen on first load; dismiss on CTA click, then launch DT.
(function () {
  const splash = document.getElementById('splash-screen');
  const cta    = document.getElementById('splash-cta');
  if (!splash || !cta) return;

  // Fade out and then show the decision tree
  cta.addEventListener('click', function () {
    splash.classList.add('splash-hiding');
    splash.addEventListener('transitionend', function onEnd(e) {
      if (e.target !== splash) return;
      splash.removeEventListener('transitionend', onEnd);
      splash.style.display = 'none';
      if (window._dtShow) window._dtShow();
    });
    // Safety fallback in case transitionend doesn't fire
    setTimeout(function () {
      splash.style.display = 'none';
      if (window._dtShow) window._dtShow();
    }, 500);
  });
})();

// ---- DECISION TREE ----

(function () {
  const overlay = document.getElementById('dt-overlay');
  if (!overlay) return;

  const s1     = document.getElementById('dt-s1');
  const s2     = document.getElementById('dt-s2');
  const sRes   = document.getElementById('dt-result');
  const allSteps = [s1, s2, sRes];

  // Result data for each destination tab
  const RESULTS = {
    faq: {
      icon:  '📚',
      badge: 'Knowledge Hub',
      title: 'Start with the Basics',
      desc:  'A complete guide to the home-buying process — from pre-approval to settlement, plus every hidden fee you need to know about.',
      tab:   'faq',
      cta:   'Open Knowledge Hub →'
    },
    rental: {
      icon:  '🏘️',
      badge: 'Rental Yield',
      title: 'Investor Cashflow Analyser',
      desc:  'Calculate gross and net rental yields, annual cashflow, and the exact weekly rent needed to break even on any NSW property.',
      tab:   'rental',
      cta:   'Open Rental Yield Analyser →'
    },
    deposit: {
      icon:  '💰',
      badge: 'Deposit Growth',
      title: 'Understanding Asset Characteristics',
      desc:  'An educational overview of different savings vehicles and their characteristics — from cash deposits to market-based instruments — with tools to model deposit timelines.',
      tab:   'deposit',
      cta:   'Open Deposit Growth →'
    },
    borrow: {
      icon:  '🏦',
      badge: 'Borrowing Power',
      title: 'Borrowing Capacity Calculators',
      desc:  'Links to the borrowing capacity calculators published by Australia\'s Big Four banks. Each calculator is operated by the relevant lender and estimates capacity based on the inputs you provide.',
      tab:   'borrow',
      cta:   'View Borrowing Calculators →'
    },
    grants: {
      icon:  '🎁',
      badge: 'Grants & Schemes',
      title: 'NSW Grants & Stamp Duty Relief',
      desc:  'Find out what government grants you\'re eligible for — FHBAS, the $10,000 New Home Grant, and the federal FHSS scheme.',
      tab:   'grants',
      cta:   'Check Grant Eligibility →'
    },
    calc: {
      icon:  '🧮',
      badge: 'Mortgage Calculator',
      title: 'High-Precision Mortgage Modelling',
      desc:  'Model P&I and Interest-Only repayments with daily interest and see the full impact of an offset account on your loan term.',
      tab:   'calc',
      cta:   'Open Mortgage Calculator →'
    }
  };

  // ── Helpers ──────────────────────────────────

  function showStep(step) {
    allSteps.forEach(s => s.classList.remove('active'));
    step.classList.add('active');
  }

  function hide(callback) {
    overlay.classList.remove('dt-visible');
    let done = false;
    function onDone() {
      if (done) return;
      done = true;
      overlay.style.display = 'none';
      if (callback) callback();
    }
    overlay.addEventListener('transitionend', function onEnd(e) {
      if (e.target !== overlay) return;
      overlay.removeEventListener('transitionend', onEnd);
      onDone();
    });
    setTimeout(onDone, 400); // safety fallback
  }

  function goToTab(tabKey) {
    const btn = Array.from(document.querySelectorAll('.tab-btn'))
      .find(b => (b.getAttribute('onclick') || '').includes("'" + tabKey + "'"));
    if (btn) switchTab(tabKey, btn);
  }

  // ── Public API (called from HTML onclick + splash IIFE) ──

  window.dtGoStep2 = () => showStep(s2);
  window.dtBack    = () => showStep(s1);

  window.dtResult  = function (tabKey) {
    const r = RESULTS[tabKey];
    document.getElementById('dt-res-icon').textContent  = r.icon;
    document.getElementById('dt-res-badge').textContent = r.badge;
    document.getElementById('dt-res-title').textContent = r.title;
    document.getElementById('dt-res-desc').textContent  = r.desc;
    const cta = document.getElementById('dt-res-cta');
    cta.textContent = r.cta;
    cta.onclick = () => hide(() => goToTab(r.tab));
    showStep(sRes);
  };

  window.dtSkip = () => hide(null);

  // Called by splash IIFE after its fade-out completes
  window._dtShow = function () {
    showStep(s1);                       // always reset to step 1
    overlay.style.display = 'flex';
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        overlay.classList.add('dt-visible');
      });
    });
  };
})();

// ---- INIT ----

// Track whether the rental tab has been initialised yet.
let rentalInitialised = false;

// Boot the stats panel. (initCalc is called at the end of calculator.js)
initStats();

// Animate the initial home tab on page load.
animateTabContent('home');

// Auto-open the decision tree on every page load.
requestAnimationFrame(() => {
  requestAnimationFrame(() => {
    if (window._dtShow) window._dtShow();
  });
});
