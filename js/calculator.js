/*
==============================================
  calculator.js — Mortgage calculator logic:
  state management, slider/input sync, frequency
  toggle, IO period, interest simulation engine,
  chart rendering, and rate-rise scenarios.
==============================================
*/

// ---- STATE ----

const DEFAULTS = { loan: 500000, rate: 5.84, term: 30, extra: 0 };
const state = { ...DEFAULTS, freq: 'monthly', ioYears: 0 };

// Currency formatters
const fmt    = new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD', maximumFractionDigits: 0 });
const fmtDec = new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD', minimumFractionDigits: 2, maximumFractionDigits: 2 });

// ---- INIT ----

// Set all sliders and inputs to their default values and run the first calculation.
function initCalc() {
  for (const key of ['loan', 'rate', 'term', 'extra']) {
    document.getElementById('sl-' + key).value = DEFAULTS[key];
    document.getElementById('in-' + key).value = DEFAULTS[key];
  }
  updateLabels();
  updateCalc();
}

// ---- INPUT SYNC ----

// Sync the number input from the range slider and recalculate.
function syncInput(key, val) {
  val = parseFloat(val);
  state[key] = val;
  document.getElementById('in-' + key).value = val;
  updateLabels();
  updateCalc();
}

// Sync the range slider from the number input and recalculate.
function syncSlider(key, val) {
  val = parseFloat(val);
  if (isNaN(val)) return;
  const sl = document.getElementById('sl-' + key);
  val = Math.min(Math.max(val, parseFloat(sl.min)), parseFloat(sl.max));
  state[key] = val;
  sl.value = val;
  updateLabels();
  updateCalc();
}

// Set the payment frequency and recalculate.
function setFreq(freq, btn) {
  state.freq = freq;
  document.querySelectorAll('.freq-pill').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  updateLabels();
  updateCalc();
}

// Set the interest-only period in years and recalculate.
function setIO(val) {
  state.ioYears = parseInt(val, 10);
  updateCalc();
}

// Return the human-readable frequency label from state.
function freqLabel() {
  return state.freq === 'fortnightly' ? 'fortnightly' : state.freq === 'weekly' ? 'weekly' : 'monthly';
}

// Update all slider value labels in the UI.
function updateLabels() {
  const fl = freqLabel();
  document.getElementById('lv-loan').textContent  = fmt.format(state.loan);
  document.getElementById('lv-rate').textContent  = state.rate.toFixed(2) + '%';
  document.getElementById('lv-term').textContent  = state.term + (state.term === 1 ? ' year' : ' years');
  document.getElementById('lv-extra').textContent = fmt.format(state.extra) + '/' + fl.slice(0,2);
  document.getElementById('extra-field-label').textContent = 'Extra ' + fl + ' repayment';
}

// ---- INTEREST HELPERS ----

// Return the number of days in the given calendar month (0-indexed month).
function daysInMonth(year, month) {
  return new Date(year, month + 1, 0).getDate();
}

// Base monthly P&I payment for a given principal/rate/term (annuity formula, avg days).
function calcBaseMonthly(principal, annualRate, termMonths) {
  if (termMonths <= 0) return 0;
  const dailyRate   = annualRate / 100 / 365;
  const monthlyRate = dailyRate * (365 / 12);
  if (monthlyRate === 0) return principal / termMonths;
  return principal * monthlyRate / (1 - Math.pow(1 + monthlyRate, -termMonths));
}

// Base payment per period (fortnightly = monthly/2, weekly = monthly/4).
function calcBasePeriod(principal, annualRate, termMonths, freq) {
  const monthly = calcBaseMonthly(principal, annualRate, termMonths);
  if (freq === 'fortnightly') return monthly / 2;
  if (freq === 'weekly')      return monthly / 4;
  return monthly;
}

// ---- SIMULATION ENGINE ----

/**
 * Full simulation supporting IO period + payment frequency + extra repayments.
 *
 * IO phase  : monthly payments = balance × (r/365) × daysInMonth, no principal reduction.
 * P&I phase : recalculated base payment over remaining term at chosen frequency.
 *             Fortnightly/weekly: balance updated every 14/7 days using actual day counts,
 *             with interest = balance × (r/365) × daysSinceLastPayment.
 *             Extra repayment added each period on top of base.
 *
 * Returns { baseMonthly, basePeriod, ioMonthlyPayment, piBasePeriod,
 *           balances (monthly snapshots), totalInterest, totalMonths,
 *           ioMonths, piMonths }
 */
