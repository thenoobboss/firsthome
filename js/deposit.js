/*
==============================================
  deposit.js — Deposit Growth modal:
  content definitions, open/close logic,
  and keyboard / backdrop dismissal.
==============================================
*/

const _ICON_INFO  = `<svg width="16" height="16" viewBox="0 0 20 20" fill="none"><circle cx="10" cy="10" r="9" stroke="currentColor" stroke-width="1.8"/><path d="M10 6v4m0 3h.01" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>`;
const _ICON_WARN  = `<svg width="16" height="16" viewBox="0 0 20 20" fill="none"><path d="M9.13 3.5l-6.5 11A1 1 0 0 0 3.5 16h13a1 1 0 0 0 .87-1.5l-6.5-11a1 1 0 0 0-1.74 0Z" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/><path d="M10 8v3m0 2.5h.01" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/></svg>`;
const _ICON_CHECK = `<svg width="16" height="16" viewBox="0 0 20 20" fill="none"><circle cx="10" cy="10" r="9" stroke="currentColor" stroke-width="1.8"/><path d="M6.5 10l2.5 2.5 4-4" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>`;

// ── Modal content definitions ────────────────────────────────────────────────

const DEPOSIT_MODAL = {

  low: {
    badge:     'dm-badge-low',
    badgeText: 'Low Risk',
    title:     "The 'Sleep Easy' Path — How It Works",
    body: `
      <div class="dm-section">
        <div class="dm-section-title">💰 High-Interest Savings Account (HISA)</div>
        <p>A HISA pays significantly more interest than a standard everyday account — typically <strong>4–5.5% p.a.</strong> at a big bank or online lender. The catch? Some accounts require a minimum monthly deposit or limit withdrawals to earn the bonus rate.</p>
        <p>The Australian Government guarantees deposits up to <strong>$250,000 per person, per institution</strong> under the Financial Claims Scheme. Your money is safe even if the bank goes under.</p>
        <p style="font-size:13px;color:var(--muted)">Where to compare: RateCity, Canstar, or Finder. Look for accounts with no monthly fees and a consistently high base rate.</p>
      </div>

      <hr class="dm-divider">

      <div class="dm-section">
        <div class="dm-section-title">🏛️ First Home Super Saver Scheme (FHSSS)</div>
        <p>The FHSSS lets you save for your deposit <em>inside your super fund</em>, where voluntary contributions are taxed at just <strong>15%</strong> — much lower than most people's income tax rate.</p>
        <p>You can contribute up to <strong>$15,000 per financial year</strong> and withdraw up to <strong>$50,000 total</strong> when you're ready to buy. The tax saving alone can add thousands to your effective deposit.</p>
        <div class="dm-note dm-note-amber">
          ${_ICON_WARN}
          <span><strong>Important:</strong> You must apply for an FHSS determination from the ATO <em>before</em> signing a purchase contract. Processing takes up to 25 business days — factor this into your timeline.</span>
        </div>
      </div>

      <hr class="dm-divider">

      <div class="dm-section">
        <div class="dm-section-title">✅ Pro Tip — Automate It</div>
        <p>The single most effective savings habit is moving money on payday before you can spend it. Set up an automatic transfer to your HISA the same day your salary lands.</p>
        <div class="dm-note dm-note-green">
          ${_ICON_CHECK}
          <span>Even <strong>$200/week</strong> transferred automatically adds up to <strong>$10,400/year</strong> — before interest. Set it, forget it, buy a house.</span>
        </div>
      </div>
    `,
  },

  med: {
    badge:     'dm-badge-med',
    badgeText: 'Medium Risk',
    title:     "The 'Slow & Steady' Path — How It Works",
    body: `
      <div class="dm-section">
        <div class="dm-section-title">📊 Exchange-Traded Funds (ETFs)</div>
        <p>An ETF is like buying a tiny slice of hundreds of companies in one transaction. An <strong>ASX 200 ETF</strong> gives you exposure to Australia's 200 largest listed companies. An <strong>S&amp;P 500 ETF</strong> does the same for the US market.</p>
        <p>Instead of gambling on one company, you're betting on the entire economy growing over time. Historically, broad market indexes have returned <strong>~7–10% annually</strong> over long periods — well above a savings account.</p>
        <p style="font-size:13px;color:var(--muted)">ETFs charge a small annual fee (called MER — usually 0.03–0.20%). Popular options in Australia: VAS, IOZ (ASX 200), IVV, NDQ (US markets).</p>
      </div>

      <hr class="dm-divider">

      <div class="dm-section">
        <div class="dm-section-title">📈 The Power of Compounding</div>
        <p>When your investments earn returns, those returns also start earning returns. Reinvesting dividends (the cash payments companies make to shareholders) accelerates this effect.</p>
        <p><strong>Example:</strong> $20,000 invested at 8% annual return, with dividends reinvested, grows to roughly <strong>$29,400 after 5 years</strong> — without adding another dollar.</p>
        <p>The key ingredient? Time. The longer you stay invested, the more compounding does the heavy lifting.</p>
      </div>

      <hr class="dm-divider">

      <div class="dm-section">
        <div class="dm-note dm-note-amber">
          ${_ICON_WARN}
          <span><strong>Timeline warning:</strong> ETFs are not for short-term saving. If the market drops 25% the month you're ready to buy, you may need to wait years for a recovery — or sell at a loss. Only invest money you won't need for <strong>at least 3 years</strong>. Don't invest next year's deposit here.</span>
        </div>
      </div>
    `,
  },

  high: {
    badge:     'dm-badge-high',
    badgeText: 'High Risk',
    title:     "The 'Wildcard' Path — How It Works",
    body: `
      <div class="dm-section">
        <div class="dm-section-title">🎯 Individual Stocks</div>
        <p>Buying shares in a single company (e.g., one tech stock, one mining company) is a concentrated bet. If the company does well, gains can far outpace anything a savings account or index fund delivers. If it doesn't, there's no diversification to soften the blow.</p>
        <p>Individual stocks can drop <strong>50–80% or more</strong> in a short period — without warning, and without recovery.</p>
      </div>

      <hr class="dm-divider">

      <div class="dm-section">
        <div class="dm-section-title">🪙 Crypto-Assets</div>
        <p>Cryptocurrencies (Bitcoin, Ethereum, etc.) are highly volatile digital assets. There is no government guarantee, no earnings to anchor valuation, and price movements of <strong>±20% in a single week</strong> are not unusual.</p>
        <p>The appeal is obvious — some early holders made life-changing returns. But for every winner, many more lost significant money, often right before they planned to buy a home.</p>
      </div>

      <hr class="dm-divider">

      <div class="dm-section">
        <div class="dm-note dm-note-red">
          ${_ICON_WARN}
          <span>
            <strong>Read this clearly:</strong> You are trading security for speed. This money could disappear overnight — and that's not an exaggeration. A stock can go to zero. A crypto exchange can collapse.<br><br>
            If you still want to use this path, limit it to a <strong>small portion of your total savings</strong> (many advisers suggest no more than 10%). Never put your full deposit into high-risk assets. Never invest money you cannot afford to lose entirely.
          </span>
        </div>
      </div>
    `,
  },
};

