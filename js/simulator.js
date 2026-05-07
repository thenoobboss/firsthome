/*
==============================================
  simulator.js — Deposit Growth Savings
  Simulator: state, content, calculations,
  and dynamic output rendering.

  Math engines:
  ┌─ Forward ("How long will it take?"):
  │    Daily accrual on the closing balance,
  │    compounded (credited) once per month.
  │    Uses ACTUAL calendar month lengths so
  │    31-day months earn more than 28-day months
  │    and leap years are handled correctly.
  │
  │    Each month:
  │      1. deposit added (1st of month)
  │      2. interest = balance × (rate/365) × days
  │      3. balance += interest at month-end
  │
  └─ Reverse ("How much will I need to save?"):
       Pure monthly compounding — closed-form
       annuity-due formula. Deposit at start.
==============================================
*/

// ── Icons ─────────────────────────────────────────────────────────────────────
const _SI  = `<svg width="15" height="15" viewBox="0 0 20 20" fill="none"><circle cx="10" cy="10" r="9" stroke="currentColor" stroke-width="1.8"/><path d="M10 6v4m0 3h.01" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>`;
const _SW  = `<svg width="15" height="15" viewBox="0 0 20 20" fill="none"><path d="M9.13 3.5l-6.5 11A1 1 0 0 0 3.5 16h13a1 1 0 0 0 .87-1.5l-6.5-11a1 1 0 0 0-1.74 0Z" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/><path d="M10 8v3m0 2.5h.01" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/></svg>`;
const _SC  = `<svg width="15" height="15" viewBox="0 0 20 20" fill="none"><circle cx="10" cy="10" r="9" stroke="currentColor" stroke-width="1.8"/><path d="M6.5 10l2.5 2.5 4-4" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>`;

// ── State ─────────────────────────────────────────────────────────────────────
let _simType = 'low';
let _simMode = 'forward';   // 'forward' | 'reverse'
let _simHz   = 3;           // horizon years for the "In X years" secondary card

// ── Config per path ───────────────────────────────────────────────────────────
const SIM_CFG = {
  low:  { rate: 5,  badgeClass: 'sim-badge-low',  badge: 'Low Risk — Sleep Easy'       },
  med:  { rate: 8,  badgeClass: 'sim-badge-med',  badge: 'Medium Risk — Slow & Steady' },
  high: { rate: 15, badgeClass: 'sim-badge-high', badge: 'High Risk — Wildcard'        },
};

