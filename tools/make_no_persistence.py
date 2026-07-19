#!/usr/bin/env python3
"""Generate the *no-persistence* (fully ephemeral) variant of the blotter board.

The canonical source stays `tools/inner_base.html` (the persistent variant). This
script derives an ephemeral copy of that source by three surgical, deterministic
transforms, then re-bundles it — using the current deliverable's outer bundler
wrapper — into `Blotter Desk (standalone, no persistence).html`.

Ephemeral means: data lives only in memory for the session. Nothing is written to
browser localStorage, no firm `/studio/api/...` calls are made, and the Postgres
backend patch is disabled. Upload/paste populate the board; a refresh clears it.

The three transforms (each asserted to match exactly once so a future edit that
moves the anchor fails loudly instead of silently producing a still-persistent file):

  1. In-memory localStorage shim injected as the very first <script> in <head>,
     before the theme-boot script — so *every* localStorage read/write in the app
     (trades, batches, filters, history, theme, density, columns) hits memory and
     nothing survives a refresh.
  2. `FIRM.enabled: true` -> `false` — disables all firm REST wiring (workspace
     load/sync, ingest/state writes, legacy upsert, and the copilot backend call).
  3. An early `return` at the top of the Postgres "PERSISTENT TRADE BACKEND PATCH"
     IIFE — disables its boot hydration and its localStorage-write interception.

Usage:
  python3 tools/make_no_persistence.py
"""
import subprocess
import sys
import tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
INNER = ROOT / "tools" / "inner_base.html"
WRAPPER = ROOT / "Blotter Desk (standalone).html"          # outer bundler source
OUT = ROOT / "Blotter Desk (standalone, no persistence).html"
REBUNDLE = ROOT / "tools" / "rebundle.py"

# ---- transform 1: in-memory localStorage shim -----------------------------------
# Anchor: the theme-boot <script> is the first script after the viewport meta.
SHIM_ANCHOR = (
    '<meta name="viewport" content="width=device-width, initial-scale=1">\n'
    "<script>\n"
    "// ============================================================================\n"
    "// THEME BOOT"
)
SHIM_SCRIPT = (
    '<meta name="viewport" content="width=device-width, initial-scale=1">\n'
    "<script>\n"
    "// ============================================================================\n"
    "// EPHEMERAL STORAGE SHIM  [no-persistence variant]\n"
    "// Replaces window.localStorage with an in-memory store BEFORE any other\n"
    "// script runs, so the board keeps zero state across page loads. Every\n"
    "// getItem/setItem the app makes (trades, batches, filters, history, theme,\n"
    "// density, columns) hits this object and is discarded on refresh.\n"
    "// ============================================================================\n"
    "(function () {\n"
    "  var mem = {};\n"
    "  var shim = {\n"
    "    getItem: function (k) { return Object.prototype.hasOwnProperty.call(mem, k) ? mem[k] : null; },\n"
    "    setItem: function (k, v) { mem[k] = String(v); },\n"
    "    removeItem: function (k) { delete mem[k]; },\n"
    "    clear: function () { mem = {}; },\n"
    "    key: function (i) { return Object.keys(mem)[i] || null; }\n"
    "  };\n"
    "  Object.defineProperty(shim, 'length', { get: function () { return Object.keys(mem).length; } });\n"
    "  try { Object.defineProperty(window, 'localStorage', { value: shim, configurable: true, writable: false }); }\n"
    "  catch (e) { try { window.localStorage = shim; } catch (e2) {} }\n"
    "})();\n"
    "</script>\n"
    "<script>\n"
    "// ============================================================================\n"
    "// THEME BOOT"
)

# ---- transform 2: disable firm REST wiring --------------------------------------
FIRM_ANCHOR = "FIRM = {\n    enabled: true,"
FIRM_PATCH = (
    "FIRM = {\n"
    "    enabled: false,  // [no-persistence variant] all /studio/api calls disabled"
)

# ---- transform 3: disable the Postgres backend patch ----------------------------
PG_ANCHOR = "  'use strict';\n  var STUDIO_SQL_URL = '/studio/api/sql';"
PG_PATCH = (
    "  'use strict';\n"
    "  return; // [no-persistence variant] Postgres backend patch disabled\n"
    "  var STUDIO_SQL_URL = '/studio/api/sql';"
)

TRANSFORMS = [
    ("localStorage shim", SHIM_ANCHOR, SHIM_SCRIPT),
    ("FIRM.enabled=false", FIRM_ANCHOR, FIRM_PATCH),
    ("Postgres patch disable", PG_ANCHOR, PG_PATCH),
]


def main() -> int:
    src = INNER.read_text()
    for name, anchor, repl in TRANSFORMS:
        n = src.count(anchor)
        if n != 1:
            sys.stderr.write(
                f"ERROR: transform '{name}' expected exactly 1 anchor match, found {n}. "
                f"The source layout changed; update tools/make_no_persistence.py.\n"
            )
            return 1
        src = src.replace(anchor, repl)

    with tempfile.NamedTemporaryFile("w", suffix=".html", delete=False) as tf:
        tf.write(src)
        eph_inner = tf.name

    try:
        proc = subprocess.run(
            [sys.executable, str(REBUNDLE), str(WRAPPER), eph_inner, str(OUT)],
            capture_output=True,
            text=True,
        )
    finally:
        try:
            Path(eph_inner).unlink()
        except OSError:
            pass
    sys.stdout.write(proc.stdout)
    sys.stderr.write(proc.stderr)
    if proc.returncode != 0:
        return proc.returncode
    print(f"\nWrote {OUT.name}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
