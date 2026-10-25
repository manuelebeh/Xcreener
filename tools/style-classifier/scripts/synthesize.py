#!/usr/bin/env python3
"""Synthesise license-clean training images for code / terminal / diagram classes.

These three classes are generated rather than scraped: synthesis gives unlimited,
balanced, copyright-clean variety (themes, fonts, layouts) that closely matches
what Xcreener users actually capture.

- code     : Pygments renders source snippets across many color themes + fonts.
- terminal : shell sessions + log lines rendered with dark terminal themes and a
             macOS-style window title bar.
- diagram  : random flowcharts / DAGs rendered with Graphviz (matplotlib+networkx
             fallback if the `dot` binary is unavailable).

Code source text:
  --code-source-dir  walk a directory of real source files (defaults to the
                     Xcreener repo so snippets look authentic). Falls back to a
                     small bundled set of synthetic snippets if nothing is found.

Examples
--------
    python scripts/synthesize.py --classes code terminal diagram --count 1500
    python scripts/synthesize.py --classes code --count 800 --code-source-dir ../../apps
"""

from __future__ import annotations

import argparse
import random
import textwrap
from pathlib import Path

HERE = Path(__file__).resolve().parent
ROOT = HERE.parent
REPO_ROOT = ROOT.parent.parent

CODE_EXTS = {".ts", ".tsx", ".js", ".jsx", ".rs", ".py", ".go", ".java", ".rb", ".css", ".json", ".sh", ".toml"}

# Pygments styles span light + dark IDE looks.
CODE_STYLES = [
    "monokai", "dracula", "github-dark", "one-dark", "nord", "gruvbox-dark",
    "solarized-light", "default", "friendly", "vs", "xcode", "material",
]
TERMINAL_STYLES = ["monokai", "dracula", "nord", "gruvbox-dark", "one-dark", "github-dark"]
TERMINAL_BG = "#0c0c0c"
# Cross-platform monospace candidates (macOS / Windows / Linux). Probed at runtime.
MONO_FONT_CANDIDATES = [
    "Menlo", "Monaco", "SF Mono", "Andale Mono", "Courier New",
    "Consolas", "DejaVu Sans Mono", "Liberation Mono", "Noto Sans Mono",
]


def available_mono_fonts() -> list[str]:
    """Return the subset of candidate fonts Pygments can actually load here."""
    from pygments.formatters.img import FontManager, FontNotFound

    usable = []
    for name in MONO_FONT_CANDIDATES:
        try:
            FontManager(name, 16)
            usable.append(name)
        except FontNotFound:
            continue
    if not usable:
        # Let Pygments fall back to its own default search.
        usable = [""]
    return usable

SAMPLE_SNIPPETS = [
    ("python", "def compute_layout(width, height, padding):\n    inner_w = width - padding * 2\n    inner_h = height - padding * 2\n    return {\"x\": padding, \"y\": padding, \"w\": inner_w, \"h\": inner_h}\n\n\nclass Renderer:\n    def __init__(self, canvas):\n        self.canvas = canvas\n        self.layers = []\n\n    def draw(self):\n        for layer in self.layers:\n            layer.paint(self.canvas)\n"),
    ("typescript", "export function classifyContent(image: ImageData): Promise<Label> {\n  const tensor = preprocess(image, 224);\n  return model.predict(tensor).then((scores) => {\n    const best = argmax(scores);\n    return LABELS[best];\n  });\n}\n\nconst LABELS = [\"code\", \"ui\", \"terminal\", \"photo\", \"diagram\", \"text\"] as const;\n"),
    ("rust", "pub fn detect_content_bounds(pixels: &[u8], w: u32, h: u32) -> Rect {\n    let mut min_x = w;\n    let mut min_y = h;\n    for y in 0..h {\n        for x in 0..w {\n            if !is_background(pixels, x, y, w) {\n                min_x = min_x.min(x);\n                min_y = min_y.min(y);\n            }\n        }\n    }\n    Rect { x: min_x, y: min_y, w, h }\n}\n"),
    ("go", "func StitchFrames(frames []image.Image, overlap int) *image.RGBA {\n\ttotal := 0\n\tfor _, f := range frames {\n\t\ttotal += f.Bounds().Dy() - overlap\n\t}\n\tout := image.NewRGBA(image.Rect(0, 0, frames[0].Bounds().Dx(), total))\n\treturn out\n}\n"),
]

