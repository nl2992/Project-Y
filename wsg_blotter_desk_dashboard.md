# WSG Blotter Desk Dashboard - Dual Input

## What This Is

This is a single-file HTML dashboard reconstructed from the 127 provided source-code images. It is designed as an enterprise blotter control board for WSG desk reporting, supporting both a legacy multi-sheet workbook and a cleaned flat workbook.

The final application file is:

- `wsg_blotter_desk_dashboard.html`

The OCR reconstruction filtered out PDF viewer chrome and footer noise such as page counters, taskbar text, and repeated `INTERNAL` labels. Enterprise connections from the recovered source were retained, including the XLSX parser CDN, Highcharts modules, favicon path, and the live USDHKD FX endpoint.

## Image Count

- Expected images: 127
- Found images: 127
- Missing required images: none
- Camera filename sequence gap: `IMG_5646.HEIC`

The folder contains `IMG_5535.HEIC` through `IMG_5662.HEIC`, with `IMG_5646.HEIC` skipped in the numeric sequence. Because the count is still 127, this appears to be a camera numbering gap rather than a missing source page.

## Expected Inputs

The dashboard accepts `.xlsx` and `.xls` workbook uploads.

### Legacy Workbook

Expected legacy sheets include any available subset of:

- `Consolidate Sheet`
- `Structured Rate + Credit`
- `Illiquid Credit+Repack`
- `Collar Blotter`
- `Equity TRS`
- `Equity TRS Summary`

The legacy parser extracts blotter rows, curated headline rows where available, TRS summary notes, and raw sheet previews.

### Cleaned Flat Workbook

The cleaned flat parser expects a single flat table with fields such as:

- `Tier 1 Product Type`
- `Tier 2 Product Type`
- `Tier 3 Product Type`
- `Trade Date`
- `Volume` / `$ Volume` / `$ TV`
- `PC`
- `VA/GNBV`
- `Comment`
- `Book`
- `Primary CCY`
- `Trade ID`
- `ISIN Code`

Comment metadata is parsed for key/value tokens such as `source_action` and `pc_source`.

### Live FX Input

The dashboard attempts to read live USDHKD from:

`/studio/api/fx_spot_time_series?ccyPair=USDHKD&startDate=...&endDate=...&frequency=1D00:00:00`

If the endpoint is unavailable, it falls back to `7.8430`.

## Outputs

The dashboard renders:

- Main Summary
- Structured FI
- Illiquid / Repack
- Collar
- Equity TRS
- Reconciliation
- Unified Main Table
- Input Data preview
- QA / Exceptions
- More Info

It also supports exporting the active main summary as `wsg_blotter_main_summary.csv`.

## Core Functionality

- Auto-detects legacy versus cleaned flat workbook structures.
- Normalises both input formats into a shared fact-row model.
- Builds reporting periods from workbook period metadata or trade dates.
- Supports Headline, Raw Rebuild, and Variance modes.
- Includes FX in totals by default, with an ex-FX toggle.
- Converts Equity TRS headline notional using the selected USDHKD override.
- Flags incomplete collar pairings where detectable.
- Preserves workbook source previews for auditability.
- Uses Highcharts for dashboard charts, with graceful fallback if the chart library is unavailable.
- Shows parser notes and QA exceptions for missing dates, unknown product mappings, and pairing issues.

## Verification

Verified locally via `http://127.0.0.1:8765/wsg_blotter_desk_dashboard.html`.

Checks completed:

- Embedded JavaScript syntax check passed with `node --check`.
- Browser startup completed with internal ready marker set to `ready`.
- No browser console errors were reported on initial load.
- Live FX failure path falls back cleanly to USDHKD `7.8430`.
- All tabs render their initial empty-state content before workbook upload.
