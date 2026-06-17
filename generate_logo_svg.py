#!/usr/bin/env python3
"""Generate logo SVG files with text converted to vector paths (no foreignObject)."""

from __future__ import annotations

from pathlib import Path

from fontTools.ttLib import TTFont
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen

ROOT = Path(__file__).resolve().parent
FONT_BOLD = r"C:\Windows\Fonts\arialbd.ttf"
FONT_BLACK = r"C:\Windows\Fonts\ariblk.ttf"


def _load_font(path: str) -> tuple:
    font = TTFont(path)
    return font, font.getGlyphSet(), font.getBestCmap(), font["head"].unitsPerEm


def text_paths(
    text: str,
    font_path: str,
    font_size: float,
    origin_x: float,
    origin_y: float,
    letter_spacing: float = 0.0,
    fill: str = "currentColor",
) -> tuple[str, float]:
    """Return SVG path group and total width for text at baseline origin_y."""
    font, glyph_set, cmap, upem = _load_font(font_path)
    scale = font_size / upem
    cursor = 0.0
    paths: list[str] = []

    for ch in text:
        gid = cmap.get(ord(ch))
        if gid is None:
            continue
        advance, _ = font["hmtx"][gid]
        pen = SVGPathPen(glyph_set)
        transform = (scale, 0, 0, -scale, origin_x + cursor * scale, origin_y)
        tpen = TransformPen(pen, transform)
        glyph_set[gid].draw(tpen)
        d = pen.getCommands()
        if d:
            paths.append(f'    <path fill="{fill}" d="{d}"/>')
        cursor += advance + letter_spacing

    width = cursor * scale
    body = "\n".join(paths)
    return body, width


def segmented_line(
    segments: list[dict],
    origin_x: float,
    origin_y: float,
) -> tuple[str, float]:
    """Lay out several styled text segments on a shared baseline."""
    cursor_x = origin_x
    paths: list[str] = []
    for seg in segments:
        body, width = text_paths(
            seg["text"],
            seg.get("font", FONT_BOLD),
            seg["size"],
            cursor_x,
            origin_y,
            seg.get("letter_spacing", 0.0),
            seg.get("fill", "currentColor"),
        )
        if body:
            paths.append(body)
        cursor_x += width + seg.get("gap", 0.0)
    return "\n".join(paths), cursor_x - origin_x


def circle_ring(cx: float, cy: float, r: float, stroke: str, sw: float) -> str:
    return (
        f'  <circle cx="{cx:.1f}" cy="{cy:.1f}" r="{r:.1f}" '
        f'fill="none" stroke="{stroke}" stroke-width="{sw:.1f}"/>'
    )


def arm_graphic(fill: str) -> str:
    return f"""  <g fill="{fill}">
    <circle cx="18" cy="18" r="5.5"/>
    <rect x="16.5" y="22" width="3" height="22" rx="1.5"/>
    <circle cx="18" cy="46" r="4.5"/>
    <rect x="16.8" y="49" width="2.4" height="18" rx="1.2" transform="rotate(12 18 58)"/>
    <circle cx="21" cy="68" r="3.8"/>
    <path d="M21 71 L14 88 L28 88 Z"/>
  </g>"""


def clock_graphic(orange: str, ink: str) -> str:
    return f"""  <path fill="none" stroke="{orange}" stroke-width="5" stroke-linecap="round" d="M430 22 A 46 46 0 1 0 388 88"/>
  <polygon fill="{orange}" points="388,88 378,96 392,98"/>
  <g stroke="{orange}" stroke-width="2.5">
    <line x1="430" y1="22" x2="430" y2="28"/>
    <line x1="458" y1="30" x2="455" y2="36"/>
    <line x1="472" y1="52" x2="466" y2="54"/>
    <line x1="472" y1="78" x2="466" y2="76"/>
    <line x1="458" y1="100" x2="455" y2="94"/>
    <line x1="430" y1="108" x2="430" y2="102"/>
    <line x1="402" y1="100" x2="405" y2="94"/>
    <line x1="388" y1="78" x2="394" y2="76"/>
  </g>"""


def build_full_logo(ink: str = "#1a1a1a", orange: str = "#f5821f") -> str:
    top, _ = segmented_line(
        [
            {"text": "L'", "size": 24, "fill": ink},
            {"text": "O", "size": 34, "fill": orange, "gap": 1},
            {"text": "DYSSÉE", "size": 24, "fill": ink},
        ],
        34,
        30,
    )
    express, _ = text_paths("EXPRESS", FONT_BLACK, 42, 34, 70, fill=ink)
    time8, w8 = text_paths("8h", FONT_BOLD, 11, 404, 52)
    time18, _ = text_paths("18h", FONT_BLACK, 28, 404 + (80 - w8) / 2 - 8, 78)

    banner_text = "LA COMPÉTITION D'ÉCO-CONCEPTION · YAOUNDÉ 2026"
    banner_size = 8.5
    banner_spacing = 0.6
    _, banner_w = text_paths(banner_text, FONT_BOLD, banner_size, 0, 0, banner_spacing)
    pad_x = 10
    rect_x = 34
    rect_w = banner_w + 2 * pad_x
    banner_rect = (
        f'  <rect fill="{orange}" x="{rect_x}" y="96" '
        f'width="{rect_w:.0f}" height="22" rx="1"/>'
    )
    banner, _ = text_paths(
        banner_text,
        FONT_BOLD,
        banner_size,
        rect_x + pad_x,
        111,
        letter_spacing=banner_spacing,
    )

    label = "L'Odyss\u00e9e Express"
    return f"""<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 520 132" role="img" aria-label="{label}">
{arm_graphic(ink)}
  <g>
{top}
  </g>
  <g fill="{ink}">
{express}
  </g>
{clock_graphic(orange, ink)}
  <g fill="{ink}" text-anchor="middle">
{time8}
{time18}
  </g>
{banner_rect}
  <g fill="#ffffff">
{banner}
  </g>
</svg>
"""


def build_white_logo(ink: str = "#ffffff", orange: str = "#f5821f") -> str:
    top, _ = segmented_line(
        [
            {"text": "L'", "size": 15, "fill": ink, "letter_spacing": 2.0},
            {"text": "O", "size": 21, "fill": orange, "letter_spacing": 2.0, "gap": 1},
            {"text": "DYSSÉE", "size": 15, "fill": ink, "letter_spacing": 2.0},
        ],
        0,
        17,
    )
    main, w_main = text_paths("EXPRESS", FONT_BLACK, 22, 0, 37, letter_spacing=5.3, fill=ink)
    width = max(w_main + 16, 240)

    label = "L'Odyss\u00e9e Express"
    return f"""<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {int(width)} 40" role="img" aria-label="{label}">
  <g>
{top}
  </g>
  <g fill="{ink}">
{main}
  </g>
</svg>
"""


def main() -> None:
    full = build_full_logo()
    white = build_white_logo()

    targets = [
        ROOT / "site" / "assets" / "logo-odyssee-express.svg",
        ROOT / "assets" / "logo-odyssee-express.svg",
        ROOT / "logos" / "logo-odyssee-express.svg",
        ROOT / "site" / "assets" / "logo-odyssee-express-white.svg",
        ROOT / "assets" / "logo-odyssee-express-white.svg",
    ]
    for path in targets:
        path.parent.mkdir(parents=True, exist_ok=True)
        content = white if "white" in path.name else full
        path.write_text(content, encoding="utf-8")
        print(f"Wrote {path}")


if __name__ == "__main__":
    main()