LOG_LINES = [
    "$ pnpm run dev:desktop",
    "  VITE v5.4.2  ready in 412 ms",
    "  ➜  Local:   http://localhost:1420/",
    "$ cargo check",
    "    Checking xcreener-desktop v0.1.0",
    "    Finished dev [unoptimized + debuginfo] target(s) in 3.21s",
    "$ git status",
    "On branch main",
    "nothing to commit, working tree clean",
    "[INFO] capture: monitor 0 1512x982 @2x",
    "[WARN] ocr: tessdata missing, falling back to Vision",
    "[ERROR] export: ENOSPC: no space left on device",
    "$ mise run test",
    " PASS  src/engine/gradients.test.ts (56 presets)",
    " PASS  src/redaction/detectors.test.ts",
    "Tests: 142 passed, 142 total",
    "$ ./scripts/train.py --epochs 10",
    "epoch=1 loss=1.4123 val_acc=0.6420",
    "epoch=7 loss=0.3187 val_acc=0.8610",
]


def out_dir_for(base: Path, label: str) -> Path:
    d = base / "raw" / label
    d.mkdir(parents=True, exist_ok=True)
    return d


def collect_code_snippets(source_dir: Path, max_files: int = 4000) -> list[tuple[str, str]]:
    snippets: list[tuple[str, str]] = []
    if source_dir and source_dir.exists():
        files = [
            p for p in source_dir.rglob("*")
            if p.is_file() and p.suffix in CODE_EXTS and "node_modules" not in p.parts and "target" not in p.parts
            and ".venv" not in p.parts and "dist" not in p.parts
        ]
        random.shuffle(files)
        for path in files[:max_files]:
            try:
                text = path.read_text(encoding="utf-8", errors="ignore")
            except Exception:
                continue
            lines = text.splitlines()
            if len(lines) < 8:
                continue
            start = random.randint(0, max(0, len(lines) - 40))
            chunk = "\n".join(lines[start : start + random.randint(18, 38)])
            if chunk.strip():
                snippets.append((path.suffix.lstrip("."), chunk))
    if not snippets:
        snippets = [(lang, code) for lang, code in SAMPLE_SNIPPETS]
    return snippets


def lexer_for(hint: str):
    from pygments.lexers import get_lexer_by_name, guess_lexer
    from pygments.util import ClassNotFound

    alias = {"ts": "typescript", "tsx": "typescript", "js": "javascript", "jsx": "javascript",
             "rs": "rust", "py": "python", "sh": "bash"}.get(hint, hint)
    try:
        return get_lexer_by_name(alias)
    except ClassNotFound:
        try:
            return guess_lexer(hint)
        except Exception:
            return get_lexer_by_name("text")


def render_code(snippets, dest: Path, count: int) -> int:
    from pygments import highlight
    from pygments.formatters import ImageFormatter

    fonts = available_mono_fonts()
    written = 0
    for i in range(count):
        hint, code = random.choice(snippets)
        style = random.choice(CODE_STYLES)
        font = random.choice(fonts)
        formatter = ImageFormatter(
            style=style, font_name=font, font_size=random.choice([14, 16, 18, 20]),
            line_numbers=random.random() < 0.6, line_pad=random.choice([4, 6, 8]),
            image_pad=random.choice([12, 18, 24]),
        )
        try:
            png = highlight(code, lexer_for(hint), formatter)
        except Exception:
            continue
        (dest / f"code_{style}_{i:05d}.png").write_bytes(png)
        written += 1
    return written


def render_terminal(dest: Path, count: int) -> int:
    from pygments import highlight
    from pygments.formatters import ImageFormatter
    from pygments.lexers import get_lexer_by_name

    lexer = get_lexer_by_name("console")
    fonts = available_mono_fonts()
    written = 0
    for i in range(count):
        n = random.randint(8, 16)
        body = "\n".join(random.choice(LOG_LINES) for _ in range(n))
        style = random.choice(TERMINAL_STYLES)
        formatter = ImageFormatter(
            style=style, font_name=random.choice(fonts), font_size=random.choice([14, 16, 18]),
            line_numbers=False, image_pad=random.choice([16, 24, 32]),
        )
        try:
            png = highlight(body, lexer, formatter)
        except Exception:
            continue
        png = _add_window_chrome(png, title=random.choice(["bash", "zsh — 80×24", "powershell", "node", "~/xcreener"]))
        (dest / f"terminal_{style}_{i:05d}.png").write_bytes(png)
        written += 1
    return written


