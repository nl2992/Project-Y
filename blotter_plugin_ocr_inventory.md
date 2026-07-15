# Blotter Plugin OCR Inventory

Generated: 2026-07-14

Source folder: `Blotter plugin/`

Source images OCR'd:

- `IMG_6704.HEIC` through `IMG_6736.HEIC`
- 33 total HEIC images
- All source images were photographed text/screenshots and were left unchanged.

Method:

- OCR was run locally using macOS Vision OCR.
- The raw OCR was cleaned into this structured inventory.
- Obvious OCR slips were normalized where the intended dashboard term was clear.
- No plugin image files were edited.

## High-Level Summary

The blotter dashboard described in these images is currently a database-backed blotter analytics dashboard, not a live market-data dashboard.

The dashboard is driven by uploaded or pasted blotter data plus stored workspace database records. It renders KPI cards, filters, tables, charts, creator-only governance tools, and data-quality panels. A later set of notes describes adding a RAG/AI sidecar that recommends immediate floating visuals using strict JSON, while keeping chart rendering inside the dashboard.

## Source Image Map

- `IMG_6704.HEIC`: Firm/system connections, database tables, UI assets, local storage.
- `IMG_6705.HEIC`: Non-connected systems, expected input formats, required fields.
- `IMG_6706.HEIC`: Optional input fields.
- `IMG_6707.HEIC`: Derived calculations and data-quality logic.
- `IMG_6708.HEIC`: Duplicate logic and first part of current dashboard visuals.
- `IMG_6709.HEIC`: Explorer tabs, filters, overview, commentary.
- `IMG_6710.HEIC` to `IMG_6713.HEIC`: Aggregate charts, summary tables, product analysis, TFX analysis, maturity analysis.
- `IMG_6714.HEIC` to `IMG_6716.HEIC`: Creator governance visuals and summary inventory.
- `IMG_6717.HEIC` to `IMG_6736.HEIC`: RAG/AI visual sidecar architecture, JSON contract, frontend wiring, rendering, snapshot readiness, security, and implementation phases.

## Current Firm Connections

### Main Firm/System Connection

- Workspace SQL API
- Endpoint: `/studio/api/database/workspace/sql`
- Used through browser `fetch(...)` POST calls.

Purposes:

- Load stored blotter trades.
- Load upload batch history.
- Insert uploaded rows.
- Update overrides and exclusions.
- Delete rows if needed.

### Workspace Database Tables

- Trade store table: `sales coverage trade store`
- Upload batch history table: `sales coverage upload batches`

These are the two actual data back ends the dashboard works with today.

### Internal HSBC / Studio Assets

- HSBC logo / brand asset
- HSBC favicon / icon asset
- Known referenced asset: `/studio/static/ui/hsbc_icon.ico`

These are UI assets, not data sources.

### Browser-Side Persistence

- Local storage is used to remember dashboard state.
- Stored state includes mode, settings, and filters.

## Systems Not Currently Connected

There is currently no live connection to:

- Bloomberg
- CRM
- Research
- Market pricing APIs
- Email / Outlook
- External trade systems

The board is therefore driven by uploaded blotter data plus stored workspace database data only.

## Expected Input Data

The board expects trade/blotter rows from either:

- Uploaded `.xlsx`, `.xls`, or `.csv` files
- Pasted CSV / TSV text

It then maps source headers into the internal trade schema.

## Required Input Fields

### Coverage And Product

- Salesperson / Coverage: `salesperson_coverage`
- Tier 1 Product Type: `tier1_product_type`
- Tier 2 Product Type: `tier2_product_type`
- Tier 3 Product Type: `tier3_product_type`

### Trade Identity

- Trade Date: `trade_date`
- Legal Entity: `legal_entity`
- TREATs Acronym: `treats_acronym`
- Trade ID: `trade_id`

### Currencies And Economics

- Primary CCY: `primary_ccy`
- PC USD: `pc_usd`
- VA/GNBV USD: `va_gnbv_usd`
- Revenue CCY: `revenue_ccy`