function simulateFull(principal, annualRate, termYears, extraPerPeriod, freq, ioYears) {
  const dailyRate  = annualRate / 100 / 365;
  const termMonths = termYears * 12;
  const ioMonths   = ioYears * 12;
  const piTermMo   = termMonths - ioMonths;

  // Base monthly P&I payment (used for display and for monthly freq simulation)
  const baseMonthly = calcBaseMonthly(principal, annualRate, termMonths);

  // IO monthly payment (interest only on full balance, avg days)
  const ioMonthlyPayment = principal * dailyRate * (365 / 12);

  // P&I base payment per period after IO ends (recalculated over remaining term)
  const piBaseMonthly = calcBaseMonthly(principal, annualRate, piTermMo);
  const piBasePeriod  = calcBasePeriod(principal, annualRate, piTermMo, freq);

  const now = new Date();
  let simYear  = now.getFullYear();
  let simMonth = now.getMonth();

  let balance = principal;
  const balances = [balance]; // one entry per calendar month for chart
  let totalInterest = 0;
  let totalMonths   = 0;
  let piMonths      = 0;

  // ── Phase 1: Interest only (always monthly regardless of freq) ──────────────
  for (let m = 0; m < ioMonths && balance > 0.005; m++) {
    const days     = daysInMonth(simYear, simMonth);
    const interest = balance * dailyRate * days;
    totalInterest += interest;
    // balance stays the same (interest only)
    totalMonths++;
    balances.push(balance);
    simMonth++; if (simMonth > 11) { simMonth = 0; simYear++; }
  }

  // ── Phase 2: P&I at chosen frequency ────────────────────────────────────────
  const maxPiPeriods = piTermMo * (freq === 'weekly' ? 52 / 12 : freq === 'fortnightly' ? 26 / 12 : 1);

  // Simulate P&I phase in period steps (monthly=avg 30.4167d, fortnightly=14d, weekly=7d).
  // Interest per period = balance × (annualRate/365) × daysInPeriod  (simple, no compounding).
  // For sub-monthly frequencies, we bucket periods into calendar months for the chart.
  const periodDays  = freq === 'fortnightly' ? 14 : freq === 'weekly' ? 7 : null;
  const payment     = piBasePeriod + extraPerPeriod;
  const maxPeriods  = Math.ceil(piTermMo * (freq === 'weekly' ? 52/12 : freq === 'fortnightly' ? 26/12 : 1)) + 2;

  if (freq === 'monthly') {
    let periods = 0;
    while (balance > 0.005 && periods < maxPeriods) {
      const days     = daysInMonth(simYear, simMonth);
      const interest = balance * dailyRate * days;
      totalInterest += interest;
      balance = balance + interest - payment;
      if (balance < 0) { totalInterest += balance; balance = 0; }
      periods++;
      totalMonths++;
      piMonths++;
      balances.push(balance);
      simMonth++; if (simMonth > 11) { simMonth = 0; simYear++; }
    }
    if (balance > 0.005) {
      totalInterest += balance * dailyRate * daysInMonth(simYear, simMonth);
      balance = 0;
      balances[balances.length - 1] = 0;
    }
  } else {
    // Fortnightly / weekly — simulate one period at a time, snapshot balance each calendar month.
    // Interest each period = balance × (dailyRate × periodDays)  — simple, matches monthly method.
    let daysCounted    = 0; // days elapsed since start of P&I (for calendar month tracking)
    let daysInCurMonth = daysInMonth(simYear, simMonth);
    let daysToNextSnap = daysInCurMonth; // days until next calendar-month snapshot

    let periods = 0;
    while (balance > 0.005 && periods < maxPeriods) {
      // Simple interest for this period
      const interest = balance * dailyRate * periodDays;
      totalInterest += interest;
      balance = balance + interest - payment;
      if (balance < 0) { totalInterest += balance; balance = 0; }
      periods++;

      // Advance day counter and record monthly snapshots
      daysCounted    += periodDays;
      daysToNextSnap -= periodDays;
      while (daysToNextSnap <= 0) {
        balances.push(balance);
        totalMonths++;
        piMonths++;
        simMonth++; if (simMonth > 11) { simMonth = 0; simYear++; }
        const nextMonthDays = daysInMonth(simYear, simMonth);
        daysToNextSnap += nextMonthDays;
      }
    }
    if (balance > 0.005) {
      totalInterest += balance * dailyRate * periodDays;
      balance = 0;
    }
    // Ensure final balance is zero in chart
    if (balances.length > 0) balances[balances.length - 1] = 0;
  }

  return {
    baseMonthly,
    basePeriod: freq === 'monthly' ? baseMonthly : (freq === 'fortnightly' ? baseMonthly / 2 : baseMonthly / 4),
    ioMonthlyPayment,
    piBasePeriod,
    balances,
    totalInterest,
    totalMonths,
    ioMonths,
    piMonths,
  };
}

// ── Pure monthly P&I baseline (no IO, no extras, monthly) ────────────────────
function simulateBaseline(principal, annualRate, termYears) {
  return simulateFull(principal, annualRate, termYears, 0, 'monthly', 0);
}