// ── Educational content per path ──────────────────────────────────────────────
const SIM_EDU = {

  low: `
    <h2 class="sim-edu-title">How the Sleep Easy Path Works</h2>

    <div class="sim-edu-section">
      <div class="sim-edu-section-title">💰 High-Interest Savings Account (HISA)</div>
      <p>A HISA pays significantly more than a standard everyday account — typically <strong>4–5.5% p.a.</strong> at a big bank or online lender. The catch? Some accounts require a minimum monthly deposit or restrict withdrawals to earn the bonus rate, so read the fine print.</p>
      <p>The Australian Government guarantees deposits up to <strong>$250,000 per person, per institution</strong> under the Financial Claims Scheme. Even if the bank collapses, your money is protected.</p>
      <p class="sim-edu-fine">Where to compare: RateCity, Canstar, or Finder. Look for no monthly fees and a consistently high <em>base</em> rate — not just a teaser rate that expires.</p>
      <div class="sim-edu-note sim-edu-note-green">
        ${_SC}
        <span><strong>The simulator is pre-filled at 5% p.a.</strong> — a reasonable HISA estimate. Adjust the slider to match your actual account's rate.</span>
      </div>
    </div>

    <div class="sim-edu-section">
      <div class="sim-edu-section-title">🏛️ First Home Super Saver Scheme (FHSSS)</div>
      <p>The FHSSS lets you save inside your super fund, where voluntary contributions are taxed at just <strong>15%</strong> — well below most people's income tax rate. You can contribute up to <strong>$15,000/year</strong> and withdraw up to <strong>$50,000 total</strong> when you're ready to buy.</p>
      <p>The tax saving alone can add thousands to your effective deposit — for example, a person on a 32.5% marginal rate saves <strong>~$1,750 in tax</strong> for every $10,000 they contribute via salary sacrifice.</p>
      <div class="sim-edu-note sim-edu-note-amber">
        ${_SW}
        <span><strong>Key rule:</strong> You must apply for an FHSS determination from the ATO <em>before</em> signing a purchase contract. Allow up to 25 business days for release — build this into your buying timeline.</span>
      </div>
    </div>

    <div class="sim-edu-section">
      <div class="sim-edu-section-title">✅ Pro Tip — Automate Everything</div>
      <p>The single most effective savings habit is moving money to your HISA on the same day your salary hits your account — before you can spend it. Set it up once, then forget it exists.</p>
      <div class="sim-edu-note sim-edu-note-green">
        ${_SC}
        <span>Even <strong>$200/week</strong> automated adds up to <strong>$10,400/year</strong> before interest. Use the simulator to see exactly how that compounds over your timeline.</span>
      </div>
    </div>`,

  med: `
    <h2 class="sim-edu-title">How the Slow &amp; Steady Path Works</h2>

    <div class="sim-edu-section">
      <div class="sim-edu-section-title">📊 Exchange-Traded Funds (ETFs)</div>
      <p>An ETF lets you buy a tiny slice of hundreds of companies in a single transaction. An <strong>ASX 200 ETF</strong> gives you exposure to Australia's 200 largest companies. An <strong>S&amp;P 500 ETF</strong> does the same for the US market.</p>
      <p>Instead of betting on one company, you're betting on the whole economy growing over time. Historically, broad market indexes have delivered <strong>~7–10% annually</strong> over long periods — well above savings account rates.</p>
      <p class="sim-edu-fine">Popular Aussie ETFs: VAS, IOZ (ASX 200) · IVV, NDQ, BGBL (international). Management fees (MER) are typically 0.03–0.20% p.a.</p>
      <div class="sim-edu-note sim-edu-note-amber">
        ${_SW}
        <span><strong>The 8% rate in the simulator is a long-run historical average — it is not guaranteed.</strong> Real returns vary year to year. Some years are +25%, some are −20%.</span>
      </div>
    </div>

    <div class="sim-edu-section">
      <div class="sim-edu-section-title">📈 The Power of Compounding</div>
      <p>When your investments earn returns, those returns start earning returns too. Reinvesting dividends (the cash companies pay shareholders) supercharges this effect over time.</p>
      <p><strong>Example:</strong> $20,000 invested at 8% p.a. with dividends reinvested grows to roughly <strong>$29,400 after 5 years</strong> — without adding a single extra dollar. Start earlier and the numbers get significantly bigger.</p>
    </div>

    <div class="sim-edu-section">
      <div class="sim-edu-section-title">⏱️ Timeline Is Everything</div>
      <p>ETFs are not suitable for short-term saving. If the market drops 25% the month before you want to buy, you may have to sell at a loss or wait years for a recovery.</p>
      <div class="sim-edu-note sim-edu-note-amber">
        ${_SW}
        <span><strong>Only invest money you won't need for at least 3 years.</strong> If you're buying in the next 12 months, a HISA is safer. ETFs shine over a 3–7 year horizon.</span>
      </div>
    </div>`,

  high: `
    <h2 class="sim-edu-title">How the Wildcard Path Works</h2>

    <div class="sim-edu-section">
      <div class="sim-edu-section-title">🎯 Individual Stocks</div>
      <p>Buying shares in a single company (one tech stock, one mining play) is a concentrated bet. If the company performs, gains can far outpace anything an index fund delivers. If it doesn't, there is no diversification to cushion the fall.</p>
      <p>Individual stocks can drop <strong>50–80% or more</strong> in a short period without warning — and some never recover. The company you pick might be the next big thing, or it might be next year's cautionary tale.</p>
    </div>

    <div class="sim-edu-section">
      <div class="sim-edu-section-title">🪙 Crypto-Assets</div>
      <p>Cryptocurrencies (Bitcoin, Ethereum, etc.) are highly volatile digital assets with no government guarantee, no earnings to anchor valuation, and price swings of <strong>±20% in a single week</strong> that are not unusual.</p>
      <p>The appeal is real — early holders made life-changing returns. But for every winner, many more people lost significant money, often right when they needed it most.</p>
    </div>

    <div class="sim-edu-section">
      <div class="sim-edu-section-title">⚠️ The Non-Negotiable Rules</div>
      <div class="sim-edu-note sim-edu-note-red">
        ${_SW}
        <span>
          <strong>You are trading security for speed.</strong> This money could disappear overnight — a stock can go to zero, an exchange can collapse.<br><br>
          If you still want to use this path: <strong>(1)</strong> limit it to a small portion of your total savings — no more than 10–15%. <strong>(2)</strong> Never put your full deposit here. <strong>(3)</strong> Only use money you're genuinely prepared to lose entirely. The 15% rate in the simulator is optimistic — treat it as a best-case scenario, not a plan.
        </span>
      </div>
    </div>`,
};