// ── Open / close ─────────────────────────────────────────────────────────────

function openDepositModal(type) {
  const data = DEPOSIT_MODAL[type];
  if (!data) return;

  const overlay   = document.getElementById('deposit-modal');
  const badge     = document.getElementById('dm-badge');
  const title     = document.getElementById('dm-title');
  const body      = document.getElementById('dm-body');

  // Inject content
  badge.className = 'dm-badge ' + data.badge;
  badge.textContent = data.badgeText;
  title.textContent = data.title;
  body.innerHTML = data.body;

  // Open
  overlay.classList.add('open');
  document.body.style.overflow = 'hidden';

  // Scroll body to top (in case previously scrolled)
  body.scrollTop = 0;

  // Focus the close button for accessibility
  overlay.querySelector('.dm-close').focus();
}

function closeDepositModal(e) {
  // If called from backdrop click, only close if the overlay itself was clicked
  if (e && e.target !== document.getElementById('deposit-modal')) return;
  const overlay = document.getElementById('deposit-modal');
  overlay.classList.remove('open');
  document.body.style.overflow = '';
}

// ESC key to close
document.addEventListener('keydown', function (e) {
  if (e.key === 'Escape') {
    const overlay = document.getElementById('deposit-modal');
    if (overlay && overlay.classList.contains('open')) {
      overlay.classList.remove('open');
      document.body.style.overflow = '';
    }
  }
});
