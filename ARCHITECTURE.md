# Blotter — Architecture

This document describes what lives in this repository, how the current deliverable is
built, and how its code works internally. It is grounded in what was actually read out
of the files on 2026-07-19 (repo state as of commit `3d09c6c`); anything not directly
observed is flagged as unverified rather than guessed.

## Table of contents

1. [Orientation — which file is current](#1-orientation--which-file-is-current)
2. [Lineage](#2-lineage)
3. [File inventory](#3-file-inventory)
4. [Runtime architecture of the standalone board](#4-runtime-architecture-of-the-standalone-board)
5. [Data model](#5-data-model)
6. [Data ingestion](#6-data-ingestion)
7. [Persistence and backends](#7-persistence-and-backends)
8. [Enterprise integrations](#8-enterprise-integrations)
9. [UI surface](#9-ui-surface)
10. [Derived calculations](#10-derived-calculations)
11. [Known gotchas / footguns](#11-known-gotchas--footguns)
12. [Local development](#12-local-development)

---

## 1. Orientation — which file is current

> **⚠️ Hard constraint: the deliverable is ONE self-contained HTML file.**
> The board is handed around and opened standalone inside the bank, often from `file://` with
> no network. All JS/CSS is inline; all libraries (SheetJS, dc-runtime, React, react-dom) are
> inlined as base64+gzip in the `__bundler/manifest` block — the `unpkg.com` URLs in the file
> are mapping keys to those bundled copies, **not runtime fetches**. Never add a `<script src>`
> to a sibling file, never split the app into modules, never add a CDN or web font. The
> `tools/` directory is **build source only** — nothing shipped references it, and deleting it
> leaves the board working. Firm `/studio/api/...` endpoints are the only real network calls,
> and every one must degrade gracefully. See [`tools/README.md`](tools/README.md).

**[`Blotter Desk (standalone).html`](Blotter%20Desk%20(standalone).html)** is the current,
actively-developed deliverable. It is what the last five commits touched
(`3d09c6c`, `acc22fb`, `7676bd2`, `bdec26d`, `aa772f0`, …). If you're asked to change
"the blotter board," this is the file.

Everything else in the repo is either **reference material that fed the current
deliverable's design/logic**, or **noise**:

| If you're looking for... | Use |
|---|---|
| The live, developed board | [`Blotter Desk (standalone).html`](Blotter%20Desk%20(standalone).html) |
| Two alternative, fully-wired visual designs (not being developed further) | [`export/Blotter Dashboard A (Command Sidebar).html`](export/Blotter%20Dashboard%20A%20(Command%20Sidebar).html), [`export/Blotter Dashboard B (Ribbon Tabs).html`](export/Blotter%20Dashboard%20B%20(Ribbon%20Tabs).html) |
| The oldest full reconstruction (predates the two designs above) | [`wsg_blotter_desk_dashboard.html`](wsg_blotter_desk_dashboard.html) |
| Original photographed source material | `*.HEIC` files, `Blotter plugin/`, `Blotter wiring/` (gitignored/noise) |

## 2. Lineage

The project's history, reconstructed from the markdown notes and file naming:

1. **OCR reconstruction from photos.** ~127 `IMG_5535.HEIC`–`IMG_5662.HEIC` photos (source
   code / screenshots, presumably photographed off a screen since the source system had no
   export) were OCR'd (macOS Vision OCR, per
   [`wsg_blotter_desk_dashboard.md`](wsg_blotter_desk_dashboard.md)) and reconstructed into a
   single dashboard file.
2. **Stitched dashboard** — [`wsg_blotter_desk_dashboard.html`](wsg_blotter_desk_dashboard.html)
   (2113 lines, 106 KB), the first working reconstruction, self-contained, supporting a
   legacy multi-sheet workbook and a "cleaned flat" workbook, with a `makeFactRow` fact
   model.
3. **Two design directions**, in `export/`, both re-wired to the "real" parsing logic
   recovered from the stitched dashboard (per [`export/HANDOFF.md`](export/HANDOFF.md)):
   `Blotter Dashboard A (Command Sidebar)` (dark left-nav) and `Blotter Dashboard B
   (Ribbon Tabs)` (light masthead). These added: revenue-bridge waterfall, `localStorage`
   persistence of the uploaded workbook, URL-hash-based linkable view state, and a ⌘K/Ctrl-K
   command palette. Each still ships with `blotter-data.js`'s **synthetic sample dataset**
   as its default content.
4. **A second, independent OCR source** — 33 photos in `Blotter plugin/`
   (`IMG_6704`–`IMG_6736`) — describes a *different*, already-deployed dashboard variant
   backed by a Workspace SQL API and two Postgres tables (`sales coverage trade store`,
   `sales coverage upload batches`), plus a planned RAG/AI visual sidecar. This is written
   up in [`blotter_plugin_ocr_inventory.md`](blotter_plugin_ocr_inventory.md). It is **not**
   the same integration scheme as either export/ dashboard or the current standalone board
   (see the discrepancy callout in [§7](#7-persistence-and-backends)).
5. **The current standalone board** —
   [`Blotter Desk (standalone).html`](Blotter%20Desk%20(standalone).html) — is a from-scratch
   rebuild (not a copy of the stitched file or the export/ designs) that:
   - ships with **no synthetic sample data** (starts empty; populated only by firm feed or
     operator upload),
   - is deliberately built as a data-only single-page app (no summary-mode toggle, no FX
     override, no command palette, no URL-hash state — those features exist only in the
     export/ designs, see [§9](#9-ui-surface)),
   - is wrapped in an outer "bundler" loader (see [§4](#4-runtime-architecture-of-the-standalone-board)),
   - carries a bolted-on Postgres persistence patch (a **third**, again independent,
     integration scheme — see [§7](#7-persistence-and-backends)),
   - has its own `FIRM.*` REST wiring, distinct from both other integration schemes.
   A third HEIC set, `Blotter wiring/` (`IMG_7049`–, plus `IMG_7108`–`IMG_7123` added most
   recently), is presumably the source for the Postgres persistence patch's "wiring doc,"
   but **no corresponding markdown write-up of that folder exists in the repo** — the patch's
   in-code comments are the only surviving record of what it says.

So there are, in total, **three separate, mutually inconsistent descriptions of "the firm
backend"** floating around this repo (workspace REST API + 2 Postgres tables in the plugin
OCR notes; a different `/studio/api/wsg_blotter/*` REST surface + optional Postgres tables
in the standalone board's own code comments; and the `/studio/api/sql` + 2 *different*
Postgres tables in the standalone board's persistence patch). None of them have been
confirmed against a real backend — every one is explicitly labeled "best-guess placeholder"
in its source comments.

## 3. File inventory

| Path | What it is | Status |
|---|---|---|
| [`Blotter Desk (standalone).html`](Blotter%20Desk%20(standalone).html) | Bundler-wrapped React SPA; the live blotter board | **Current deliverable** |
| [`export/Blotter Dashboard A (Command Sidebar).html`](export/Blotter%20Dashboard%20A%20(Command%20Sidebar).html) | Self-contained wired design direction A (dark sidebar) | Reference (not actively developed) |
| [`export/Blotter Dashboard B (Ribbon Tabs).html`](export/Blotter%20Dashboard%20B%20(Ribbon%20Tabs).html) | Self-contained wired design direction B (light masthead) | Reference (not actively developed) |
| [`export/Blotter Dashboard A (Command Sidebar).dc.html`](export/Blotter%20Dashboard%20A%20(Command%20Sidebar).dc.html) | Design-tool source for A | Reference only — needs a missing `support.js`, will not run standalone |
| [`export/Blotter Dashboard B (Ribbon Tabs).dc.html`](export/Blotter%20Dashboard%20B%20(Ribbon%20Tabs).dc.html) | Design-tool source for B | Reference only — same `support.js` dependency |
| [`export/blotter-data.js`](export/blotter-data.js) | Synthetic sample dataset + shared aggregation math (`bucketSummaryP`, `totalRow`, `headlineRows`, `groupSum`, `monthlySeries`, `periodTrades`, `distinctValues`, formatters) imported by both `.dc.html` sources | Reference |
| [`export/HANDOFF.md`](export/HANDOFF.md) | Authoritative notes on the two export/ designs: controls, persistence, design tokens, how to swap in real data | Reference, accurate as of last read |
| [`wsg_blotter_desk_dashboard.html`](wsg_blotter_desk_dashboard.html) | Earlier OCR-reconstructed "stitched" dashboard (2113 lines) | Reference / superseded |
| [`wsg_blotter_desk_dashboard.md`](wsg_blotter_desk_dashboard.md) | Notes on the stitched dashboard's OCR reconstruction and verification | Reference |
| [`blotter_plugin_ocr_inventory.md`](blotter_plugin_ocr_inventory.md) | OCR inventory of a *different*, already-deployed dashboard variant + a planned RAG/AI sidecar design | Reference — describes a system this repo's code does not implement |
| [`.claude/launch.json`](.claude/launch.json) | Two `python3 -m http.server` dev-server configs | Tooling |
| `README.md` | Placeholder ("# Project-Y") | Noise |
| `*.HEIC` (repo root, `Blotter plugin/`, `Blotter wiring/`) | ~200 photographed source images, OCR input for the above reconstructions | Noise (mostly gitignored — see [`.gitignore`](.gitignore)) |
| `.DS_Store` | macOS Finder metadata | Noise |

## 4. Runtime architecture of the standalone board

`Blotter Desk (standalone).html` is **685 KB but only 217 lines** — nearly all of that
size is one giant JSON-string literal on line 214. The file is a small *bundler* wrapped
around a much larger *inner application*:

```
Blotter Desk (standalone).html
├─ lines 1–204   outer bundler: HTML shell + loading spinner + unpack script
├─ line 206      <script type="__bundler/manifest">  — gzip+base64 asset blobs (React, ReactDOM, the DC runtime, etc.), keyed by UUID
├─ line 210      <script type="__bundler/ext_resources"> — maps CDN URLs (e.g. unpkg React) to those UUIDs
├─ line 214      <script type="__bundler/template"> — a JSON-STRING containing the entire inner app's HTML/JS as literal text
└─ lines 215–217 closing tags
```

Boot sequence, as implemented in the inline `<script>` on lines 36–203:

1. On `DOMContentLoaded`, read the manifest and template `<script>` tags.
2. For every UUID in the manifest, base64-decode the payload, gzip-decompress it if
   flagged (`DecompressionStream('gzip')`), and turn it into either a `data:` URI (for
   fonts — strict-CSP artifact hosts allow `font-src data:` but not `blob:`) or a `Blob` +
   `URL.createObjectURL` (everything else). `window.__resourceBlobs` retains the raw Blobs
   because artifact-host CSP blocks `fetch()` of `blob:` URLs, so downstream consumers read
   the Blob object directly instead.
3. String-replace every UUID occurrence inside the template string with its resolved blob
   URL (this is how the inner app's `<script src="ed7236ee-...">` tags end up pointing at
   real, loadable resources).
4. Strip `integrity=`/`crossorigin=` attributes from the template — blob URLs from a
   `file://` document have a null origin, and `crossorigin` would force a CORS fetch that
   Subresource Integrity would then reject.
5. Parse the resulting HTML string with `DOMParser` and swap the whole
   `document.documentElement` for it (`replaceWith`).
6. Because scripts inserted via `DOMParser`/`replaceWith` are inert per spec, every
   `<script>` in the new document is re-created with `document.createElement('script')`
   (copying its attributes/text) so it actually executes, awaiting `onload` for `src`
   scripts to preserve load order (React → ReactDOM → Babel → `text/babel` app code).
   `text/babel` scripts that still carry a `src` (rather than being fully inlined) are
   read from the resource Blob and inlined, because `transformScriptTags`'s internal XHR
   against a `blob:null/` URL silently fails from a `file://` origin.
7. If Babel Standalone is present, `Babel.transformScriptTags()` is called manually,
   because Babel's own auto-transform-on-`DOMContentLoaded` already fired before the
   document was swapped.

The **inner application**, once decoded, is standard React authored against a template
system referred to internally as "DC" (`<x-dc>`, `<sc-if>` control-flow tags, a
`class Component extends DCLogic { ... render() ... }` pattern, and a `data-props` JSON
schema block declaring editor-configurable props: `density` (comfortable/compact),
`defaultGroupBy` (enum of grouping dimensions), `showQa` (boolean) — this is metadata for
whatever design tool originally authored the component, not something the runtime reads
outside of `this.props`).

### The persistence patch's boot ordering

At the very top of the inner app's first `<script>` (before any of the DC/React app code)
sits a **self-contained, non-invasive IIFE** — the "PERSISTENT TRADE BACKEND PATCH" — that
implements Postgres-backed persistence without touching the board's own code below it
(see [§7](#7-persistence-and-backends) for what it does). Its ordering guarantee:

- It runs synchronously at parse time, *before* `class Component`'s `state =
  this.initState()` runs (because `initState()` reads `localStorage` and this script tag
  appears earlier in the document).
- It kicks off an async `SELECT ... FROM public.blotter_db_records` immediately and, if a
  row comes back, writes its `input_payload.snapshot` fields straight into the board's own
  `localStorage` keys **before** setting a `suppressSave` flag back to false. Because
  there's no guaranteed-synchronous DB transport, this is "hydrate before boot" on a
  best-effort basis: it wins the race in practice because gunzip-decompressing and
  Babel-transforming the ~157 KB inner app (§4 steps above) is real work that takes longer
  than the DB round trip usually does — but this is explicitly not guaranteed.
- A `hydrationSettled` flag (set either when the hydration promise settles, or by an 8
  second failsafe `setTimeout`) gates all outbound writes, so a slow-but-successful
  hydration can't be clobbered by the board's own boot-time renders writing stale/empty
  data back to Postgres.
- After hydration settles, `Storage.prototype.setItem/removeItem/clear` are monkey-patched
  (once, globally) to detect writes to the board's four watched keys and schedule a 450ms
  debounced `saveSnapshot()`, which upserts the full JSON snapshot into
  `blotter_db_records` and bulk-upserts/soft-deletes individual trades into
  `blotter_db_trade_rows`.

This is structured as a wrapper specifically so that if the DB transport guess is wrong
(see [§7](#7-persistence-and-backends)), every `runSql()` call fails silently and the board
falls back to exactly its pre-patch behavior (local-cache-only, or its own independent
`FIRM.*` REST calls) — "this patch is pure upside, never a failure point," per its own
comment.

## 5. Data model

The canonical trade "fact row" in the standalone board, produced by `deriveTrade(m)`
(inner app, "helpers" section):

| Field | Source | Notes |
|---|---|---|
| `id` | `trade_id` | Falls back to `''`; rows without an id are dropped during ingest |
| `date` | `trade_date`, normalized via `normDate()` | ISO `YYYY-MM-DD`; anything parseable by `new Date()` is accepted |
| `year`, `monthN` | derived from `date` | For YoY comparisons and monthly series |
| `pc_usd`, `va_gnbv_usd`, `primary_amount`, `tv_usd`, `price` | numeric fields, coerced via `num()` | `num()` strips `$`, `,`, spaces before parsing |
| `bankRev` | `pc_usd + va_gnbv_usd` | "Estimated bank revenue" — see [§10](#10-derived-calculations) |
| `volumeUsd` | `tv_usd \|\| primary_amount` | Volume proxy |
| `assetClass` | derived via `assetClassOf()` from `tier1_product_type`/`tier2_product_type` | Buckets: Equities, FX, Credit, Rates & FI, or the raw tier1 value if none of those match |
| `tenorBucket` | derived via `tenorBucket()` from `maturity_date` vs. the hardcoded `REPORT` date (`'2026-07-14'`) | Buckets: Past due, ≤2W, ≤3M, ≤1Y, ≤3Y, >3Y, Unknown |
| `book` | `book \|\| risk_book` | |
| everything else | passed through verbatim from the mapped source row (`legal_entity`, `salesperson_coverage`, `sales_client`, `primary_ccy`, `treats_acronym`, `security`, `issuer`, `isin_code`, `buy_sell`, `platform`, `tfx_flag`, `trader`, …) | |

### Dedup rule

`dedupKey(t) = String(t.trade_id || t.id || '').trim().toUpperCase()`.

**Uniqueness is Trade ID alone** — case/whitespace-insensitive exact match. Any row whose
Trade ID already exists anywhere in the store (a prior upload, the firm feed, or earlier in
the *same* incoming batch) is skipped and never double-counted. This is stated repeatedly
and explicitly in the code (`ingest()`, `syncFromFirm()`, the persistence patch's own
`normTradeId()`, and the in-app knowledge-base entry `kb-dup`).

> **Discrepancy:** [`blotter_plugin_ocr_inventory.md`](blotter_plugin_ocr_inventory.md)
> (a different, OCR'd system) states the dedup key is **Trade ID + Trade Date + Primary
> Amount**. That is not what the standalone board's code does. Per the project's own
> standing instruction, the code wins — Trade ID alone is authoritative for
> `Blotter Desk (standalone).html`.

### Batches vs. history

Two distinct, differently-scoped lists live in state/`localStorage`:

- **`batches`** (`wsg_blotter_v5_batches`) describes only the batches making up the
  *current* dataset. `onClear()` empties it.
- **`history`** (`wsg_blotter_v5_history`) is an **append-only audit log** — every ingest,
  sync, and clear event is pushed onto it (`pushHistory()`), capped at the most recent 200
  entries (`.slice(-200)`), and it **survives** `onClear()`. It's rendered in the "Golden
  record" tab as the upload-history table.

## 6. Data ingestion

### Formats accepted

- `.xlsx`/`.xls` via `window.XLSX` (SheetJS, CDN-loaded — see [§8](#8-enterprise-integrations)):
  first sheet is read to an array-of-arrays (`sheet_to_json({header:1})`), re-serialized to
  CSV text, then run through the same delimited-text parser as everything else.
  If `window.XLSX` failed to load, the board shows a warning banner asking the user to
  paste CSV/TSV instead — it does not attempt any other workbook reader.
- Any other file extension, or pasted text: read as plain text and run through
  `parseDelimited()`.
- `parseDelimited()` auto-detects tab vs. comma delimiter by comparing split counts on the
  first line, hand-parses quoted fields (`"..."` with `""` escaping), and maps headers
  through `mapHeader()`.

Note: **the standalone board's own parser does not distinguish "legacy multi-sheet" vs.
"cleaned flat" workbook layouts** — that auto-detection logic (`parseLegacyWorkbook` vs. a
cleaned-flat parser) exists only in the stitched dashboard
([`wsg_blotter_desk_dashboard.html`](wsg_blotter_desk_dashboard.html)) and the two `export/`
designs. The standalone board expects a single flat table (first sheet, or pasted
delimited text) with the header aliases below; it has no concept of legacy sheet names
like "Structured Rate + Credit" or "Equity TRS Summary."

### Header mapping (`ALIASES`)

`mapHeader(h)` lowercases and strips non-alphanumerics from each source header, then looks
it up in a fixed alias table. Representative entries (full table is at inner app lines
1195–1220):

| Canonical field | Recognized header aliases |
|---|---|
| `trade_id` | Trade ID, Reference, Ref, Deal ID, Trade Ref |
| `trade_date` | Trade Date, Date, T Date, Deal Date |
| `salesperson_coverage` | Salesperson Coverage, Salesperson, Coverage, Sales |
| `legal_entity` | Legal Entity, Entity, LE |
| `tier1_product_type` | Tier 1 Product Type, Tier 1, Product Type, Asset Class |
| `tier2_product_type` | Tier 2 Product Type, Tier 2, Sub Product |
| `primary_ccy` | Primary CCY, CCY, Currency, CCY1 |
| `primary_amount` | Primary Amount, Notional, Amount, Notional Amount, Qty |
| `price` | Price, Reoffer, Reoffer Price, Px, Dealt Price |
| `pc_usd` | PC USD, PC, PCode USD |
| `va_gnbv_usd` | VA GNBV USD, GNBV, VA, VA GNBV |
| `tv_usd` | TV USD, Volume, Volume USD, Trade Value |
| `maturity_date` | Maturity Date, Maturity |
| `tfx_flag` | TFX Flag, TFX |
| `buy_sell` | Buy Sell, Side, Direction |
| `security` / `underlying` / `instrument` / `description` | all map to `security` |
| `isin_code` | ISIN Code, ISIN |
| `sales_client` | Sales Client, Client, Counterparty, Customer |
| `book` / `risk_book` / `trader` | Book, Risk Book, Trader |
| `treats_acronym` | TREATs Acronym, TREATs |

The plugin OCR inventory ([`blotter_plugin_ocr_inventory.md`](blotter_plugin_ocr_inventory.md))
independently lists a compatible-but-not-identical set of "required"/"optional" fields
(`site_code`, `sales_client_sector`, `commission_code`, `flow_value`, `liquidity_reserve`,
`cva`, `fva`, `btb_trade_site`, etc.) that do **not** appear in the standalone board's
`ALIASES` table — the board will pass those columns through unmapped (lowercased,
punctuation-stripped) rather than rejecting them, since `deriveTrade()` spreads the whole
mapped row (`Object.assign({}, m, {...})`) rather than allow-listing fields.

There is **no comment-token metadata parsing** (`source_action`, `pc_source`, etc.) in the
standalone board — that feature exists only in the stitched dashboard and the export/
designs, per their notes; the standalone board treats `comment` (if present) as an opaque
passthrough field.

### Normalization → QA

`ingest(records, filename, source)`:
1. Maps every record through `deriveTrade()`, drops rows with no `id`.
2. Dedupes against the existing store *and* within the incoming batch (see [§5](#5-data-model)).
3. If nothing new landed, shows a warning banner and pushes a `history` entry with
   `added: 0` — no batch record is created.
4. Otherwise appends the batch to `batches`, `setState`s optimistically, writes the
   `localStorage` cache (`cacheWrite()`), pushes a `history` entry, and fires
   `serverIngest()` (POST to the firm backend — see [§7](#7-persistence-and-backends)).

QA/exception generation (`renderVals()`, "QA" section) runs over **all** stored trades on
every render (not just the current filter view) and flags:
- missing `trade_date` (`WARN`, type `missing_date`),
- `maturity_date` earlier than `trade_date` (`WARN`, type `maturity`),
- negative `primary_amount` (`WARN`, type `neg`).

If fewer than 3 issues are found, a synthetic `INFO`-severity FX-conversion note
("Equity TRS notionals converted to USD at 7.8412...") is appended so the panel is never
empty. The QA panel is only shown if `props.showQa !== false` (defaults to shown).

## 7. Persistence and backends

The standalone board layers **two independent, non-interacting persistence paths**:

### A. The board's own `FIRM.*` REST wiring (inner app, `FIRM` object)

| Key | Method / URL | Purpose |
|---|---|---|
| `workspaceUrl` | GET/DELETE `/studio/api/wsg_blotter/workspace` | GET returns `{ source, loaded_at, trades, batches, state, meta }` — authoritative full workspace load. DELETE with `{mode:'all'|'trades_only'|'state_only'}` clears it. |
| `ingestUrl` | POST `/studio/api/wsg_blotter/ingest` | `{ filename, source_type, report_date, rows }` → server normalizes/derives/dedups against its own DB constraint, returns `{ batch, summary, errors, meta }`. |
| `syncUrl` | POST `/studio/api/wsg_blotter/sync` | `{ report_date }` → server pulls the live firm feed itself and persists it; response includes `{ sync: {...}, batch }`. |
| `stateUrl` | PUT `/studio/api/wsg_blotter/state` | Persists filters/tab/date-range (debounced 600ms via `saveUiState()`). |
| `tradesUrl` (legacy) | GET `/studio/api/wsg_blotter/trades` | Direct feed pull, used only when `syncUrl`/`workspaceUrl` are unreachable. |
| `tradesSaveUrl` (legacy) | POST `/studio/api/wsg_blotter/trades/upsert` | Fallback side-write when `ingestUrl` isn't deployed. |
| `aiUrl` | POST `/studio/api/llm/complete` | Copilot completion — see below. |

All requests use `credentials:'include'` (same-origin session cookie assumed) and a 12s
timeout. Every write is fire-and-forget (`firmPost`) or throws-to-caller-for-fallback
(`firmSend`); none ever block the UI. `firmGet` specifically detects a same-origin SSO
redirect (a `200` response with an HTML login page instead of JSON) and treats it as
"unreachable" rather than crashing on `JSON.parse`.

Fallback chain on load: `loadWorkspace()` (GET `/workspace`) → on failure,
`syncFromFirm({viaLoad:true})` (POST `/sync`, then legacy GET `/trades`) → on failure, stay
on whatever `initState()` already painted from `localStorage` → if that's empty too, the
board shows its empty/onboarding state. **No sample data is ever substituted at any point
in this chain** (the `genSample` generator referenced in a stray `// ---------- sample
data ----------` comment header no longer exists in the code below it).

### B. The bolted-on Postgres "PERSISTENT TRADE BACKEND PATCH" (see [§4](#4-runtime-architecture-of-the-standalone-board))

This is a **second, separate** persistence scheme, layered on top of (A) without knowledge
of it — it only watches the board's `localStorage` keys, it does not know about `FIRM.*`.

Tables used:
- **`public.blotter_db_records`** — one row per board/workspace
  (`id` = `RECORD_ID`, taken from `?recordId=` in the URL, default `2`). The **full JSON
  snapshot** (`trades`, `batches`, `history`, `filters`) lives in
  `input_payload.snapshot`; this table is the row-level upsert target and the source of
  truth for UI restore.
- **`public.blotter_db_trade_rows`** — a trade-ID-keyed mirror, one row per trade,
  upserted in bulk via `UNNEST(...)`, conflict key `(record_id, normalized_trade_id)`.
  Trades no longer present in a save are soft-deleted (`is_deleted=true`), not hard-deleted.

Tables **deliberately not used**, per the patch's own comment:
- `public.blotter_db_snapshots` — "would duplicate `input_payload`" (per "wiring doc §5").
- `public.blotter_db_batches`, `public.blotter_db_history` — optional; batches/history
  already live inside `blotter_db_records.input_payload.snapshot` (per "wiring doc §9"),
  so a separate table is redundant.

Transport is a **guess with three fallback candidates**, tried in order and never thrown
into the caller: `window.studio.query()`, `window.studio.db.query()`,
`window.Studio.query()` (whichever SDK global the hosting "Studio" shared-html frame might
inject), then a REST fallback (`POST /studio/api/sql` with `{sql, params}` → `{rows}`).

> **Discrepancy:** this is a *third*, independent description of the backend, distinct
> from both the board's own `FIRM.*` REST surface above and the
> `sales coverage trade store` / `sales coverage upload batches` tables described in
> [`blotter_plugin_ocr_inventory.md`](blotter_plugin_ocr_inventory.md) (which also names a
> different endpoint, `/studio/api/database/workspace/sql`). None of the three have been
> reconciled or confirmed against a real deployment; each is explicitly labeled
> best-guess/placeholder in its own source comments.

### `localStorage` keys

All defined in `LS` (inner app) and mirrored in the persistence patch's `LS_KEYS`:

| Key | Contents |
|---|---|
| `wsg_blotter_v5_trades` | Full array of derived trade rows |
| `wsg_blotter_v5_batches` | Batches describing the current dataset |
| `wsg_blotter_v5_filters` | Current filter/UI state |
| `wsg_blotter_v5_history` | Append-only audit log (survives clear) |
| `wsg_blotter_v5_theme` | Theme preference: `light` \| `dark` \| `system` (see [§9](#9-ui-surface)) |

Per the in-code "FIRM INTEGRATION — REVIEW CHECKLIST" (section E), `localStorage` is
explicitly a **cache only** — for instant first paint and off-network use — never the
system of record whenever either backend (A or B) is reachable.

## 8. Enterprise integrations

| Integration | Where | Purpose | Fallback behavior |
|---|---|---|---|
| React 18.3.1 / ReactDOM (unpkg) | Bundled into the manifest at build time (UUID-keyed blobs) | UI runtime | N/A — baked into the file, not a live CDN dependency at runtime |
| `window.XLSX` (SheetJS, `cdn.jsdelivr.net`) | `onFile()` | Parses `.xlsx`/`.xls` uploads | If absent, shows a banner asking the user to paste CSV/TSV instead |
| `/studio/api/wsg_blotter/*` (workspace/ingest/sync/state/trades/upsert) | `FIRM` object | Primary trade data + UI-state persistence | Falls through the chain in [§7](#7-persistence-and-backends)A; ultimately falls back to local cache, then empty |
| `/studio/api/llm/complete` | `llmComplete()` | Copilot: automatic insight cards (`runAi`) and free-text chart generator (`runCustomViz`) | Falls back to `window.claude.complete` (Anthropic artifact runtime), then to a **deterministic local generator** (`localInsights()` / `localCustomViz()`) so both features work fully offline |
| `/studio/api/sql` (or `window.studio(.db)?.query`) | Persistence patch | Postgres-backed workspace snapshot | Every call is wrapped in `.catch(()=>{})`; total failure is silently absorbed, board behaves exactly as without the patch |

The export/ dashboards (A/B) additionally reference, per
[`export/HANDOFF.md`](export/HANDOFF.md) and confirmed in their source:
- `/studio/api/fx_spot_time_series?ccyPair=USDHKD&...` — live USDHKD rate, falls back to a
  hardcoded `7.8430` (`LIVE_FX_FALLBACK`), status pill shows live vs. fallback, click to
  refresh.
- `/studio/static/ui/hsbc_icon.ico` — brand favicon/icon; falls back to a placeholder red
  diamond `<div>` when the asset 404s or is offline.
- `unpkg.com/highcharts@11.4.8` (+ `highcharts-more.js`, `heatmap.js`, `accessibility.js`)
  — chart rendering; panels show a fallback note when the CDN is unreachable.

**The standalone board does not reference Highcharts, the HSBC icon, or the FX endpoint at
all** — those integrations exist only in the export/ designs and the older stitched
dashboard, not in the current deliverable. (Verified by `grep` across the decoded inner
app; no matches for `highcharts`, `hsbc_icon`, or `fx_spot_time_series`.)

## 9. UI surface

### Theming (light / dark)

The board ships with both a light and a dark theme. Every colour resolves through a CSS
custom property — there are **no bare hex literals left** in the inner template's markup
or component logic (the only deliberate exception is the revenue heat-map's dynamic
`rgba(215,20,26,${alpha})`, which is computed per cell).

- **Token definitions** live in the inner template's single `<style>` block: `:root`
  carries the light palette (the board's original colours, unchanged), and
  `:root[data-theme="dark"]` overrides it. A `@media (prefers-color-scheme:dark)` block
  scoped to `:root:not([data-theme="light"]):not([data-theme="dark"])` covers the no-JS
  case, so an explicit choice always wins.
- **Boot order**: a small `THEME BOOT` IIFE at the top of `<head>` stamps
  `data-theme` on `<html>` *before first paint*, so there is no flash of the wrong theme.
  It owns persistence and exposes `window.__blotterTheme` (`get` / `resolved` / `set`).
- **The toggle** sits in the top bar and cycles **Light → Dark → Auto**. `Auto` follows
  the OS live via a `matchMedia` change listener. The component mirrors the preference in
  `state.themePref` purely so the button's label re-renders (`themeMeta()`).
- **The top bar is dark in both themes** — it was already dark in the original design, so
  dark mode deepens it rather than inverting it. That is why there is a separate family of
  `--chrome-*` tokens that do not flip.
- Tokens whose meaning inverts get dedicated pairs rather than being derived: the active
  tab pill (`--tab-active-bg` / `--tab-active-fg`) and the quiet secondary button
  (`--btn-quiet-bg`). Brand *fills* stay brand-accurate (`--brand`, always `#d7141a`)
  while brand *text* uses `--brand-text`, which lifts to `#ff7c82` on dark so the Trade ID
  and Buy/Sell columns stay legible.
- **The theme flip is intentionally instant.** A CSS transition on colour/background —
  whether scoped to `body` or `body *` — left `var()`-driven inline colours stuck at their
  previous value after a flip (the element kept its old computed colour while the custom
  property had already updated). The stylesheet carries a comment saying so; don't
  reintroduce one.

Verified in-browser at 140 imported trades: the toggle cycles and persists across reload,
and a WCAG contrast sweep of every text node shows no invisible text in either theme. The
handful of sub-4.5:1 pairs that remain are the original design's muted greys, which score
the same or worse in the untouched light theme.

### Desk-usability features

Added on top of the original board; none of them alter any calculation.

| Feature | Notes |
|---|---|
| **Export CSV** (trade blotter header) | Exports **every row matching the active filters**, not the 60 the table displays, and writes **raw unformatted numbers** (`19314738.04`, not `$19.3m`) unquoted so Excel types them numerically. Follows the active column sort. |
| **Sortable blotter columns** | Click a header to sort, click again to flip; ▲/▼ marks the active column. Comparator is derived from the column definitions (numeric / date / `localeCompare`), blanks last. Default remains date-descending. Sort is per-session view state, not persisted. The 60-row display cap and the set of included rows are unchanged — only ordering. |
| **Sticky blotter header** | The table scrolls inside its own `.blotter-scroll` container (`max-height:70vh`) so headers stay visible without fighting the sticky top bar (`z-index:20`). |
| **Density toggle** (top bar) | Comfortable / Compact, persisted to `wsg_blotter_v5_density`. Drives the pre-existing `cellPad`; the original `density` prop remains the default. |
| **Print stylesheet** | See the gotcha in [§11](#11-known-gotchas--footguns). |
| **KPI tooltips** | `title` + `aria-label` on each KPI card, worded from the board's own "Metric definitions" section. |
| **Keyboard focus rings** | `:focus-visible` outline in `var(--brand)` on buttons, inputs, selects and sortable headers (`:focus-visible`, so mouse clicks don't show rings). |

Visuals added for granularity: **Revenue by coverage** (salesperson leaderboard — first mini panel) and **Product mix · Tier 1 → Tier 2**, both built from the existing `aggBy()` helper over the same filtered array the other panels use. The secondary-breakdown grid is `repeat(auto-fit,minmax(300px,1fr))` so panel rows reflow rather than stranding a lone panel.

### Standalone board (current deliverable)

- **Tabs**: `Overview`, one dynamically-generated tab per distinct `assetClass` present in
  the loaded data, `Golden record` (full deduped trade table + upload-history audit log),
  `More info`.
- **Controls**: date-from/date-to filters, three quick presets (Weekly / Monthly / YTD via
  `preset()`), asset-class filter, entity filter, coverage filter, free-text search
  (matches id/security/client/entity/book/trader), group-by dimension selector (9 options:
  asset class, tier1/tier2 product, legal entity, currency, client, tenor bucket, TREATs
  acronym, book), "Reset filters."
- **Visuals** (Overview / per-asset-class detail tabs): KPI row (Total volume, PC,
  VA/GNBV, Avg reoffer, Tickets, Upload batches — each with YoY delta), group-by revenue
  breakdown bars, asset-class composition donut-style list, monthly revenue bars, three
  mini-panels (volume by currency, revenue by tenor, revenue by client), a cumulative
  revenue trend (div-based columns, not SVG — see [§11](#11-known-gotchas--footguns)),
  a reoffer-price histogram (6 bins, near-par highlighted), a Buy/Sell flow balance panel,
  a top-underlyings panel, a PC-vs-VA/GNBV stacked split by asset class, and a legal-entity
  × tier-1-product revenue heatmap-style matrix.
- **Custom/free-text visual generator**: a text box (`onCustomVizQuery`/`runCustomViz`) —
  type a request like "revenue by client this year" or "top 5 currencies by volume," and it
  produces a real chart from the current filtered rows. Tries the LLM first (asks for a
  strict JSON chart spec: `title, metric, group_by, top_n, caption`); on any failure falls
  back to `localCustomViz()`, a deterministic keyword matcher (regexes for client/currency/
  tenor/tier/entity/book/TREATs/asset-class keywords, `top N` extraction) that always
  produces *some* chart. Generated items stack (most recent first, capped at 6),
  individually removable.
- **AI insight cards** (`runAi`): automatically-triggerable copilot pass over the current
  filtered aggregates, grounded via a tiny in-app knowledge base (`KB`, 8 entries covering
  revenue methodology, dedup rule, product taxonomy, tenor risk, reoffer-price convention,
  client-coverage concentration, TFX classification, data-quality policy) retrieved by
  simple tag-overlap scoring (`retrieve()`). Returns a headline, up to 4 summary bullets,
  up to 4 toned floating cards (positive/watch/risk/neutral), up to 3 recommended visuals,
  and up to 4 one-click filter suggestions (`applyAiFilter`).
- **Upload / ingest**: sidebar upload toggle exposing file upload and a paste-CSV/TSV
  textarea; "Sync from firm feed" button; "Clear all data" (clears trades/batches, not
  history, not filters).

**Not present in the standalone board** (present only in export/A and export/B, per
[`export/HANDOFF.md`](export/HANDOFF.md) and direct source inspection): a Headline / Raw
Rebuild / Variance summary-mode toggle, a TRS FX source/override control, an incl/ex-FX
total policy toggle, a ⌘K/Ctrl-K command palette, copy-link/URL-hash view state, a
period-comparison side-by-side table, CSV export, and print-mode styling. If asked to add
any of those to the current board, treat it as new work, not a restoration of something
that regressed — it never existed in this file.

### Export/ designs A and B (reference)

Per [`export/HANDOFF.md`](export/HANDOFF.md), both ship: 6 built-in period cuts (YTD/Q1/Q2
× 2026/2025, each compared to the same window a year prior), a Headline / Raw Rebuild /
Variance summary mode, a live-vs-manual-override TRS FX source control, an always-visible
incl/ex-FX total policy toggle applying to every KPI and total, a filters bar (asset
class/book/trader/action) driving the Main Summary + 4 asset-class detail tabs + Unified
Main Table simultaneously, global trade search, a revenue-bridge waterfall (needs
`highcharts-more.js`), full view-state persistence to `localStorage` (including the raw
uploaded workbook bytes, ≤3.5MB, re-parsed on load so parser fixes apply retroactively),
URL-hash-based linkable views with a "Copy link" button, and the ⌘K/Ctrl-K command palette
(jump to tab/period, switch mode/policy, filter by book, reset filters, export CSV, print,
find-a-trade-and-jump). Direction A additionally has a period-comparison side-by-side
table.

## 10. Derived calculations

### Estimated bank revenue

`bankRev = pc_usd + va_gnbv_usd` (standalone board, `deriveTrade()`). This is stated as the
methodology in `KB[0]` ("Revenue methodology") and used everywhere revenue is aggregated
(`aggBy()` sums `t.bankRev`).

The plugin OCR notes describe this as *configurable* (PC+VA/GNBV default, with PC-only and
VA/GNBV-only modes available) — the standalone board's code has **no such toggle**; it is
hardcoded to the sum.

### Volume proxy

`volumeUsd = tv_usd || primary_amount` — `tv_usd` wins if non-zero/truthy, otherwise falls
back to `primary_amount`. Matches the plugin OCR notes exactly.

### Tenor bucketing

`(maturity_date - REPORT_DATE) / 86400000` days, bucketed: `< 0` → Past due; `≤14` → ≤2W;
`≤90` → ≤3M; `≤365` → ≤1Y; `≤1095` → ≤3Y; else `>3Y`. No `maturity_date` → Unknown.
`REPORT_DATE` is the hardcoded literal `'2026-07-14'` (`this.REPORT`), **not** `today` or
any dynamic firm business date — the in-code review checklist flags this explicitly as an
open question ("Should this be today / the firm business date?").

### Asset class

`assetClassOf()`: tier1 contains "equity" → Equities; tier1 or tier2 contains "fx" → FX;
tier1 or tier2 contains "credit" → Credit; tier1/tier2 contains "rate"/"structured fi"/
"rates" → Rates & FI; otherwise falls through to the raw `tier1_product_type` string (or
"Unclassified" if empty).

### YoY comparison

`workingFilter()` returns the current filters (or filters pinned to the active tab's asset
class, if on a detail tab). The "prior" window (`prv`) is computed by shifting both
`dateFrom`/`dateTo` back exactly one calendar year (`shiftYear(dstr, -1)` — string-level
year decrement, not a `Date` object shift) and re-scoping the same trade set. Every KPI and
group-by row computes `dl(cur, prv) = (cur - prv) / abs(prv)` as its delta, formatted via
`fmtPct()` (signed percentage) and colored green/red via `pctColor()`.

### Revenue bridge / waterfall

**Not implemented in the standalone board.** This exists only in the export/ designs A and
B, per [`export/HANDOFF.md`](export/HANDOFF.md): "full-width waterfall on the overview:
prior-period total → per-bucket MSS revenue deltas → current total," respecting the
incl/ex-FX policy, requiring `highcharts-more.js`.

### FX conversion (export/ designs only)

In `blotter-data.js` (the sample dataset shared by the `.dc.html` sources):
`headlineNotional(t, fx)` returns `t.notionalLocal / fx` for `Equity TRS` trades whose
`action === 'New'` (else `t.notionalUsd`), where `fx` is either the live USDHKD rate or
the manual override. `totalRow(rows, includeFx)` sums all buckets when `includeFx` is
true, or every bucket except `'FX'` when false — this is the incl/ex-FX total policy.
`headlineRows()` adds small curated deltas (`HEADLINE_DELTA`) on top of the rebuilt
numbers to simulate the gap between a "headline" (curated) figure and a "raw rebuild"
figure, which is what the Variance mode displays.

## 11. Known gotchas / footguns

- **Re-bundling the standalone file.** The JSON-string template line is **not** at a fixed
  line number — it happened to be line 214 in the version inspected here, but any future
  edit to the outer bundler script or manifest could shift it. **Always locate it
  dynamically** (e.g. by finding the `<script type="__bundler/template">` tag and reading
  the next line, or by grepping for the longest line in the file) rather than hardcoding a
  line index. When re-serializing the inner HTML back into that JSON string, any literal
  `</script>` (or more generally `</` sequences that could close a tag early inside inline
  `<script>` content) must be escaped — the file's own `resourceScript` injection code
  demonstrates this exact pattern (`JSON.stringify(...).replace(/<\//g, '<\\/')`).
- **Printing and the blotter scroll container.** The trade table lives in a
  `.blotter-scroll` container capped at `max-height:70vh` so its header can stick. A
  scroll container **clips when printed** — before this was handled, a 1440×900 laptop
  printed only 18 of 61 rows and silently dropped the rest. The `@media print` block now
  un-clips it (`max-height:none; overflow:visible`), sets `sc-raw-thead` to
  `display:table-header-group` so column headers repeat on every page, and forces the
  sticky cells to `position:static`. **If you add any other scrolling or height-capped
  container, add the matching print rule**, and verify at a realistic viewport — the bug
  is invisible on a tall screen where the content happens to fit.
- **Verify print rules against the DOM, not just the CSS.** A `@media print` rule whose
  selector matches nothing is the easy failure here. Check both that the rule exists in
  `document.styleSheets` *and* that `document.querySelectorAll('<selector>').length > 0`.
  To prove the *effect* without a print preview, apply the rule's declarations to the
  element and measure (`scrollHeight === clientHeight` means nothing is clipped).
- **Adding colours to the board.** Use an existing CSS custom property, or add a token to
  *all three* theme blocks (`:root`, `:root[data-theme="dark"]`, and the
  `prefers-color-scheme` fallback). A raw hex literal will not respond to the theme and
  will look correct in exactly one of the two modes. Note that colours are also emitted
  from the component logic (JS objects like the status/tab/column colour maps), not just
  the markup — those need `var(--token)` strings too.
- **The polish layer matches on literal inline-style strings.** Rules like
  `div[style*="border:1px solid var(--line)"]` in the `<style>` block key off the exact
  text of the markup's `style` attribute. If you rename a token or change that inline
  declaration's spelling, the card elevation/hover styling silently stops applying.
- **The `.dc.html` files do not run standalone.** Both `export/*.dc.html` files load
  `<script src="./support.js"></script>` as their first line, and no `support.js` ships in
  this export — attempting to open them directly (e.g. via `file://` or the `blotter-static`
  dev server) will fail silently or render nothing. Use the paired `.html` files instead;
  they're fully self-contained.
- **CDN-offline degradation** is handled per-integration but not uniformly: SheetJS absence
  degrades to "please paste CSV instead" (upload is blocked); Highcharts absence (export/
  designs) shows an inline fallback note per chart panel; the standalone board's LLM calls
  degrade through three tiers before finally using a fully-local generator that never fails.
  There is no single "offline mode" flag — each integration has its own bespoke fallback.
- **The duplicate-sheet-name double-count bug** (already fixed, not present in current
  code): per [`export/HANDOFF.md`](export/HANDOFF.md), `parseLegacyWorkbook`'s structured-
  sheet list originally carried two spelling variants that canonicalized to the same sheet
  name, causing Structured FI rows to be counted twice. The fix (dedupe by canonical sheet
  name) was ported into both export/ designs and the stitched reference file. This bug
  class is specific to the legacy multi-sheet parser, which — per [§6](#6-data-ingestion) —
  **does not exist in the standalone board at all** (it has no legacy-sheet auto-detection),
  so it cannot recur there, but would be worth checking if legacy-sheet parsing is ever
  ported into the standalone board.
- **`REPORT` date is hardcoded** (`'2026-07-14'`) in the standalone board, driving every
  tenor bucket and the default YTD filter range. This is explicitly flagged as unresolved
  in the in-code "FIRM INTEGRATION — REVIEW CHECKLIST." It will silently go stale.
- **Three inconsistent backend descriptions coexist in this repo** (see the discrepancy
  callouts in [§2](#2-lineage) and [§7](#7-persistence-and-backends)). Do not assume any one
  of them reflects what a real deployment will actually expose; all are labeled
  best-guess/placeholder in their own source.
- **`RECORD_ID` defaults to `2`** ("an existing test record, per the wiring doc") when no
  `?recordId=` URL parameter is present. Any local testing of the persistence patch against
  a real Postgres backend will silently target record 2 unless the URL is parameterized.
- **`llmComplete()`'s `ctx` argument controls fallback shape**, not just data: `runAi`
  passes `ctx` and gets `localInsights(ctx)` on total LLM failure; `runCustomViz`
  deliberately omits `ctx` so that on failure `llmComplete` throws (rather than returning
  the wrong-shaped insight-card JSON), letting `runCustomViz`'s own catch block run its own
  `localCustomViz()` fallback instead. Do not "clean up" this asymmetry without preserving
  the behavior — it's intentional (documented inline at the call site).
- **The blank-page SVG crash** (fixed in commit `aa772f0`, "Fix blank-page crash: replace
  SVG cumulative chart with div columns") is why the cumulative revenue trend renders as
  `div`-based bars rather than an SVG chart — worth knowing before reintroducing SVG
  rendering into that panel.

## 12. Local development

[`.claude/launch.json`](.claude/launch.json) defines two static file servers (no build
step for any file in this repo — everything is either already self-contained HTML or plain
JS/MD):

| Config name | Command | Port | Serves |
|---|---|---|---|
| `blotter-root` | `python3 -m http.server 8898 --directory /Users/nigelli/Desktop/Blotter` | 8898 | Repo root — use for `Blotter Desk (standalone).html` and `wsg_blotter_desk_dashboard.html` |
| `blotter-static` | `python3 -m http.server 8899 --directory /Users/nigelli/Desktop/Blotter/export` | 8899 | `export/` — use for `export/Blotter Dashboard A (Command Sidebar).html` and `export/Blotter Dashboard B (Ribbon Tabs).html` |

Practically:
- `Blotter Desk (standalone).html`, `wsg_blotter_desk_dashboard.html`, and both
  `export/*.html` (non-`.dc`) files can all also be opened directly via `file://` in a
  browser — they are fully self-contained and designed to degrade gracefully off-network
  (per [§8](#8-enterprise-integrations)). Serving over `http://localhost` is only needed if
  testing same-origin `fetch()` behavior against a real backend, or to avoid `file://`-origin
  quirks (e.g. `DecompressionStream` availability, `blob:` URL restrictions) during the
  standalone board's bundler unpack step.
- `export/*.dc.html` files will **not** run in either mode — see
  [§11](#11-known-gotchas--footguns).
- There is no `package.json`, no `node_modules` (gitignored preemptively), and no test
  suite anywhere in this repo — verification, per
  [`wsg_blotter_desk_dashboard.md`](wsg_blotter_desk_dashboard.md), has historically been
  manual (`node --check` for JS syntax, opening in a browser, checking the console for
  errors).