// ═══════════════════════════════════════════════════════════════════════════════
// MATH ENGINE
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Returns the actual number of days in a calendar month.
 * Handles leap years automatically.
 * @param {number} year  - full year, e.g. 2028
 * @param {number} month - 0-indexed JS month (0 = Jan, 11 = Dec)
 */
function _getDaysInMonth(year, month) {
  return new Date(year, month + 1, 0).getDate();
}

/**
 * FORWARD ENGINE — future value with daily accrual, monthly compounding.
 *
 * For each calendar month:
 *   1. Monthly deposit added on the 1st (before interest).
 *   2. Interest accrued daily: balance × (annualRate / 365) per day.
 *      The balance used for accrual is FIXED within the month (no
 *      intra-month compounding) — so total monthly interest =
 *      balance × (annualRate / 365) × actualDaysInMonth.
 *   3. Accumulated interest credited to balance at month-end.
 *
 * Using actual calendar month lengths means 31-day months earn slightly
 * more than 30-day months, and leap years contribute an extra day.
 *
 * @returns {number} final balance after nMonths
 */
function _fvFwdDaily(pv, monthlyDeposit, annualRate, nMonths) {
  const start = new Date();
  let year  = start.getFullYear();
  let month = start.getMonth(); // 0-indexed

  let balance = pv;

  for (let m = 0; m < nMonths; m++) {
    // 1. Deposit at start of month
    balance += monthlyDeposit;

    // 2. Accrue interest daily on the fixed balance, credit at month-end
    const days = _getDaysInMonth(year, month);
    balance   += balance * (annualRate / 365) * days;

    // Advance calendar
    month++;
    if (month > 11) { month = 0; year++; }
  }

  return balance;
}

/**
 * FORWARD GOAL-SEEK — simulate month-by-month until balance reaches target.
 *
 * Explicitly tracks totalPrincipal and totalInterest as separate running totals
 * so the final interest figure reflects actual simulated growth, not the
 * difference from the goal (which may be overshot).
 *
 * Each month:
 *   1. Deposit added at start (Pay Yourself First). totalPrincipal updated.
 *   2. Daily interest accrued: Σ balance × (rate/365) for each actual day.
 *      Balance is fixed within the month — no intra-month compounding.
 *   3. Accumulated interest credited to balance and totalInterest at month-end.
 *
 * Returns { months, totalPrincipal, totalInterest, finalBalance }
 * or      { months: Infinity, ... } if goal not reachable within 50 years.
 */
