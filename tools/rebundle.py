#!/usr/bin/env python3
"""Re-bundle an edited inner template back into 'Blotter Desk (standalone).html'.

The template lives as a JSON-encoded string on a single line inside
<script type="__bundler/template">. The line NUMBER is not stable — it is
located by scanning for that script tag, never hardcoded.
"""
import json, sys, re

def main(standalone, inner, out):
    src = open(standalone).read()
    lines = src.split("\n")

    tag = '<script type="__bundler/template">'
    starts = [i for i, l in enumerate(lines) if tag in l]
    assert len(starts) == 1, f"expected 1 template tag, found {len(starts)}"
    ti = starts[0] + 1
    assert lines[ti].lstrip().startswith('"'), "template line is not a JSON string"
    assert "</script>" in lines[ti + 1], "template is not exactly one line"

    old = json.loads(lines[ti].strip())
    new = open(inner).read()

    encoded = json.dumps(new)
    # A literal '</script' inside the string would close the host <script> tag early.
    encoded = encoded.replace("</", "<\\/")

    lines[ti] = encoded
    open(out, "w").write("\n".join(lines))
    print(f"template line index (0-based): {ti}  (1-based: {ti+1})")
    print(f"inner: {len(old)} -> {len(new)} chars")
    print(f"wrote {out}")

    # round-trip check
    check = open(out).read().split("\n")[ti].strip()
    assert json.loads(check.replace("<\\/", "</")) == new, "round-trip mismatch"
    print("round-trip verified")

if __name__ == "__main__":
    main(*sys.argv[1:4])