def _add_window_chrome(png_bytes: bytes, title: str) -> bytes:
    """Add a dark title bar + traffic-light dots so it reads as a terminal window."""
    import io

    from PIL import Image, ImageDraw

    body = Image.open(io.BytesIO(png_bytes)).convert("RGB")
    bar_h = 28
    out = Image.new("RGB", (body.width, body.height + bar_h), TERMINAL_BG)
    draw = ImageDraw.Draw(out)
    draw.rectangle([0, 0, body.width, bar_h], fill="#2b2b2b")
    for idx, color in enumerate(["#ff5f56", "#ffbd2e", "#27c93f"]):
        cx = 14 + idx * 18
        draw.ellipse([cx, bar_h // 2 - 5, cx + 10, bar_h // 2 + 5], fill=color)
    draw.text((body.width // 2 - len(title) * 3, 8), title, fill="#cccccc")
    out.paste(body, (0, bar_h))
    buffer = io.BytesIO()
    out.save(buffer, format="PNG")
    return buffer.getvalue()


def render_diagram(dest: Path, count: int) -> int:
    try:
        return _render_diagram_graphviz(dest, count)
    except Exception as exc:  # graphviz binary missing or python lib absent
        print(f"  [diagram] graphviz unavailable ({exc}); using matplotlib fallback")
        return _render_diagram_matplotlib(dest, count)


def _render_diagram_graphviz(dest: Path, count: int) -> int:
    import graphviz  # noqa: F401  (import error -> fallback)
    from graphviz import Digraph

    shapes = ["box", "ellipse", "diamond", "oval", "component", "cylinder"]
    palettes = [
        ("#1f77b4", "#aec7e8"), ("#2ca02c", "#98df8a"), ("#ff7f0e", "#ffbb78"),
        ("#9467bd", "#c5b0d5"), ("#111827", "#e5e7eb"),
    ]
    written = 0
    for i in range(count):
        nodes = random.randint(4, 10)
        edge, fill = random.choice(palettes)
        g = Digraph(format="png")
        g.attr(rankdir=random.choice(["TB", "LR"]), bgcolor="white")
        g.attr("node", shape=random.choice(shapes), style="filled", fillcolor=fill, color=edge, fontname="Helvetica")
        g.attr("edge", color=edge)
        for n in range(nodes):
            g.node(str(n), random.choice(["Start", "Process", "Decision", "Input", "Output", "Store", "End", "Step"]) + f" {n}")
        for n in range(1, nodes):
            g.edge(str(random.randint(0, n - 1)), str(n))
        if random.random() < 0.5 and nodes > 3:
            g.edge(str(nodes - 1), str(random.randint(0, nodes - 2)))
        try:
            payload = g.pipe(format="png")
        except Exception:
            raise
        (dest / f"diagram_gv_{i:05d}.png").write_bytes(payload)
        written += 1
    return written


def _render_diagram_matplotlib(dest: Path, count: int) -> int:
    import matplotlib

    matplotlib.use("Agg")
    import matplotlib.pyplot as plt
    import networkx as nx

    written = 0
    for i in range(count):
        nodes = random.randint(5, 12)
        graph = nx.gnp_random_graph(nodes, 0.35, directed=random.random() < 0.5)
        if graph.number_of_edges() == 0:
            continue
        fig, ax = plt.subplots(figsize=(random.uniform(4, 7), random.uniform(3, 6)))
        pos = nx.spring_layout(graph, seed=i)
        nx.draw(
            graph, pos, ax=ax, with_labels=True, node_size=random.choice([700, 1100, 1500]),
            node_color=random.choice(["#aec7e8", "#98df8a", "#ffbb78", "#c5b0d5"]),
            edgecolors="#333333", font_size=9, arrows=graph.is_directed(),
        )
        ax.set_axis_off()
        fig.savefig(dest / f"diagram_mpl_{i:05d}.png", dpi=100, bbox_inches="tight")
        plt.close(fig)
        written += 1
    return written


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--classes", nargs="+", default=["code", "terminal", "diagram"],
                        choices=["code", "terminal", "diagram"])
    parser.add_argument("--count", type=int, default=1500, help="Images to synthesise per class.")
    parser.add_argument("--out-dir", type=Path, default=ROOT / "dataset",
                        help="Dataset root; images go to <out-dir>/raw/<class>/.")
    parser.add_argument("--code-source-dir", type=Path, default=REPO_ROOT,
                        help="Directory of real source files to render for the 'code' class.")
    parser.add_argument("--seed", type=int, default=42)
    args = parser.parse_args()

    random.seed(args.seed)

    for label in args.classes:
        dest = out_dir_for(args.out_dir, label)
        print(f"== synthesising {label} -> {dest} (count={args.count}) ==")
        if label == "code":
            snippets = collect_code_snippets(args.code_source_dir)
            print(f"  [code] {len(snippets)} source snippets available")
            written = render_code(snippets, dest, args.count)
        elif label == "terminal":
            written = render_terminal(dest, args.count)
        else:
            written = render_diagram(dest, args.count)
        print(f"  [{label}] synthesised {written} images")


if __name__ == "__main__":
    main()