function _simulateForward(pv, target, monthlyDeposit, annualRate) {
  if (pv >= target) {
    return { months: 0, totalPrincipal: pv, totalInterest: 0, finalBalance: pv };
  }
  if (monthlyDeposit <= 0 && annualRate <= 0) {
    return { months: Infinity, totalPrincipal: pv, totalInterest: 0, finalBalance: pv };
  }

  const start = new Date();
  let year  = start.getFullYear();
  let month = start.getMonth();

  let balance        = pv;
  let totalPrincipal = pv;
  let totalInterest  = 0;

  const MAX_MONTHS = 600; // 50-year cap

  for (let m = 1; m <= MAX_MONTHS; m++) {
    // ── Start of month: Pay Yourself First ──
    balance        += monthlyDeposit;
    totalPrincipal += monthlyDeposit;

    // ── Daily accrual (balance fixed within month), credited at month-end ──
    const days = _getDaysInMonth(year, month);
    let monthInterest = 0;
    for (let d = 0; d < days; d++) {
      monthInterest += balance * (annualRate / 365);
    }
    balance       += monthInterest;
    totalInterest += monthInterest;

    if (balance >= target) {
      return { months: m, totalPrincipal, totalInterest, finalBalance: balance };
    }

    month++;
    if (month > 11) { month = 0; year++; }
  }

  return { months: Infinity, totalPrincipal, totalInterest: 0, finalBalance: balance };
}

/**
 * REVERSE ENGINE — required monthly deposit using annuity-due closed form.
 * Pure monthly compounding: both accrual and crediting are monthly.
 *
 * FV = PV·(1+r)^n + PMT·(1+r)·[(1+r)^n − 1] / r
 * ⟹ PMT = [FV − PV·(1+r)^n] · r / [(1+r)·((1+r)^n − 1)]
 *
 * where r = annualRate / 12, n = totalMonths.
 */
function _requiredMonthlyPure(pv, target, totalMonths, annualRate) {
  if (pv >= target)     return 0;
  if (totalMonths <= 0) return Infinity;

  const r = annualRate / 12;

  if (r === 0) return (target - pv) / totalMonths;

  const growth  = Math.pow(1 + r, totalMonths);
  const pvGrown = pv * growth;

  if (pvGrown >= target) return 0; // interest alone reaches target

  const num = (target - pvGrown) * r;
  const den = (1 + r) * (growth - 1);
  return den <= 0 ? Infinity : num / den;
}

// ── Formatting helpers ────────────────────────────────────────────────────────

/** Format as $X,XXX (nearest dollar). */
function _fmt(n) {
  if (!isFinite(n) || isNaN(n) || n < 0) return '—';
  return '$' + Math.round(n).toLocaleString('en-AU');
}

/** Format month count as "X yrs Y mo". */
function _fmtDurMonths(months) {
  if (!isFinite(months) || months < 0) return null;
  if (months === 0) return "You're already there!";
  const y = Math.floor(months / 12);
  const m = months % 12;
  if (y === 0) return `${m} month${m !== 1 ? 's' : ''}`;
  if (m === 0) return `${y} yr${y !== 1 ? 's' : ''}`;
  return `${y} yr${y !== 1 ? 's' : ''} ${m} mo`;
}

/** Format month count as a short buy-date: "Jun 2030". */
function _fmtBuyDateMonths(months) {
  const d = new Date();
  d.setMonth(d.getMonth() + Math.ceil(months));
  return d.toLocaleDateString('en-AU', { month: 'short', year: 'numeric' });
}

/** Convert yrs + mos inputs into a total month count. */
function _timelineToMonths(yrs, mos) {
  return yrs * 12 + mos;
}

// ── Open / close ──────────────────────────────────────────────────────────────