// ── Format months as "X years Y months" ──────────────────────────────────────
function fmtMonths(m) {
  const y = Math.floor(m / 12), mo = m % 12;
  return y + (y === 1 ? ' year' : ' years') + (mo > 0 ? ' ' + mo + (mo === 1 ? ' month' : ' months') : '');
}

// ---- CHART ----

let chart = null;

// Render or update the loan balance chart using Chart.js.
function drawChart(stdBalances, extBalances, ioMonths) {
  const maxPoints = 80;
  function sample(arr) {
    if (arr.length <= maxPoints) return arr.map((v, i) => ({ v, i }));
    const step = arr.length / maxPoints;
    const out = [];
    for (let i = 0; i < arr.length; i += step) {
      const idx = Math.floor(i);
      out.push({ v: arr[idx], i: idx });
    }
    const last = { v: arr[arr.length - 1], i: arr.length - 1 };
    if (out[out.length - 1].i !== last.i) out.push(last);
    return out;
  }

  const stdSampled = sample(stdBalances);
  const extSampled = sample(extBalances);
  const totalLen   = Math.max(stdBalances.length, extBalances.length);

  function toLabel(monthIdx) {
    const y = Math.floor(monthIdx / 12), m = monthIdx % 12;
    return (m === 0 && y % 5 === 0) ? 'Year ' + y : '';
  }

  // Build a unified index from the longer series
  const longer = stdSampled.length >= extSampled.length ? stdSampled : extSampled;
  const labels  = longer.map(pt => toLabel(pt.i));
  const stdData = longer.map(pt => {
    // find closest point in std
    const match = stdSampled.find(s => s.i >= pt.i);
    return match ? match.v : 0;
  });
  const extData = longer.map(pt => {
    const match = extSampled.find(s => s.i >= pt.i);
    return match ? match.v : 0;
  });

  // IO annotation: x-range in sampled indices where month index < ioMonths
  const ioEndIdx = longer.findIndex(pt => pt.i >= ioMonths);

  const ctx = document.getElementById('loanChart').getContext('2d');

  if (chart) {
    chart.data.labels           = labels;
    chart.data.datasets[0].data = extData;
    chart.data.datasets[1].data = stdData;
    // Update IO band dataset
    chart.data.datasets[2].data = longer.map((pt, i) => (i <= ioEndIdx && ioMonths > 0) ? extData[i] : null);
    chart.update();
    return;
  }

  chart = new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [
        {
          label: 'Your scenario',
          data: extData,
          borderColor: '#0f766e',
          backgroundColor: 'rgba(15,118,110,.08)',
          borderWidth: 2.5,
          pointRadius: 0,
          fill: true,
          tension: 0.3,
          order: 2,
        },
        {
          label: 'Monthly P&I baseline',
          data: stdData,
          borderColor: '#cbd5e1',
          backgroundColor: 'rgba(203,213,225,.06)',
          borderWidth: 2,
          pointRadius: 0,
          fill: true,
          tension: 0.3,
          borderDash: [6, 3],
          order: 3,
        },
        {
          // IO period overlay — filled band, no border
          label: 'Interest only period',
          data: longer.map((pt, i) => (i <= ioEndIdx && ioMonths > 0) ? extData[i] : null),
          borderColor: 'transparent',
          backgroundColor: 'rgba(13,148,136,.18)',
          borderWidth: 0,
          pointRadius: 0,
          fill: 'origin',
          tension: 0.3,
          spanGaps: false,
          order: 1,
        },
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: { display: false },
        tooltip: {
          filter: item => item.dataset.label !== 'Interest only period',
          callbacks: {
            label(ctx) {
              return ' ' + ctx.dataset.label + ': ' + fmt.format(ctx.parsed.y);
            }
          }
        }
      },
      scales: {
        x: {
          ticks: { font: { size: 12 }, color: '#94a3b8', autoSkip: false, maxRotation: 0 },
          grid: { display: false },
        },
        y: {
          ticks: {
            callback: v => '$' + (v >= 1e6 ? (v / 1e6).toFixed(1) + 'M' : (v / 1e3).toFixed(0) + 'k'),
            font: { size: 12 },
            color: '#94a3b8',
          },
          grid: { color: '#f1f5f9' },
        }
      }
    }
  });
}

// ---- MAIN UPDATE ----

