# WSG Blotter Dashboard — Handoff

## Self-contained wired builds (current deliverables)

Both design directions are now fully wired to the real exercise logic recovered in
`../wsg_blotter_desk_dashboard.html` and are single self-contained HTML files:

- `Blotter Dashboard A (Command Sidebar).html` — dark left-nav "command center" layout.
- `Blotter Dashboard B (Ribbon Tabs).html` — light masthead + hero strip + pill tab bar.

Open either file directly in a browser. No build step, no `support.js`, no `blotter-data.js`
import — everything is inline. What "wired" means:

- **Real dual-input parser** ported verbatim from the stitched dashboard: upload a workbook
  (sidebar button in A, masthead button in B) and it auto-detects legacy multi-sheet vs
  cleaned flat, normalises rows through the same `makeFactRow` fact model, extracts curated
  legacy headlines, builds periods, and raises the same QA exceptions.
- **Sample dataset runs through the real parser.** The deterministic generator now emits
  cleaned-flat rows (including two deliberately malformed rows) that are parsed by the actual
  cleaned-flat parser, so the demo exercises the same code path as an upload. Curated demo
  deltas keep Headline / Variance / Reconciliation demonstrable.
- **Enterprise connections retained** (they resolve only inside the studio shell; both files
  degrade gracefully on a dev machine):
  - Live USDHKD: `/studio/api/fx_spot_time_series` with fallback `7.8430` (status pill shows
    live vs fallback; click it to refresh).
  - HSBC brand icon + favicon: `/studio/static/ui/hsbc_icon.ico` — the brand mark is an `<img>`
    against the enterprise asset that falls back to the placeholder red diamond when offline.
  - XLSX (`cdn.jsdelivr.net`) and Highcharts 11.4.8 (`unpkg.com`, + heatmap + accessibility
    modules); charts show a fallback note when the CDN is unreachable.
- **One fix over the recovered logic**: `parseLegacyWorkbook`'s structured-sheet list carried
  two spelling variants that canonicalise to the same sheet name, double-counting Structured
  FI rows; the wired builds dedupe by canonical sheet name (also ported back to the stitched
  reference file).

### Added functionality (both designs)

- **Revenue bridge** — full-width waterfall on the overview: prior-period total → per-bucket
  MSS revenue deltas → current total. Respects the incl/ex-FX total policy. Needs
  `highcharts-more.js` (loaded from the same CDN; graceful fallback note when offline).
- **Persistence** — controls (period, mode, TRS FX source/override, total policy, filters,
  active tab) and the last uploaded workbook survive a reload via `localStorage`. The workbook
  is stored as raw bytes (≤3.5MB) and re-parsed by the real parser on load, so parser changes
  apply retroactively. "Workbook persisted locally — clear" (A sidebar) / "Clear stored" pill
  (B masthead) return to the sample dataset.
- **Linkable views** — the full view state lives in the URL hash (works from `file://` too);
  every control change updates it. The **Copy link** button in the toolbar copies a URL that
  reopens the exact view; an explicit hash in a link takes precedence over stored settings.
- **⌘K / Ctrl-K command palette** — jump to any tab or period, switch mode/total policy,
  filter by book, reset filters, export CSV, print, or find a trade by ID/underlying/client
  and jump to it in the Unified Table. Arrow keys + Enter, Esc closes.

The `.dc.html` files below are the original design-tool sources, kept for reference. They
depend on a `support.js` runtime that is not part of this export and will not run standalone.

## Original design sources (reference only)

Two finished design directions, both wired to the same sample dataset so they stay comparable:

- `Blotter Dashboard A (Command Sidebar).dc.html` — dark left-nav "command center" layout.
- `Blotter Dashboard B (Ribbon Tabs).dc.html` — light masthead + hero strip + pill tab bar.
- `blotter-data.js` — shared sample dataset + all aggregation math. The `.dc.html` sources import it.

## Replacing sample data with the real feed

`blotter-data.js` exports `getBlotterData()`, which currently generates deterministic fake
trades. To wire in the real parser output from `wsg_blotter_desk_dashboard.html`:

1. Keep the same **trade row shape** consumed everywhere (`t.id, t.date, t.year, t.month,
   t.assetClass, t.bucket, t.book, t.trader, t.customer, t.underlying, t.ccy, t.notionalUsd,
   t.notionalLocal, t.mssRev, t.pbFee, t.bankRev, t.action, t.sign, t.pairing`). This mirrors
   the `makeFactRow` fact-row model in the legacy dashboard.
2. Replace the body of `getBlotterData()` so `trades` comes from your real parser (legacy
   workbook or cleaned flat) instead of `genYear(...)`, and `qaIssues` comes from your real
   QA/exception list instead of the hardcoded array.
3. Update `periods` if your reporting windows differ from the built-in YTD/Q1/Q2 cuts.
4. `FX.live` / `FX.fallback` should be swapped for your live USDHKD feed value with the same
   fallback-on-failure behavior as the original dashboard.

No other files need to change — both dashboards call `bucketSummaryP`, `totalRow`,
`headlineRows`, `groupSum`, `monthlySeries`, `periodTrades`, and `distinctValues` from this
module, so any dataset that matches the row shape "just works."

## Controls reference

- **Period** — 6 built-in cuts (YTD / Q1 / Q2 for 2026 and 2025), each compared against the
  same window one year prior. Add more entries to `periods` in `blotter-data.js` for custom
  ranges.
- **Summary mode** — Headline (curated workbook figures) / Raw Rebuild (built from unified
  trade rows) / Variance (Raw − Headline, to flag control gaps). Hover the "ⓘ" label for the
  same explanation in-app.
- **TRS FX source** — Live USDHKD vs manual override; feeds Equity TRS headline notional
  conversion.
- **Total policy (incl/ex FX)** — always visible in the toolbar, independent of mode; applies
  to every KPI and summary total.
- **Filters bar** — Asset class / Book / Trader / Action; scopes Main Summary, all four
  asset-class detail tabs, and the Unified Main Table simultaneously. "Reset filters" clears
  all four at once.
- **Global search** (top bar) — looks up a trade by ID/underlying/client/book and jumps to the
  Unified Main Table pre-filtered to it.
- **Compare periods** (Direction A only) — side-by-side current vs prior bucket table.
- **Export CSV** — downloads the active Main Summary table as `wsg_blotter_main_summary.csv`.
- **Print Summary** — triggers browser print; chart panels and controls are hidden via
  `@media print` so only tables/KPIs print.

## Design tokens

HSBC red `#db0011` as the sole accent; ink `#16181d`/`#1a1c20`; neutral grays for secondary
text and borders. Direction A's sidebar is near-black (`#14161b`) for a trading-floor feel;
Direction B keeps everything on white with a dark hero band. Both use Arial/Helvetica and
Highcharts (`unpkg.com/highcharts@11.4.8`) for all charts.

## Known placeholder

The brand mark is a plain red diamond/hexagon shape, not the real HSBC logo — swap in the
actual asset when wiring this into the branded shell.
