/*
==============================================
  glossary.js — Automatic tooltip glossary.

  Scans text nodes in .tab-panel elements and
  wraps recognised financial/property terms
  in <span class="gt"> with a data-tip
  definition. Shows a floating #glossary-tip
  card on hover/focus/tap.

  Definitions: ≤15 words, plain English, no
  jargon. Factual information only (ASIC safe).
==============================================
*/

(function () {
  'use strict';

  // ── Dictionary ─────────────────────────────────────────────────────────────
  // Sorted longest-first so multi-word phrases match before constituent words.
  // cs: true  → match exact case (acronyms)
  // cs: false → case-insensitive match (regular words)

  const TERMS = [
    // Multi-word phrases ───────────────────────────────────────────────────────
    { t: 'serviceability buffer', d: 'An extra 3% added to the test rate to check you can handle rate rises.',           cs: false },
    { t: 'offset account',        d: 'A savings account linked to your mortgage that reduces the interest charged.',      cs: false },
    { t: 'salary sacrifice',      d: 'Directing pre-tax pay into super, reducing the income you\'re taxed on.',           cs: false },
    { t: 'transfer duty',         d: 'NSW name for stamp duty — a government tax charged on property transfers.',         cs: false },
    { t: 'stamp duty',            d: 'A state government tax paid when purchasing a property.',                           cs: false },
    { t: 'capital gains',         d: 'Profit made when you sell an asset for more than you paid for it.',                 cs: false },
    { t: 'cash flow',             d: 'Money coming in minus money going out over a set period.',                          cs: false },
    { t: 'cash rate',             d: 'The RBA\'s official rate that directly influences all home loan interest rates.',   cs: false },
    { t: 'fixed rate',            d: 'An interest rate locked in for a set period, unaffected by RBA changes.',          cs: false },
    { t: 'variable rate',         d: 'An interest rate that moves when the RBA adjusts the cash rate.',                  cs: false },
    { t: 'net surplus',           d: 'The amount left after all loan costs and living expenses are accounted for.',       cs: false },
    { t: 'gross income',          d: 'Your total income before any tax or deductions are applied.',                       cs: false },
    { t: 'marginal rate',         d: 'The tax rate applied to your highest income band.',                                 cs: false },
    { t: 'interest-only',         d: 'Repayments that cover only interest — your loan balance stays unchanged.',         cs: false },
    { t: 'pre-approval',          d: 'A conditional estimate from a lender of how much you may be able to borrow.',      cs: false },

    // Acronyms (case-sensitive) ───────────────────────────────────────────────
    { t: 'HECS-HELP',  d: 'Government student loan — repaid via your tax return once income passes a threshold.',        cs: true  },
    { t: 'FHBAS',      d: 'First Home Buyers Assistance Scheme — NSW stamp duty exemption for first home buyers.',       cs: true  },
    { t: 'FHSSS',      d: 'First Home Super Saver Scheme — save for a deposit inside your superannuation fund.',        cs: true  },
    { t: 'FHSS',       d: 'First Home Super Saver Scheme — save for a deposit inside your superannuation fund.',        cs: true  },
    { t: 'APRA',       d: 'Australian Prudential Regulation Authority — the body that sets lending rules for banks.',    cs: true  },
    { t: 'HYSA',       d: 'High-Yield Savings Account — a savings account offering rates above standard accounts.',     cs: true  },
    { t: 'HISA',       d: 'High-Interest Savings Account — a savings account offering rates above standard accounts.',  cs: true  },
    { t: 'HEM',        d: 'Household Expenditure Measure — a minimum living cost benchmark used by all lenders.',       cs: true  },
    { t: 'ETFs',       d: 'Exchange-Traded Funds — baskets of assets traded on a stock exchange like shares.',          cs: true  },
    { t: 'ETF',        d: 'An Exchange-Traded Fund — a basket of assets traded on a stock exchange like a single share.', cs: true },
    { t: 'LMI',        d: 'Lenders Mortgage Insurance — an extra fee banks charge when your deposit is under 20%.',     cs: true  },
    { t: 'LVR',        d: 'Loan-to-Value Ratio — your loan amount as a percentage of the property\'s value.',           cs: true  },
    { t: 'MER',        d: 'Management Expense Ratio — the annual fee charged by a fund, shown as a percentage.',        cs: true  },
    { t: 'ADIs',       d: 'Authorised deposit-taking institutions — banks or credit unions regulated by APRA.',         cs: true  },
    { t: 'ADI',        d: 'An authorised deposit-taking institution — a bank or credit union regulated by APRA.',       cs: true  },
    { t: 'P&I',        d: 'Principal & Interest — repayments that reduce your debt and cover the interest charged.',    cs: true  },
    { t: 'RBA',        d: 'Reserve Bank of Australia — sets the official cash rate that influences loan rates.',        cs: true  },
    { t: 'ATO',        d: 'Australian Taxation Office — Australia\'s federal tax authority.',                            cs: true  },
    { t: 'ASX',        d: 'Australian Securities Exchange — where Australian company shares are bought and sold.',      cs: true  },

    // Single words (case-insensitive) ─────────────────────────────────────────
    { t: 'serviceability', d: 'A lender\'s assessment of whether you can comfortably afford the loan repayments.',      cs: false },
    { t: 'conveyancing',   d: 'The legal process of transferring property ownership from seller to buyer.',              cs: false },
    { t: 'settlement',     d: 'The day your property purchase is completed and ownership officially transfers.',         cs: false },
    { t: 'refinancing',    d: 'Switching your existing home loan to a different lender or loan product.',               cs: false },
    { t: 'guarantor',      d: 'A person who uses their own property as security to help you obtain a loan.',            cs: false },
    { t: 'principal',      d: 'The original amount borrowed from the lender, not including any interest.',              cs: false },
    { t: 'compounding',    d: 'Earning returns on your previous returns — savings grow at an accelerating rate.',        cs: false },
    { t: 'dividends',      d: 'Regular cash payments that companies distribute to shareholders from their profits.',     cs: false },
    { t: 'volatility',     d: 'How much an investment\'s value rises and falls over time.',                             cs: false },
    { t: 'inflation',      d: 'A general rise in prices over time that reduces the purchasing power of money.',         cs: false },
    { t: 'liquidity',      d: 'How quickly an asset can be converted into cash without losing value.',                  cs: false },
    { t: 'equity',         d: 'The portion of your property\'s value you own outright, free of any debt.',             cs: false },
    { t: 'redraw',         d: 'Accessing extra repayments you\'ve already made on your home loan.',                     cs: false },
    { t: 'drawdown',       d: 'Withdrawing funds from a loan, account, or investment.',                                 cs: false },
    { t: 'surplus',        d: 'The amount remaining after all financial commitments and expenses are covered.',         cs: false },
  ];

  // ── DOM helpers ─────────────────────────────────────────────────────────────
  const SKIP_TAGS = new Set([
    'SCRIPT', 'STYLE', 'A', 'BUTTON', 'INPUT', 'TEXTAREA',
    'SELECT', 'LABEL', 'CODE', 'PRE', 'H1', 'H2', 'H3', 'SVG', 'IMG',
  ]);

  function getTextNodes(root) {
    const nodes = [];
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    let n;
    while ((n = walker.nextNode())) {
      if (!n.textContent.trim()) continue;
      let skip = false;
      let el = n.parentElement;
      while (el && el !== root) {
        if (SKIP_TAGS.has(el.tagName) || el.classList.contains('gt')) {
          skip = true; break;
        }
        el = el.parentElement;
      }
      if (!skip) nodes.push(n);
    }
    return nodes;
  }

  function buildPattern(term, caseSensitive) {
    const esc = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const wb  = (ch) => /\w/.test(ch);
    const pre = wb(term[0])            ? '\\b' : '';
    const suf = wb(term[term.length-1]) ? '\\b' : '';
    const flags = caseSensitive ? 'g' : 'gi';
    try { return new RegExp(pre + esc + suf, flags); }
    catch { return new RegExp(esc, flags); }
  }

  // Pre-compile all patterns once
  const COMPILED = TERMS.map(({ t, d, cs }) => ({
    pattern: buildPattern(t, cs), term: t, def: d,
  }));

  function processTextNode(textNode, usedTerms) {
    const text = textNode.textContent;
    const matches = [];

    for (const { pattern, term, def } of COMPILED) {
      if (usedTerms.has(term.toLowerCase())) continue;
      pattern.lastIndex = 0;
      const m = pattern.exec(text);
      if (m) matches.push({ index: m.index, length: m[0].length, matched: m[0], term, def });
    }

    if (!matches.length) return;

    // Sort by position; remove overlaps
    matches.sort((a, b) => a.index - b.index);
    const clean = [];
    let end = 0;
    for (const m of matches) {
      if (m.index >= end) { clean.push(m); end = m.index + m.length; }
    }
    if (!clean.length) return;

    const frag = document.createDocumentFragment();
    let pos = 0;
    for (const m of clean) {
      if (m.index > pos) frag.appendChild(document.createTextNode(text.slice(pos, m.index)));
      const span = document.createElement('span');
      span.className  = 'gt';
      span.setAttribute('data-tip',  m.def);
      span.setAttribute('tabindex',  '0');
      span.setAttribute('role',      'button');
      span.setAttribute('aria-label', m.matched + ': ' + m.def);
      span.textContent = m.matched;
      frag.appendChild(span);
      usedTerms.add(m.term.toLowerCase());
      pos = m.index + m.length;
    }
    if (pos < text.length) frag.appendChild(document.createTextNode(text.slice(pos)));
    textNode.parentNode.replaceChild(frag, textNode);
  }

  function wrapTerms(root) {
    // Guard: never re-process a node that is itself a glossary span — this
    // would cause the MutationObserver to loop infinitely as each new .gt
    // span triggers another wrapTerms call, which adds another .gt span, etc.
    if (!root || root.classList.contains('gt')) return;
    const usedTerms = new Set();
    getTextNodes(root).forEach(n => processTextNode(n, usedTerms));
  }

  // ── Tooltip element ─────────────────────────────────────────────────────────
  const TIP = document.createElement('div');
  TIP.id = 'glossary-tip';
  TIP.setAttribute('role', 'tooltip');
  document.body.appendChild(TIP);

  let _active = null;

  function showTip(el) {
    const def  = el.getAttribute('data-tip');
    const term = el.textContent;
    TIP.innerHTML = `<span class="gt-tip-term">${term}</span>${def}`;

    // Measure off-screen
    TIP.style.visibility = 'hidden';
    TIP.classList.add('gt-visible');

    requestAnimationFrame(() => {
      const r     = el.getBoundingClientRect();
      const tipW  = TIP.offsetWidth  || 248;
      const tipH  = TIP.offsetHeight || 60;
      const vw    = window.innerWidth;
      const vh    = window.innerHeight;

      // Horizontal: centre on term, clamp to viewport
      let left = r.left + r.width / 2 - tipW / 2;
      left = Math.max(8, Math.min(left, vw - tipW - 8));

      // Vertical: above by default, below if too close to top
      const showBelow = r.top < tipH + 24;
      TIP.classList.toggle('gt-below', showBelow);

      const top = showBelow
        ? r.bottom + 10
        : r.top   - tipH - 10;

      // Arrow offset (relative to tooltip left)
      const arrowLeft = (r.left + r.width / 2) - left;
      TIP.style.setProperty('--gt-arrow-left', Math.max(16, Math.min(arrowLeft, tipW - 16)) + 'px');

      TIP.style.left = left + 'px';
      TIP.style.top  = Math.max(8, Math.min(top, vh - tipH - 8)) + 'px';
      TIP.style.visibility = '';
      _active = el;
    });
  }

  function hideTip() {
    TIP.classList.remove('gt-visible');
    _active = null;
  }

  // ── Event delegation ────────────────────────────────────────────────────────
  document.addEventListener('mouseover', e => {
    if (e.target.classList.contains('gt')) showTip(e.target);
  });
  document.addEventListener('mouseout', e => {
    if (e.target.classList.contains('gt')) hideTip();
  });
  document.addEventListener('focusin', e => {
    if (e.target.classList.contains('gt')) showTip(e.target);
  });
  document.addEventListener('focusout', e => {
    if (e.target.classList.contains('gt')) hideTip();
  });
  // Tap-to-toggle on mobile
  document.addEventListener('click', e => {
    if (e.target.classList.contains('gt')) {
      e.stopPropagation();
      _active === e.target ? hideTip() : showTip(e.target);
      return;
    }
    if (_active) hideTip();
  });

  // ── MutationObserver — catch dynamically injected simulator content ─────────
  // Scoped to #sim-edu-col only (the only element that receives innerHTML
  // injection at runtime). Watching all of `main` caused an infinite loop:
  // wrapTerms adds .gt spans → observer fires on those spans → wrapTerms
  // called again on the .gt span → wraps the term again → fires again → ∞.
  const observer = new MutationObserver(mutations => {
    mutations.forEach(({ addedNodes }) => {
      addedNodes.forEach(node => {
        // Skip text nodes and .gt spans to prevent re-wrapping loops
        if (node.nodeType !== 1) return;
        if (node.classList.contains('gt')) return;
        wrapTerms(node);
      });
    });
  });

  // ── Init ────────────────────────────────────────────────────────────────────
  function init() {
    document.querySelectorAll('.tab-panel').forEach(panel => wrapTerms(panel));

    // Also process the stats panel
    const stats = document.getElementById('stats-panel');
    if (stats) wrapTerms(stats);

    // Watch only the simulator content column — the sole target for runtime
    // HTML injection (openDepositSim sets its innerHTML). Narrowing the scope
    // avoids observing the entire main element and keeps the loop fix tight.
    const simCol = document.getElementById('sim-edu-col');
    if (simCol) observer.observe(simCol, { childList: true, subtree: true });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
