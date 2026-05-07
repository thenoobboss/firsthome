/*
==============================================
  rental.js — Rental yield analyser logic:
  reads property value (pre-filled from calculator),
  weekly rent, management fee, and itemised expenses
  with frequency selectors. Calculates gross yield,
  net yield, annual cashflow, weekly cashflow, and
  the break-even weekly rent.
==============================================
*/

// ---- INIT ----

// Pre-fill the rental tab with values from the mortgage calculator state,
// then run the first calculation.
function initRental() {
  // Pre-fill property value from calculator loan amount
  const propVal = state.loan;
  document.getElementById('ry-prop-value').value = propVal;

  // Show pre-fill note if calculator has been used
  if (propVal) {
    document.getElementById('ry-prefill-note').style.display = 'flex';
  }

  updateRental();
}

// ---- EXPENSE HELPERS ----

// Read an expense field and annualise it based on its frequency selector.
// Returns { annual, hint } where hint is the display string for the hint row.
function readExpense(id) {
  const val  = parseFloat(document.getElementById(id).value) || 0;
  const mult = parseInt(document.getElementById(id + '-freq').value, 10);
  const annual = val * mult;
  const hint = (mult !== 1 && val > 0) ? '= ' + fmt.format(Math.round(annual)) + '/yr' : '';
  return { annual, hint };
}

// ---- INPUT COLLECTION ----

// Read all rental input fields and annualise expense values.
// Updates the hint labels as a side-effect.
function getRentalInputs() {
  const propValue  = parseFloat(document.getElementById('ry-prop-value').value)  || 0;
  const weeklyRent = parseFloat(document.getElementById('ry-weekly-rent').value) || 0;
  const mgmtPct    = parseFloat(document.getElementById('ry-mgmt-pct').value)    || 0;

  const councilE   = readExpense('ry-council');
  const waterE     = readExpense('ry-water');
  const strataE    = readExpense('ry-strata');
  const insuranceE = readExpense('ry-insurance');

  // Update hint labels
  document.getElementById('ry-council-hint').textContent   = councilE.hint;
  document.getElementById('ry-water-hint').textContent     = waterE.hint;
  document.getElementById('ry-strata-hint').textContent    = strataE.hint;
  document.getElementById('ry-insurance-hint').textContent = insuranceE.hint;

  return {
    propValue, weeklyRent, mgmtPct,
    council:   councilE.annual,
    water:     waterE.annual,
    strata:    strataE.annual,
    insurance: insuranceE.annual,
  };
}

// ---- CALCULATION ENGINE ----

// Recalculate all rental yield metrics and update the DOM.
// Pulls the base monthly mortgage repayment from the calculator's state.
function updateRental() {
  const { propValue, weeklyRent, mgmtPct,
          council, water, strata, insurance } = getRentalInputs();

  // ── Income ────────────────────────────────────────────────────────────────
  const annIncome = weeklyRent * 52;

  // ── Expenses ──────────────────────────────────────────────────────────────
  const mgmtFee  = annIncome * (mgmtPct / 100);
  const totalExp = council + water + strata + insurance + mgmtFee;

  // ── Mortgage (pull base monthly from calculator, annualise) ───────────────
  const baseMonthly = calcBaseMonthly(state.loan, state.rate, state.term * 12);
  const annMortgage = baseMonthly * 12;

  // Update read-only mortgage display field
  document.getElementById('ry-mortgage-display').value = Math.round(baseMonthly);

  // ── Yields ────────────────────────────────────────────────────────────────
  // Gross yield: before any expenses
  const grossYield = propValue > 0 ? (annIncome / propValue) * 100 : 0;
  // Net yield: after expenses (mortgage NOT included in yield)
  const netYield   = propValue > 0 ? ((annIncome - totalExp) / propValue) * 100 : 0;

  // ── Cashflow ──────────────────────────────────────────────────────────────
  // Mortgage IS included in cashflow
  const netAnnCf = annIncome - totalExp - annMortgage;
  const weekCf   = netAnnCf / 52;

  // ── Break-even rent ───────────────────────────────────────────────────────
  // Solve: weeklyRent × 52 × (1 − mgmtPct/100) − fixedExp − annMortgage = 0
  const fixedExp    = council + water + strata + insurance;
  const mgmtFactor  = 1 - mgmtPct / 100;
  const breakEvenWeekly = (52 * mgmtFactor) > 0
    ? (annMortgage + fixedExp) / (52 * mgmtFactor)
    : 0;

  // ── Update DOM ────────────────────────────────────────────────────────────

  // Gross yield colour
  const grossEl = document.getElementById('ry-gross-yield');
  grossEl.textContent = grossYield.toFixed(2) + '%';
  grossEl.className = 'ry-metric-value ' + (grossYield >= 4 ? 'green' : grossYield >= 2 ? 'amber' : 'red');

  document.getElementById('ry-net-yield').textContent = netYield.toFixed(2) + '%';

  // Weekly cashflow summary metric
  const wkCfEl  = document.getElementById('ry-weekly-cf');
  const cfBadge = document.getElementById('ry-cf-badge');
  wkCfEl.textContent = fmtDec.format(Math.abs(weekCf)) + '/wk';
  wkCfEl.className   = 'ry-metric-value ' + (weekCf >= 0 ? 'green' : 'red');
  if (weekCf >= 0) {
    cfBadge.textContent = 'Cash flow positive';
    cfBadge.className   = 'ry-badge positive';
  } else {
    cfBadge.textContent = 'Top-up required: ' + fmtDec.format(Math.abs(weekCf)) + '/wk';
    cfBadge.className   = 'ry-badge negative';
  }

  document.getElementById('ry-breakeven').textContent = fmt.format(Math.ceil(breakEvenWeekly)) + '/wk';

  // Income & cashflow panel
  document.getElementById('ry-ann-income').textContent   = fmt.format(annIncome);
  document.getElementById('ry-total-exp').textContent    = '−' + fmt.format(Math.round(totalExp));
  document.getElementById('ry-ann-mortgage').textContent = '−' + fmt.format(Math.round(annMortgage));

  const annCfEl = document.getElementById('ry-ann-cf');
  annCfEl.textContent = (netAnnCf >= 0 ? '' : '−') + fmt.format(Math.abs(Math.round(netAnnCf)));
  annCfEl.className   = 'ry-result-value highlight ' + (netAnnCf >= 0 ? 'pos' : 'neg');

  const wkCfDetEl = document.getElementById('ry-wk-cf-detail');
  wkCfDetEl.textContent = (weekCf >= 0 ? '' : '−') + fmtDec.format(Math.abs(weekCf)) + '/week';
  wkCfDetEl.className   = 'ry-result-value highlight ' + (weekCf >= 0 ? 'pos' : 'neg');
}