// Recalculate everything and push results to the DOM.
function updateCalc() {
  const { loan, rate, term, extra, freq, ioYears } = state;

  const baseline = simulateBaseline(loan, rate, term);
  const scenario = simulateFull(loan, rate, term, extra, freq, ioYears);

  const fl = freqLabel();
  const hasIO  = ioYears > 0;
  const isFreq = freq !== 'monthly';

  // ── IO rows visibility ───────────────────────────────────────────────────
  document.getElementById('io-row-payment').classList.toggle('visible', hasIO);
  document.getElementById('io-row-pi').classList.toggle('visible', hasIO);
  document.getElementById('io-row-cost').classList.toggle('visible', hasIO);
  document.getElementById('ioWarning').classList.toggle('visible', hasIO);
  document.getElementById('legend-io-item').classList.toggle('visible', hasIO);

  if (hasIO) {
    document.getElementById('res-io-payment').textContent = fmtDec.format(scenario.ioMonthlyPayment) + '/mo';
    const piLabel = 'P&I payment after IO (' + fl + ')';
    document.getElementById('lbl-pi-after').textContent = piLabel;
    document.getElementById('res-pi-after').textContent = fmtDec.format(scenario.piBasePeriod + extra) + '/' + fl.slice(0,2);
    const ioCost = scenario.totalInterest - baseline.totalInterest;
    document.getElementById('res-io-cost').textContent = (ioCost >= 0 ? '+' : '') + fmt.format(ioCost);
  }

  // ── Base repayment labels ────────────────────────────────────────────────
  const periodLabel = 'Base ' + fl + ' repayment';
  document.getElementById('lbl-monthly').textContent = periodLabel;
  document.getElementById('res-monthly').textContent = fmtDec.format(scenario.basePeriod);

  const totalLabel = 'Total ' + fl + ' payment (incl. extra)';
  document.getElementById('lbl-total-monthly').textContent = totalLabel;
  document.getElementById('res-total-monthly').textContent = fmtDec.format(scenario.basePeriod + extra);

  // ── Payoff & time saved ─────────────────────────────────────────────────
  document.getElementById('res-payoff').textContent = fmtMonths(scenario.totalMonths);

  const savedMonths = baseline.totalMonths - scenario.totalMonths;
  if (savedMonths <= 0) {
    document.getElementById('res-time-saved').textContent = '—';
  } else {
    document.getElementById('res-time-saved').textContent = fmtMonths(savedMonths) + ' sooner';
  }

  // ── Interest ─────────────────────────────────────────────────────────────
  document.getElementById('res-int-std').textContent   = fmt.format(baseline.totalInterest);
  document.getElementById('res-int-extra').textContent = fmt.format(scenario.totalInterest);

  const intSaved = baseline.totalInterest - scenario.totalInterest;
  const isSaving = intSaved > 0;
  document.getElementById('lbl-int-saved').textContent   = isSaving ? 'Interest saved vs baseline' : 'Extra interest vs baseline';
  document.getElementById('res-int-saved').textContent   = fmt.format(Math.abs(intSaved));
  const pct = baseline.totalInterest > 0 ? Math.abs(intSaved / baseline.totalInterest * 100).toFixed(1) : '0.0';
  document.getElementById('res-saving-tag').textContent  = pct + '% ' + (isSaving ? 'less' : 'more') + ' interest';

  // ── Chart legend label ────────────────────────────────────────────────────
  let scenLabel = 'Your scenario';
  if (!hasIO && !isFreq && extra === 0) scenLabel = 'Standard repayments';
  else if (!hasIO && !isFreq) scenLabel = 'With extra repayments';
  else if (isFreq && !hasIO) scenLabel = fl.charAt(0).toUpperCase() + fl.slice(1) + ' repayments';
  document.getElementById('legend-teal-label').textContent = scenLabel;

  drawChart(baseline.balances, scenario.balances, scenario.ioMonths);
  updateRateScenarios();
}

// ---- RATE RISE SCENARIOS ----

// Calculate and display the three rate-rise scenario cards.
function updateRateScenarios() {
  const { loan, rate, term, freq } = state;
  const termMonths = term * 12;
  const fl         = freqLabel(); // 'monthly', 'fortnightly', 'weekly'
  const flShort    = fl.slice(0, 2); // 'mo', 'fo', 'we'

  const currentPayment = calcBasePeriod(loan, rate, termMonths, freq);

  [0.25, 0.50, 0.75].forEach((bump, i) => {
    const n          = i + 1;
    const newRate    = rate + bump;
    const newPayment = calcBasePeriod(loan, newRate, termMonths, freq);
    const diff       = newPayment - currentPayment;

    document.getElementById('rs-rate-' + n).textContent    = newRate.toFixed(2) + '%';
    document.getElementById('rs-label-' + n).textContent   = '+' + bump.toFixed(2) + '% increase';
    document.getElementById('rs-freq-' + n).textContent    = 'New ' + fl + ' repayment';
    document.getElementById('rs-payment-' + n).textContent = fmtDec.format(newPayment) + '/' + flShort;
    document.getElementById('rs-diff-' + n).textContent    = '+' + fmtDec.format(diff) + '/' + fl + ' more';
  });
}
