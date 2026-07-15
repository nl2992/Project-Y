// WSG Blotter — deterministic sample dataset + shared aggregation helpers.
// Mirrors the fact-row model of wsg_blotter_desk_dashboard.html (cleaned-flat input).

function RNG(seed) {
  let a = seed;
  return () => {
    a |= 0; a = a + 0x6D2B79F5 | 0;
    let t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

export const BUCKETS = ['Structured Rate', 'Structured Credit (Flow)', 'Illiquid Credit + Repack', 'Collar', 'Equity TRS', 'FX'];
export const ASSET_CLASSES = ['Structured Rate', 'Structured Credit (Flow)', 'Illiquid Credit', 'Repack', 'Collar', 'Equity TRS', 'FX'];
export const FX = { live: 7.8412, fallback: 7.8430, pair: 'USDHKD' };

const TRADERS = ['K. Leung', 'J. Ho', 'S. Tanaka', 'M. Chen', 'R. Iyer', 'A. Wong'];
const CUSTOMERS = ['Golden Peak FO', 'Harbourview Capital', 'Meridian Partners', 'Lotus Wealth', 'Crestline Trust', 'Aster PB Client 12'];

const CLASSES = [
  { cls: 'Structured Rate', bucket: 'Structured Rate', t1: 'Structured FI', t2: 'Rates', idp: 'SR',
    books: ['HBAP-FIC-STR', 'HBEU-FIC-STR'], ccy: 'USD',
    und: ['USD CMS 2s10s Steepener', 'SOFR Range Accrual', 'HKD IRS Callable', 'EUR CMS Spread Note', 'USD Fixed Callable'],
    nMin: 8e6, nMax: 6.5e7, mMin: .006, mMax: .012, count: 22 },
  { cls: 'Structured Credit (Flow)', bucket: 'Structured Credit (Flow)', t1: 'Structured FI', t2: 'Credit', idp: 'SC',
    books: ['HBAP-FIC-CRD', 'HBAP-FIC-FLW'], ccy: 'USD',
    und: ['iTraxx Asia XO CLN', 'FTD Basket - Asia IG', 'CDS-Linked Note SG', 'Bespoke Tranche A5'],
    nMin: 5e6, nMax: 4e7, mMin: .008, mMax: .015, count: 18 },
  { cls: 'Illiquid Credit', bucket: 'Illiquid Credit + Repack', t1: 'Credit', t2: 'Illiquid', idp: 'IL',
    books: ['HBAP-ILQ-01'], ccy: 'USD',
    und: ['Harbour RE 6.1% Perp', 'Pacific Dev 4.2% 28s', 'Orion Infra 5.5% 29s', 'Meridian Prop 3.9% 27s'],
    nMin: 8e6, nMax: 4.5e7, mMin: .012, mMax: .024, count: 9 },
  { cls: 'Repack', bucket: 'Illiquid Credit + Repack', t1: 'Credit', t2: 'Repack', idp: 'RP',
    books: ['HBAP-RPK-SPV'], ccy: 'USD',
    und: ['Repack SPV Lotus-7', 'Repack SPV Kestrel-2', 'Repack SPV Argo-4'],
    nMin: 1e7, nMax: 5e7, mMin: .009, mMax: .018, count: 7 },
  { cls: 'Collar', bucket: 'Collar', t1: 'Equity', t2: 'Collar', idp: 'CL',
    books: ['HBAP-EQD-COL'], ccy: 'USD',
    und: ['700 HK', '9988 HK', '1299 HK', '3690 HK', '2318 HK'],
    nMin: 1.5e7, nMax: 1.2e8, mMin: .004, mMax: .009, count: 14, pb: true },
  { cls: 'Equity TRS', bucket: 'Equity TRS', t1: 'Equity', t2: 'TRS', idp: 'TR',
    books: ['HBAP-EQD-TRS'], ccy: 'HKD',
    und: ['700 HK', '9988 HK', '1299 HK', '941 HK', '3690 HK', '2318 HK'],
    nMin: 2.5e6, nMax: 2.6e7, mMin: .003, mMax: .007, count: 26, pb: true },
  { cls: 'FX', bucket: 'FX', t1: 'Structured FI', t2: 'FX', idp: 'FX',
    books: ['HBAP-FIC-FX'], ccy: 'USD',
    und: ['USDHKD Fwd Strip', 'USDCNH Option', 'AUDUSD TARF', 'USDJPY Seagull'],
    nMin: 3e6, nMax: 2.5e7, mMin: .002, mMax: .005, count: 12 }
];

// per-bucket YoY shape so deltas are interesting
const YEAR_MULT = {
  2026: { 'Structured Rate': 1.00, 'Structured Credit (Flow)': 1.28, 'Illiquid Credit + Repack': 0.78, 'Collar': 1.42, 'Equity TRS': 1.16, 'FX': 0.68 },
  2025: { 'Structured Rate': 1.00, 'Structured Credit (Flow)': 1.00, 'Illiquid Credit + Repack': 1.00, 'Collar': 1.00, 'Equity TRS': 1.00, 'FX': 1.00 },
  2024: { 'Structured Rate': 0.82, 'Structured Credit (Flow)': 0.80, 'Illiquid Credit + Repack': 0.85, 'Collar': 0.70, 'Equity TRS': 0.78, 'FX': 0.95 }
};

function pad(n, w) { return String(n).padStart(w, '0'); }

function genYear(year, seedBase) {
  const rng = RNG(seedBase);
  const trades = [];
  let seq = 100;
  CLASSES.forEach(cfg => {
    const mult = YEAR_MULT[year][cfg.bucket];
    const count = Math.max(3, Math.round(cfg.count * (year === 2026 ? 1 : year === 2025 ? 0.92 : 0.75) * (0.7 + 0.6 * mult)));
    for (let i = 0; i < count; i++) {
      // trade date Jan 1 – Jul 3 window
      const day = 1 + Math.floor(rng() * 183);
      const d = new Date(Date.UTC(year, 0, day));
      if (d > new Date(Date.UTC(year, 6, 3))) d.setUTCMonth(6, 3);
      const date = d.toISOString().slice(0, 10);
      const r = rng();
      const action = r < 0.78 ? 'New' : r < 0.90 ? 'Unwind' : 'Roll';
      const sign = action === 'New' ? 1 : action === 'Unwind' ? -1 : 0;
      const notionalUsd = Math.round((cfg.nMin + rng() * (cfg.nMax - cfg.nMin)) * mult / 1e5) * 1e5;
      const margin = cfg.mMin + rng() * (cfg.mMax - cfg.mMin);
      const mssRev = Math.round(notionalUsd * margin / 100) * 100;
      const pbFee = cfg.pb && rng() < 0.6 ? Math.round(notionalUsd * 0.0006 / 100) * 100 : 0;
      const und = cfg.und[Math.floor(rng() * cfg.und.length)];
      seq += 1 + Math.floor(rng() * 7);
      trades.push({
        id: `WSG-${String(year).slice(2)}-${cfg.idp}${pad(seq, 4)}`,
        isin: cfg.t1 !== 'Equity' ? `XS2${pad(Math.floor(rng() * 9e6), 7)}` : '',
        date, year,
        month: date.slice(0, 7),
        assetClass: cfg.cls, bucket: cfg.bucket,
        t1: cfg.t1, t2: cfg.t2,
        book: cfg.books[Math.floor(rng() * cfg.books.length)],
        trader: TRADERS[Math.floor(rng() * TRADERS.length)],
        customer: CUSTOMERS[Math.floor(rng() * CUSTOMERS.length)],
        underlying: und,
        ccy: cfg.ccy,
        notionalUsd,
        notionalLocal: cfg.ccy === 'HKD' ? Math.round(notionalUsd * FX.live) : notionalUsd,
        mssRev, pbFee, bankRev: mssRev + pbFee,
        action, sign,
        pairing: cfg.cls === 'Collar' ? (rng() < 0.9 ? 'Paired' : 'Incomplete') : '',
        source: 'cleaned_flat', sheet: 'Flat Blotter'
      });
    }
  });
  return trades.sort((a, b) => a.date < b.date ? -1 : 1);
}

export function headlineNotional(t, fx) {
  if (t.action !== 'New') return 0;
  if (t.assetClass === 'Equity TRS') return t.notionalLocal / (fx || FX.live);
  return t.notionalUsd;
}

export function periodTrades(trades, year, mStart, mEnd) {
  return trades.filter(t => t.year === year && Number(t.month.slice(5)) >= mStart && Number(t.month.slice(5)) <= mEnd);
}
export function distinctValues(trades, key) {
  return [...new Set(trades.map(t => t[key]))].sort();
}

export function getBlotterData() {
  const trades = [...genYear(2024, 20240703), ...genYear(2025, 20250703), ...genYear(2026, 20260703)];
  const qaIssues = [
    { severity: 'warn', type: 'missing_trade_date', sheet: 'Flat Blotter', record: 'WSG-26-SC0141', message: 'Cleaned flat row has no parseable trade date; excluded from period totals.' },
    { severity: 'warn', type: 'missing_trade_date', sheet: 'Flat Blotter', record: 'WSG-26-TR0287', message: 'Trade date cell holds text "pending"; row parked in exceptions.' },
    { severity: 'warn', type: 'incomplete_collar_pair', sheet: 'Flat Blotter', record: '3690 HK / CL0166', message: 'Collar strategy shows a put leg without a matching call leg.' },
    { severity: 'warn', type: 'duplicate_reference', sheet: 'Flat Blotter', record: 'WSG-26-TR0231', message: 'Reference number appears twice with differing notional; larger row retained.' },
    { severity: 'info', type: 'unclassified_asset', sheet: 'Flat Blotter', record: 'flat-412', message: 'Tier columns did not map to a dashboard bucket; routed to Other.' },
    { severity: 'info', type: 'unclassified_asset', sheet: 'Flat Blotter', record: 'flat-418', message: 'Comment metadata missing source_action token; defaulted to New.' },
    { severity: 'info', type: 'pc_source_pb_fee', sheet: 'Flat Blotter', record: 'WSG-26-CL0158', message: 'pc_source=PB_FEE_USD detected; bank revenue = MSS revenue + PB fee.' },
    { severity: 'info', type: 'fx_fallback_available', sheet: '-', record: 'USDHKD', message: 'Live feed healthy at 7.8412; static fallback 7.8430 retained for re-runs.' }
  ];
  const periods = [
    { key: '2026-ytd', label: '2026 YTD (Jan – Jul 03)', year: 2026, prior: 2025, mStart: 1, mEnd: 7 },
    { key: '2026-q2', label: '2026 Q2 (Apr – Jun)', year: 2026, prior: 2025, mStart: 4, mEnd: 6 },
    { key: '2026-q1', label: '2026 Q1 (Jan – Mar)', year: 2026, prior: 2025, mStart: 1, mEnd: 3 },
    { key: '2025-ytd', label: '2025 YTD (Jan – Jul 03)', year: 2025, prior: 2024, mStart: 1, mEnd: 7 },
    { key: '2025-q2', label: '2025 Q2 (Apr – Jun)', year: 2025, prior: 2024, mStart: 4, mEnd: 6 },
    { key: '2025-q1', label: '2025 Q1 (Jan – Mar)', year: 2025, prior: 2024, mStart: 1, mEnd: 3 }
  ];
  return { trades, qaIssues, periods, filename: 'wsg_flat_blotter_2026-07-03.xlsx', loadedAt: '2026-07-06 08:12 HKT' };
}

// ---- aggregation ----
// cur/prv trades are already period- and filter-scoped by the caller.
export function bucketSummaryP(cur, prv, fx) {
  return BUCKETS.map(b => {
    const c = cur.filter(t => t.bucket === b);
    const p = prv.filter(t => t.bucket === b);
    const cN = c.reduce((a, t) => a + headlineNotional(t, fx), 0);
    const cR = c.reduce((a, t) => a + t.mssRev, 0);
    const pN = p.reduce((a, t) => a + headlineNotional(t, fx), 0);
    const pR = p.reduce((a, t) => a + t.mssRev, 0);
    // book children
    const books = [...new Set(c.map(t => t.book))].map(book => {
      const bt = c.filter(t => t.book === book);
      return {
        book,
        notional: bt.reduce((a, t) => a + headlineNotional(t, fx), 0),
        revenue: bt.reduce((a, t) => a + t.mssRev, 0),
        count: bt.length,
        trades: bt.slice().sort((a, b) => b.mssRev - a.mssRev)
      };
    }).sort((a, b) => b.revenue - a.revenue);
    return {
      bucket: b, cN, cR, pN, pR,
      dN: pN ? (cN - pN) / Math.abs(pN) : null,
      dR: pR ? (cR - pR) / Math.abs(pR) : null,
      count: c.length, priorCount: p.length, books
    };
  });
}
// legacy signature retained for compatibility — filters full trade list by year first
export function bucketSummary(trades, curYear, prvYear, fx) {
  return bucketSummaryP(trades.filter(t => t.year === curYear), trades.filter(t => t.year === prvYear), fx);
}

export function totalRow(rows, includeFx) {
  const use = includeFx ? rows : rows.filter(r => r.bucket !== 'FX');
  const cN = use.reduce((a, r) => a + r.cN, 0), cR = use.reduce((a, r) => a + r.cR, 0);
  const pN = use.reduce((a, r) => a + r.pN, 0), pR = use.reduce((a, r) => a + r.pR, 0);
  return { bucket: includeFx ? 'Total incl FX' : 'Total ex FX', cN, cR, pN, pR, dN: pN ? (cN - pN) / pN : null, dR: pR ? (cR - pR) / pR : null, count: use.reduce((a, r) => a + r.count, 0) };
}

// curated headline = rebuild plus small curated deltas (drives Reconciliation + Variance mode)
const HEADLINE_DELTA = {
  'Structured Rate': { n: 0, r: 0 },
  'Structured Credit (Flow)': { n: -1.5e6, r: -42000 },
  'Illiquid Credit + Repack': { n: 0, r: 0 },
  'Collar': { n: -2.4e6, r: 0 },
  'Equity TRS': { n: 3.1e6, r: 184000 },
  'FX': { n: 0, r: -12500 }
};
export function headlineRows(rebuildRows) {
  return rebuildRows.map(r => {
    const d = HEADLINE_DELTA[r.bucket] || { n: 0, r: 0 };
    const cN = r.cN + d.n, cR = r.cR + d.r;
    return { ...r, cN, cR, dN: r.pN ? (cN - r.pN) / Math.abs(r.pN) : null, dR: r.pR ? (cR - r.pR) / Math.abs(r.pR) : null };
  });
}

export function monthlySeries(trades, year, fn) {
  const cats = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul'];
  const vals = cats.map((_, i) => trades.filter(t => t.year === year && Number(t.month.slice(5)) === i + 1).reduce((a, t) => a + fn(t), 0));
  return { cats, vals };
}

export function groupSum(trades, keyFn, fx) {
  const m = new Map();
  trades.forEach(t => {
    const k = keyFn(t);
    if (!m.has(k)) m.set(k, { key: k, notional: 0, revenue: 0, bank: 0, count: 0, net: 0 });
    const g = m.get(k);
    g.notional += headlineNotional(t, fx);
    g.revenue += t.mssRev;
    g.bank += t.bankRev;
    g.net += t.sign * t.notionalUsd;
    g.count += 1;
  });
  return [...m.values()].sort((a, b) => b.revenue - a.revenue);
}

export function fmtM(n) {
  if (n == null || isNaN(n)) return '-';
  const a = Math.abs(n);
  if (a >= 1e9) return (n / 1e9).toFixed(2) + 'bn';
  if (a >= 1e6) return (n / 1e6).toFixed(1) + 'm';
  if (a >= 1e3) return (n / 1e3).toFixed(0) + 'k';
  return String(Math.round(n));
}
export function fmtUsd(n) { return n == null || isNaN(n) ? '-' : 'USD ' + fmtM(n); }
export function fmtFull(n) { return n == null || isNaN(n) ? '-' : Number(Math.round(n)).toLocaleString('en-US'); }
export function fmtPct(n) { if (n == null || isNaN(n)) return '-'; const v = n * 100; return (v > 0 ? '+' : '') + v.toFixed(1) + '%'; }
export function pctColor(n) { if (n == null || isNaN(n) || n === 0) return '#6b7280'; return n > 0 ? '#15803d' : '#b91c1c'; }
