# Build tooling for `Blotter Desk (standalone).html`

> ## ⚠️ THE DELIVERABLE IS **ONE SELF-CONTAINED HTML FILE**
>
> `Blotter Desk (standalone).html` is the entire product. It is handed around and opened
> standalone inside the bank — often from `file://`, often with no network. **The board
> itself must be self-contained**, not merely "shippable as a bundle".
>
> **This `tools/` directory is build source, not a runtime dependency.** Delete it and the
> board still runs identically. Nothing in the shipped file references it.
>
> Therefore, when editing:
> - **Never** add `<script src="...">` or `<link href="...">` pointing at a sibling file.
> - **Never** split the app into modules, and **never** add a CDN, web font, or remote image.
> - Every dependency is already inlined: SheetJS, the dc-runtime, React and react-dom live in
>   the file as base64+gzip in the `__bundler/manifest` block. The `unpkg.com` URLs you'll see
>   are **mapping keys to those bundled copies, not runtime fetches** — which is exactly why it
>   boots offline. Don't "helpfully" restore them to real CDN loads.
> - Firm endpoints (`/studio/api/...`) are the *only* real network calls, and each must
>   **degrade gracefully** rather than be depended on.
>
> After any change, confirm both of these:
> ```sh
> # 1. no local file references
> grep -c 'tools/\|inner_base\|support\.js\|blotter-data\.js' "Blotter Desk (standalone).html"   # -> 0
> # 2. external URL set unchanged
> grep -o 'https\?://[^"'"'"' <>]*' "Blotter Desk (standalone).html" | sort -u                    # -> same 4 as before
> ```

The deliverable is a **bundler**: the entire app lives as a JSON-encoded string on a
single line inside `<script type="__bundler/template">`. You cannot usefully hand-edit
that line, and `git diff` on the deliverable will only ever show `1 insertion, 1 deletion`
no matter how large the change.

**`inner_base.html` in this directory is the real source.** Edit it, then re-bundle.

## Workflow

```sh
# 1. edit tools/inner_base.html

# 2. syntax-check before bundling (the app is a React class in a text/x-dc script)
python3 - <<'EOF'
import re
s = open('tools/inner_base.html').read()
m = re.search(r'<script type="text/x-dc"[^>]*>(.*?)</script>', s, re.S)
open('/tmp/component.js','w').write('class DCLogic{};\n' + m.group(1))
EOF
node --check /tmp/component.js

# 3. re-bundle into the deliverable
python3 tools/rebundle.py "Blotter Desk (standalone).html" tools/inner_base.html /tmp/out.html \
  && cp /tmp/out.html "Blotter Desk (standalone).html"
```

`rebundle.py` locates the template line **dynamically** (by finding the
`<script type="__bundler/template">` tag), escapes `</` so inline `</script>` cannot close
the host tag early, and verifies a JSON round-trip. Never hardcode the line number — it
shifts whenever the outer bundler script or asset manifest changes.

## Rules that will bite you

- **No raw hex colours** in markup or component logic. Every colour resolves through a CSS
  custom property. A new token must be added to *all three* theme blocks (`:root`,
  `:root[data-theme="dark"]`, the `@media (prefers-color-scheme:dark)` fallback) and, if it
  affects printing, the `@media print` token block too.
- **Handlers must be listed in the render return object** (near `onUploadToggle: this.onUploadToggle`).
  A handler referenced from the template but missing there silently does nothing.
- **Any scrolling or height-capped container needs a matching `@media print` rule**
  (`max-height:none; overflow:visible`) — a clipped container silently drops rows when printed.
- The polish-layer CSS matches **literal inline-style strings** (e.g.
  `div[style*="border:1px solid var(--line)"]`). Renaming a token there breaks card styling.

## Verifying

`read_page`-style accessibility dumps come back empty — the bundler swaps the whole document.
Drive the page with JavaScript instead, and prefer
`el.dispatchEvent(new MouseEvent('click',{bubbles:true}))` over `.click()`.

Test at a **realistic viewport (1280x800 / 1440x900)**, not just a tall screenshot viewport:
a print-clipping regression once hid at 2400px tall because the table happened to fit.

See `../ARCHITECTURE.md` for the full picture.