function openDepositSim(type) {
  _simType = type;
  _simMode = 'forward';
  _simHz   = 3;

  document.getElementById('sim-edu-col').innerHTML = SIM_EDU[type];

  const cfg   = SIM_CFG[type];
  const badge = document.getElementById('sim-path-badge');
  badge.className   = 'sim-path-badge ' + cfg.badgeClass;
  badge.textContent = cfg.badge;

  document.getElementById('sim-rate').value       = cfg.rate;
  document.getElementById('sim-rate-input').value = cfg.rate.toFixed(1);

  document.getElementById('smbtn-forward').classList.add('active');
  document.getElementById('smbtn-reverse').classList.remove('active');
  document.getElementById('sim-fwd-inputs').style.display = '';
  document.getElementById('sim-rev-inputs').style.display = 'none';

  const calcSection = document.getElementById('sim-calc-section');
  calcSection.style.display = type === 'low' ? '' : 'none';

  document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
  document.getElementById('tab-deposit-sim').classList.add('active');
  window.scrollTo(0, 0);

  if (type === 'low') updateSim();
}

function closeDepositSim() {
  document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
  document.getElementById('tab-deposit').classList.add('active');
  window.scrollTo(0, 0);
}

// ── Input event handlers ──────────────────────────────────────────────────────

function setSimMode(mode) {
  _simMode = mode;
  document.getElementById('smbtn-forward').classList.toggle('active', mode === 'forward');
  document.getElementById('smbtn-reverse').classList.toggle('active', mode === 'reverse');
  document.getElementById('sim-fwd-inputs').style.display = mode === 'forward' ? '' : 'none';
  document.getElementById('sim-rev-inputs').style.display = mode === 'reverse' ? '' : 'none';
  updateSim();
}

/** Slider moved → sync text input → recalculate. */
function updateSimRate() {
  const v   = parseFloat(document.getElementById('sim-rate').value) || 0;
  const inp = document.getElementById('sim-rate-input');
  if (inp) inp.value = v % 1 === 0 ? String(v) : v.toFixed(1);
  updateSim();
}

/** Text input changed → clamp [0, 8] → sync slider → recalculate. */
function updateSimRateFromInput() {
  const raw = parseFloat(document.getElementById('sim-rate-input').value);
  if (isNaN(raw)) return;
  const v = Math.min(8, Math.max(0, raw));
  document.getElementById('sim-rate').value = v;
  updateSim();
}

/**
 * Horizon slider — "In X years you'll have".
 * Uses the same daily-accrual, monthly-compounding forward engine.
 */
function updateHorizon(years) {
  _simHz = parseInt(years);
  const pv         = parseFloat(document.getElementById('sim-start').value)  || 0;
  const contrib    = parseFloat(document.getElementById('sim-contrib').value) || 0;
  const annualRate = (parseFloat(document.getElementById('sim-rate').value)   || 0) / 100;
  const fv         = _fvFwdDaily(pv, contrib, annualRate, _simHz * 12);

  const amtEl = document.getElementById('sim-hz-amount');
  const lblEl = document.getElementById('sim-hz-year-lbl');
  if (amtEl) amtEl.textContent = _fmt(fv);
  if (lblEl) lblEl.textContent = years;
}

// ── Main calculation entry point ──────────────────────────────────────────────

function updateSim() {
  const pv         = parseFloat(document.getElementById('sim-start').value)  || 0;
  const target     = parseFloat(document.getElementById('sim-target').value) || 0;
  const annualRate = (parseFloat(document.getElementById('sim-rate').value)  || 0) / 100;
  const out        = document.getElementById('sim-outputs');

  if (_simMode === 'forward') {
    _renderForward(pv, target, annualRate, out);
  } else {
    _renderReverse(pv, target, annualRate, out);
  }
}

// ── Forward mode ──────────────────────────────────────────────────────────────