## Strongly Recommended Field

- Primary Amount: `primary_amount`

This is not technically required, but it is operationally important because duplicate control is based on:

`Trade ID + Trade Date + Primary Amount`

If `primary_amount` is missing, duplicate control becomes weaker.

## Optional Input Fields Supported

### Coverage And Product

- `site_code`
- `sales_team_coverage`
- `salesperson_country`
- `maturity_date`

### Client / Desk / Platform

- `sales_client`
- `sales_client_sector`
- `sales_client_country`
- `sales_client_type`
- `book`
- `trader`
- `platform`
- `fx_platform_description`
- `btb_trade_site`
- `risk_book`

### Currencies / Economics

- `secondary_ccy`
- `pc_code`
- `tv_usd`
- `commission_code`
- `price`
- `flow_value`
- `liquidity_reserve`
- `cva`
- `fva`

### Instrument / Flags

- `isin_code`
- `security`
- `issuer`
- `ticker`
- `buy_sell`
- `tfx_flag`

### Free Text

- `comment`

## Derived Logic And Calculations

### Estimated Bank Revenue

Controlled by settings.

Default:

- PC + VA/GNBV

Optional modes:

- PC only
- VA/GNBV only

### Volume Proxy

Uses:

- `tv_usd` if populated and non-zero
- Otherwise falls back to `primary_amount`

### TFX Classification

Uses:

- `tfx_flag = Y`
- Or, depending on settings, platform / FX platform description containing TFX

### Remaining Tenor Bucket

Uses:

- `trade_date`
- `maturity_date`

Buckets include:

- `<=14`
- Other forward tenor buckets
- Past Due
- Unknown

### Data Quality Checks

The creator mode checks for:

- Missing required fields
- Maturity date earlier than trade date
- Negative primary amount

### Duplicate Logic

Exact duplicate blocking applies on:

`Trade ID + Trade Date + Primary Amount`

## Current Dashboard Visuals

### Top Bar / Header

- HSBC logo
- Dashboard title
- Status pill
- Mode pill
- Top action: Reload DB

### Hero Summary Area

- Import status banner
- KPI cards:
  - Total Volume
  - PC
  - VA/GNBV
  - Estimated Bank Revenue
  - Ticket Count
  - Upload Batches
- Summary strip chips:
  - Current period
  - Comparison period
  - Duplicate rule
  - Active records

### Controls Section

- Viewer / Creator mode toggle
- Viewer mode
- Creator mode

Creator mode includes:

- Upload workbook / CSV
- Paste CSV / TSV
- Parse file
- Parse pasted data
- Auto-map
- Insert upload

### Priority 1 Explorer Tabs

- Stored Trades
- Uploaded Raw Rows
- Normalized Preview
- Upload Batch History

### Global Filters

- Transaction date from / to
- Entity
- Channel
- Client direction
- Source
- Quick presets:
  - Weekly
  - Monthly
  - YTD

### Overview Section

KPI-style cards for:

- Legal Entities
- Tier 1 Products
- Currencies
- TFX Tickets
- Excluded Rows
- Override Rows

### Commentary Section

Narrative bullet summary with:

- Current ticket count
- Estimated bank revenue
- Volume
- Period-on-period comparison
- Top legal entity
- Top Tier 1 product
- Top country concentration
- TFX share
- Governance status on exclusions / overrides

### Year-Based Aggregates Summary

Metric toggle:

- Bank Revenue
- Volume
- Ticket Count

Charts:

1. Total metric breakdown
2. Last year vs this year monthly comparison
3. By legal entity
4. Country contribution

### Table Summary

Entity / Product Summary:

- Expandable by entity
- Tickets
- Volume
- PC
- VA/GNBV
- Bank revenue

Product Type Summary:

- Same core metrics
- Expand all
- Collapse all

### Product Analysis

Controls:

- Product drill-down
- Currency
- Top N
- Apply
- Export top

Charts:

1. Revenue by Tier 2 Product Type
2. Trading Volume by Tier 2, current vs prior
3. Instrument Description / Security, Top N
4. Issuer Ranking
5. Currency Breakdown
6. Remaining Tenor Bucket from Trade Date

### TFX vs Non-TFX Section

Summary tables:

- TFX overall
- Non-TFX overall

Comparison charts:

1. Combined TFX vs Non-TFX
2. Entity Split: TFX vs Non-TFX

### TFX Analysis Section

If TFX data exists, shows:

- One TFX summary table
- TFX Currency Pie
- TFX Platform Chart
- TFX Client Direction

If no TFX rows exist, shows an empty-state message.

### Maturity Date Analysis

Controls:

- Maturity date from / to
- Apply
- Export CSV

Visual:

- Overall Product Maturity table with:
  - Tier 1 product
  - Tickets
  - Volume
  - PC
  - VA/GNBV
  - Bank revenue

## Creator-Only Governance Visuals

### Data Quality / Unrecognized Lines

Exception table showing:

- Trade ID
- Entity
- ISIN
- Trade Date
- Primary CCY
- Direction
- Issue Type
- Issues

### Trade / ISIN Classification Lookup

- Lookup by Trade ID or ISIN
- Detail tiles for matched trade
- Related trades with same Trade ID

### Settings / Overrides / Exclusions

Two panels:

- Dashboard settings
- Selected row override / exclusion controls

## Miscellaneous UI Visuals

- Status banners
- Empty-state cards
- Sticky tables
- Toast notifications
- Ready marker for snapshotting / automation

## Short Current-State Inventory

Current firm connections:

- Workspace SQL endpoint
- Two workspace database tables
- Internal HSBC logo/icon assets
- Browser local storage

Current expected input:

- Uploaded or pasted blotter rows
- Rows are mapped to a trade schema with core required fields:
  - Trade ID
  - Trade Date
  - Primary CCY
  - Legal Entity
  - Tier 1/2/3 product
  - PC
  - VA/GNBV
  - Revenue CCY
  - Salesperson coverage
  - TREATs acronym
  - Ideally `primary_amount` for duplicate control

Current visuals:

- KPI cards
- Banners
- Filters
- Multiple summary tables
- Chart containers across aggregate, product, and TFX sections
- Creator-only quality, lookup, override, and exclusion panels

## RAG / AI Visual Sidecar Notes

The recommended pattern is to treat the RAG agent as a sidecar intelligence service for the dashboard, not as the dashboard itself.

The dashboard should handle:

- Layout
- Charts
- Tables
- Floating cards
- Callouts
- Commentary containers

The RAG agent should handle:

- Deciding what visuals should be shown
- Generating dashboard-ready insight blocks
- Proposing which chart types, slices, and rankings matter now
- Returning strict JSON that the HTML dashboard can render immediately

Key principle:

`Agent returns structured visual instructions; dashboard renders them.`

## AI Sidecar Architecture

### Layer 1: Blotter / Dashboard Data Layer

Existing sources:

- Workspace database trade table
- Upload batch table
- Uploaded docs, mapping files, or reference files if needed

### Layer 2: RAG Context Layer

The agent can retrieve from:

- Uploaded files in a knowledge base
- Internal news / commentary / research
- Web sources if allowed
- User-selected APIs
- Prior saved rules / prompts

### Layer 3: Agent Orchestration Layer

Create a hidden tool conversation and call the agent endpoint.

Likely steps:

- Create conversation
- Optionally upload files
- Run session with:
  - User message
  - Project instructions
  - Available files / APIs / constraints

### Layer 4: Frontend Rendering Layer

The board receives agent output and renders:

- Floating insight cards
- Suggested chart panels
- Annotations
- Highlight chips
- Watchlist blocks
- Recommended filters / drilldowns

## Best AI Output Contract

Do not ask the agent to return loose prose if immediate visuals are needed.

Ask for strict JSON only.

Recommended top-level keys:

- `status`
- `headline`
- `summary`
- `floating_cards`
- `visual_recommendations`
- `filters_to_apply`

Recommended `floating_cards` item shape:

- `title`
- `tone`
- `body`

Recommended `visual_recommendations` item shape:

- `visual_id`
- `chart_type`
- `metric`
- `group_by`
- `title`
- `top_n`

This lets the dashboard create immediate floating visuals without asking the agent to write chart code.

## AI Wiring Options

### Option A: Best For Immediate Use

Agent returns:

- Narrative
- Floating card content
- Chart recommendations as JSON spec

Dashboard does:

- Map `group_by` and `metric` to its own in-memory records
- Render cards and charts immediately with its existing chart engine

Benefits:

- Fast
- Reliable
- Lower injection risk
- Easier to govern
- Snapshot friendly

### Option B: More Flexible

Agent returns:

- Sanitized HTML snippets for floating panels

Dashboard does:

- Inserts sanitized HTML into a floating overlay region

Use only for:

- Text-heavy panels
- Formatted commentary
- Recommendation tiles

Do not use this for arbitrary executable JavaScript from the agent.

### Option C: Most Advanced

Agent returns a full visual spec schema:

- Card layout
- Chart types
- Titles
- Sort orders
- Alert priorities
- Recommended filters

The dashboard then behaves like a renderer engine.

This is the longer-term design if the goal is "AI-designed visuals."

## Dashboard Integration Pattern

Add floating AI panel containers such as:

- Top-right floating insight rail
- Mid-page recommended visuals strip
- Commentary overlay
- One "AI priorities today" card

Add an AI trigger pattern:

- User-triggered button: Generate AI visuals
- User-triggered button: Refresh AI insights
- Optional auto-run when dashboard first loads
- Optional auto-run after upload completes
- Optional auto-run when filters materially change

Recommended rules:

- Interactive mode: user-triggered
- Snapshot/headless mode: one auto-run allowed

## Agent Request Flow

Step 1: Create hidden conversation.

- Call the conversation endpoint.
- Keep the returned conversation ID.

Step 2: Upload supporting files if needed.

If RAG should use any of these, upload them first and capture file IDs:

- Uploaded blotter file
- Mapping reference
- Methodology note
- Product taxonomy file
- Sales playbook
- PDF / doc / prior reports

Step 3: Build the message.

Message should include:

- What the user wants
- Current filter state
- Summary stats already computed in the dashboard
- Any selected row / current focus
- Whether JSON-only output is required

Example message:

```text
Design immediate floating dashboard visuals for the current blotter view.
Current period: 2025-01-01 to 2026-07-14.
Current rows: 842.
Top legal entities by revenue are available in the dashboard.
Focus on concise cards and no more than 3 suggested visuals.
Return strict JSON only.
```

Step 4: Build strong project instructions.

Tell the agent:

- Available files
- Available APIs
- What it is allowed to use
- Exact JSON schema
- No markdown fences
- No prose outside JSON
- Dashboard-friendly output only

Step 5: Stream the response.

- Use SSE.
- Accumulate output chunks.

Step 6: Parse and render.

Once complete:

- Parse JSON.
- Render floating cards.
- Optionally build or refresh recommended charts.

## Context To Send To The Agent

Always send:

- Current filter state
- Current period
- Comparison period
- Key KPI summary
- Top groups already computed
- Whether TFX mode is flag-only or broader
- Row count
- Excluded row count
- Override row count

Optionally send:

- Top 20 grouped summaries instead of all rows
- Current batch import reconciliation result
- Product concentrations
- Tenor concentrations
- Entity/product table summaries

Only send raw rows when needed.

Sending too much raw trade-level data each time can make the result:

- Slower
- Noisier
- More expensive
- Harder to stabilize

Better pattern:

- Send dashboard aggregates.
- Let RAG use uploaded supporting docs for interpretation.

## Best Design For The Blotter Dashboard

Add an AI-designed floating layer with three output zones.

### Zone A: Floating "What Matters Now" Rail

Small stacked cards:

- Key change
- Concentration risk
- TFX watch
- Maturity watch
- Data quality note

### Zone B: "Recommended Visual Now" Panel

Agent returns 1 to 3 recommended charts with spec:

- Chart type
- Metric
- Group by
- Title
- Top N

The board renders those charts immediately.

### Zone C: Commentary Panel

Short narrative:

- 3 bullets maximum
- Why this matters
- Where to drill next

This keeps the AI useful without replacing the existing dashboard.

## Frontend Implementation Shape

Add JavaScript functions:

- `createConversation()`
- `uploadFilesIfAny()`
- `runAiVisualAgent()`
- `renderAiVisualResponse()`

Store output in state:

```javascript
state.aiVisuals = {
  loading: false,
  error: "",
  response: null,
  lastUpdated: null
};
```

Render the floating layer from state:

- If a response exists, render cards.
- Render recommended chart containers.
- Render commentary.

## Example Project Instructions

```text
You are an AI assistant helping a blotter analytics dashboard generate immediate floating visual recommendations.
Use uploaded files and available retrieval tools where relevant.
Do not return markdown.
Return raw JSON only with keys: status, headline, summary, floating_cards, visual_recommendations, filters_to_apply.
Each floating_cards item must contain title, tone, body.
Each visual_recommendations item must contain visual_id, chart_type, metric, group_by, title, top_n.
Keep output concise and directly renderable in a dashboard.
If evidence is weak, return status="insufficient_context" and explain in summary.
```

## Rendering Agent Output

The renderer should map JSON back into the dashboard's existing data and chart engine.

Floating cards:

- Use local rendering.
- Escape/sanitize all text.
- Do not inject unsanitized model output.

Suggested charts:

- For each recommended visual, compute grouped data from current rows.
- Call the dashboard's chart renderer.

Example group-by values:

- Legal entity
- Tier 1 product type
- Tier 2 product type
- Primary CCY
- Tenor bucket
- Platform
- Salesperson country

The dashboard remains in control of the actual data computation and rendering.

## Snapshot-Ready Behavior

For scheduled screenshots or headless snapshots:

- Auto-run AI once in snapshot mode.
- Set a timeout ceiling.
- If AI fails, render fallback static cards.
- Do not let AI block dashboard readiness forever.

Reliability pattern:

- Set `aiVisuals.done = true` in `finally`.
- If no AI response arrives in time, render:
  - "AI insights unavailable"
  - Existing default commentary

The board should still reach its ready marker even if AI fails.

## Security And Governance Guidance

Do:

- Ask the agent for JSON only.
- Sanitize any text before inserting into HTML.
- Keep chart rendering in the dashboard's own JavaScript.
- Upload files explicitly when needed.
- Send cookies with requests where the authenticated Studio APIs require them.
- Keep hidden tool conversations out of user-visible chat history.

Do not:

- Let the agent return arbitrary executable JavaScript.
- Directly inject raw unsanitized HTML from the model.
- Rely on prose parsing if visuals must appear immediately.
- Make the dashboard depend entirely on RAG to function.

## Recommended Implementation Phases

### Phase 1

Add one button:

- Generate AI visuals

Add one panel:

- AI Visual Layer

Agent returns:

- Headline
- 3 floating cards
- 2 recommended charts
- 3-bullet commentary

Dashboard renders:

- Cards in the hero area
- 2 AI-suggested charts below commentary

### Phase 2

Trigger AI automatically after:

- Successful upload
- Filter change
- Product drill-down change

Debounce behavior:

- Wait 800 to 1200 ms after filter changes.
- Cancel prior pending run.

### Phase 3

Let the agent use uploaded taxonomy / reference docs as RAG context:

- Product mapping
- Client segmentation rules
- Desk guidance
- Prior dashboard design notes

This should improve design recommendations.

## Recommendation

Use the RAG agent to return a strict JSON visual response spec. Let the dashboard compute and render the actual floating visuals locally.

That is the fastest, safest, and most maintainable wiring.
