#!/usr/bin/env python3
"""Build neoh-deck/index.html from the ORIGINAL standalone bundle.

Keeps the standalone's asset manifest and slide markup byte-for-byte. Replaces
only the proprietary deck-stage viewer runtime with a screen delivery layer:
the same 1920x1080 slides scaled to fit on desktop, purpose-built reflowed
layouts on mobile.
"""
import json
import re
import sys

SRC = "standalone.html"
OUT = "/home/user/FMCG/neoh-deck/index.html"

src = open(SRC, encoding="utf-8").read()
m = re.search(r'(<script type="__bundler/template"[^>]*>)(.*?)(</script>)', src, re.S)
if not m:
    sys.exit("template script tag not found")
t = m.group(2)
tpl = json.loads(t)
before = len(tpl)


def sub1(pattern, repl, s, what, flags=0):
    """Replace exactly once, or fail loudly."""
    out, n = re.subn(pattern, repl, s, count=1, flags=flags)
    if n != 1:
        sys.exit("build: expected 1 match for %s, got %d" % (what, n))
    return out


# ---- 1. head: title + language, drop the deck-stage runtime script ----------
tpl = sub1(r"<html>", '<html lang="en-GB">', tpl, "html tag")
tpl = sub1(
    r'<meta charset="utf-8">',
    '<meta charset="utf-8">\n<title>NEOH AG Investment Deck</title>',
    tpl,
    "charset meta",
)
tpl = sub1(
    r'<script src="[0-9a-f-]{36}"></script>\s*\n\s*</head>',
    "</head>",
    tpl,
    "head runtime script",
)

# ---- 2. lift the helmet <style> blocks into <head>, drop the viewer wrapper --
helmet = re.search(r"<helmet>(.*?)</helmet>", tpl, re.S)
if not helmet:
    sys.exit("helmet block not found")
styles = re.findall(r"<style>.*?</style>", helmet.group(1), re.S)
if len(styles) != 2:
    sys.exit("expected 2 helmet stylesheets, got %d" % len(styles))

mobile_css = open("mobile.css", encoding="utf-8").read()
head_block = "\n".join(styles) + "\n<style>\n" + mobile_css + "</style>\n"

tpl = sub1(r"</head>", head_block + "</head>", tpl, "head close")
tpl = sub1(r"<x-dc>\s*<helmet>.*?</helmet>", "", tpl, "helmet block", re.S)
tpl = sub1(r"<x-import[^>]*>", '<div id="stage">', tpl, "x-import open")
tpl = sub1(r"</x-import>\s*</x-dc>", "</div>", tpl, "x-import close", re.S)

# ---- 3. tag the slide-3 plot so the mobile layout can clone it --------------
tpl = sub1(
    r'<div style="position:absolute; left:104px; bottom:98px; width:calc\(80% - 88px\); height:calc\(80% - 83\.2px\);">',
    '<div id="deskPlot" style="position:absolute; left:104px; bottom:98px; width:calc(80% - 88px); height:calc(80% - 83.2px);">',
    tpl,
    "slide 3 plot area",
)

# ---- 4. mobile markup + the delivery runtime -------------------------------
mobile_html = open("mobile.html", encoding="utf-8").read()
runtime = open("runtime.js", encoding="utf-8").read()
tpl = sub1(
    r"</body>",
    mobile_html + "\n<script>\n" + runtime + "</script>\n</body>",
    tpl,
    "body close",
)

# ---- 5. sanity checks ------------------------------------------------------
assert tpl.count("<section ") == 12, "expected 6 desktop + 6 mobile sections"
for tag in ("<x-dc", "<x-import", "<helmet"):
    assert tag not in tpl, "viewer wrapper %s survived" % tag
assert 'name="viewport"' in tpl, "viewport meta lost"

# ---- 6. re-serialise; escape / so </script> can't break out of the tag ------
enc = json.dumps(tpl).replace("/", "\\u002F")
out = src[: m.start(2)] + enc + src[m.end(2) :]
open(OUT, "w", encoding="utf-8").write(out)
print("template %d -> %d chars | wrote %s (%d bytes)" % (before, len(tpl), OUT, len(out)))