function _renderForward(pv, target, annualRate, out) {
  const contrib = parseFloat(document.getElementById('sim-contrib').value) || 0;
  const { months, totalPrincipal, totalInterest, finalBalance } =
    _simulateForward(pv, target, contrib, annualRate);
  const fvHz = _fvFwdDaily(pv, contrib, annualRate, _simHz * 12);

  // ── Special states ──
  if (pv >= target) {
    out.innerHTML = `
      <div class="sim-result-success">🏠 You've already hit your target!<br>
        <span style="font-size:13px;font-weight:400;opacity:.75">Time to go house hunting.</span>
      </div>`;
    return;
  }

  if (!isFinite(months)) {
    out.innerHTML = `
      <div class="sim-result-impossible">At this rate it'll take over 50 years.<br>
        <strong>Try increasing your monthly deposit or interest rate.</strong>
      </div>
      ${_proTipForward(pv, target, contrib, annualRate, months)}`;
    return;
  }

  // ── Principal / interest split ──
  // totalPrincipal = starting balance + all manual deposits (tracked by simulation)
  // totalInterest  = actual interest earned (tracked by simulation, uses finalBalance
  //                  not target — so overshooting the goal is counted correctly)
  const principalPct = Math.min(100, Math.round((totalPrincipal / finalBalance) * 100));
  const interestPct  = 100 - principalPct;

  const dur     = _fmtDurMonths(months);
  const buyDate = _fmtBuyDateMonths(months);

  out.innerHTML = `
    <div class="sim-result-primary">
      <div class="sim-rl">The 'When'</div>
      <div class="sim-rv">${dur}</div>
      <div class="sim-rs">to reach ${_fmt(target)} — around ${buyDate}</div>

      <div class="sim-split">
        <div class="sim-split-bar">
          <div class="sim-split-seg sim-split-seg-principal" style="flex-basis:${principalPct}%"></div>
          <div class="sim-split-seg sim-split-seg-interest"  style="flex-basis:${interestPct}%"></div>
        </div>
        <div class="sim-split-labels">
          <div class="sim-split-item" style="flex-basis:${principalPct}%">
            <div class="sim-split-dot sim-split-dot-principal"></div>
            <div class="sim-split-lbl">You save</div>
            <div class="sim-split-amount">${_fmt(totalPrincipal)}</div>
          </div>
          <div class="sim-split-item" style="flex-basis:${interestPct}%">
            <div class="sim-split-dot sim-split-dot-interest"></div>
            <div class="sim-split-lbl">Interest ✨</div>
            <div class="sim-split-amount">${_fmt(totalInterest)}</div>
          </div>
        </div>
      </div>
    </div>

    <div class="sim-result-secondary">
      <div class="sim-hz-row">
        <div class="sim-hz-label">In <strong><span id="sim-hz-year-lbl">${_simHz}</span> yr${_simHz !== 1 ? 's' : ''}</strong> you'll have</div>
        <div class="sim-hz-amount" id="sim-hz-amount">${_fmt(fvHz)}</div>
      </div>
      <input type="range" class="sim-hz-slider" min="1" max="15" value="${_simHz}"
             oninput="updateHorizon(this.value); this.previousElementSibling.querySelector('span').textContent = this.value; this.previousElementSibling.querySelector('#sim-hz-year-lbl').textContent = this.value;">
      <div class="sim-hz-track"><span>1 yr</span><span>5 yrs</span><span>10 yrs</span><span>15 yrs</span></div>
    </div>

    ${_proTipForward(pv, target, contrib, annualRate, months)}`;
}

// ── Reverse mode ──────────────────────────────────────────────────────────────

function _renderReverse(pv, target, annualRate, out) {
  const buyYrs      = parseInt(document.getElementById('sim-buy-yrs').value) || 0;
  const buyMos      = parseInt(document.getElementById('sim-buy-mos').value) || 0;
  const totalMonths = _timelineToMonths(buyYrs, buyMos);

  if (totalMonths <= 0) {
    out.innerHTML = `<div class="sim-result-impossible">Set a timeline above zero to see what you need to save.</div>`;
    return;
  }
  if (pv >= target) {
    out.innerHTML = `<div class="sim-result-success">🏠 Your starting balance already covers the goal!</div>`;
    return;
  }

  const monthlyNeeded = _requiredMonthlyPure(pv, target, totalMonths, annualRate);

  if (!isFinite(monthlyNeeded) || monthlyNeeded < 0) {
    out.innerHTML = `
      <div class="sim-result-success">📈 Great news! Your starting balance will grow to your target without extra contributions at this rate.</div>`;
    return;
  }

  const weeklyEquiv = monthlyNeeded * 12 / 52;
  const fortEquiv   = monthlyNeeded * 12 / 26;

  const dur     = _fmtDurMonths(totalMonths);
  const buyDate = _fmtBuyDateMonths(totalMonths);
  const projFV  = _fvFwdDaily(pv, monthlyNeeded, annualRate, totalMonths);

  out.innerHTML = `
    <div class="sim-result-primary">
      <div class="sim-rl">Monthly Deposit Needed</div>
      <div class="sim-rv">${_fmt(monthlyNeeded)}<span style="font-size:14px;font-weight:500;opacity:.8"> /mo</span></div>
      <div class="sim-rs">to reach ${_fmt(target)} in ${dur} — by ${buyDate}</div>
    </div>

    <div class="sim-result-secondary">
      <div class="sim-rl">Weekly &amp; fortnightly equivalents</div>
      <div class="sim-equiv-row">
        <div class="sim-equiv-item">
          <div class="sim-equiv-label">Per week</div>
          <div class="sim-equiv-val">${_fmt(weeklyEquiv)}</div>
        </div>
        <div class="sim-equiv-item">
          <div class="sim-equiv-label">Per fortnight</div>
          <div class="sim-equiv-val">${_fmt(fortEquiv)}</div>
        </div>
      </div>
    </div>

    ${_proTipReverse(monthlyNeeded, projFV, target, totalMonths)}`;
}

// ── Pro-tip generators ────────────────────────────────────────────────────────

function _proTipForward(pv, target, contrib, annualRate, months) {
  const boost     = 100;
  const boosted   = _simulateForward(pv, target, contrib + boost, annualRate);
  const savingMos = isFinite(months) && isFinite(boosted.months) ? months - boosted.months : 0;

  if (!isFinite(months)) {
    return `<div class="sim-protip">💡 <strong>Tip:</strong> Increasing your monthly deposit can shave years off your timeline. Use the inputs above to experiment.</div>`;
  }
  if (months <= 6) {
    return `<div class="sim-protip">🏠 <strong>You're almost there!</strong> At this rate you'll hit your target in under 6 months. Make sure your deposit is sitting in a HISA earning interest while you wait.</div>`;
  }
  if (savingMos >= 2) {
    return `<div class="sim-protip">💡 <strong>Quick win:</strong> Add just <strong>$${boost} more per month</strong> and you'd hit your target <strong>${savingMos} month${savingMos !== 1 ? 's' : ''} sooner</strong>. Small bumps to your deposit have a surprisingly large effect.</div>`;
  }
  return `<div class="sim-protip">💡 <strong>Staying consistent is the hardest part.</strong> Set up an automatic monthly transfer on payday — then let compounding do the rest.</div>`;
}

function _proTipReverse(monthlyNeeded, projFV, target, totalMonths) {
  if (monthlyNeeded > 5000) {
    return `<div class="sim-protip">💡 <strong>That's a big ask.</strong> Consider extending your timeline — even 6 extra months can significantly reduce your required monthly deposit.</div>`;
  }
  if (monthlyNeeded < 200) {
    return `<div class="sim-protip">🏠 <strong>Very achievable!</strong> At under $200/month, this is well within reach. Make sure the money is sitting in a HISA earning interest in the meantime.</div>`;
  }
  const buffer = Math.round(projFV - target);
  if (buffer > 0) {
    return `<div class="sim-protip">💡 Hit that monthly deposit and you'll actually end up with <strong>${_fmt(projFV)}</strong> — <strong>${_fmt(buffer)}</strong> more than your target. A nice buffer for stamp duty and moving costs.</div>`;
  }
  return `<div class="sim-protip">💡 <strong>Tip:</strong> If you can increase your starting balance or find a higher interest rate, your required monthly deposit drops. Every dollar saved upfront helps.</div>`;
}
