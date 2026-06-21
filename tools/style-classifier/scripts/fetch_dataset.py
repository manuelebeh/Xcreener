#!/usr/bin/env python3
"""Constitute the style-classifier dataset from researched public sources.

Reads ``sources.json`` and, per class, either downloads images from a Hugging
Face dataset / snapshot or defers to ``synthesize.py`` (code, terminal,
diagram). Images are normalised and written to ``dataset/raw/<class>/`` so that
``collect.py`` can split them into train/val/test.

Downloaded images are NEVER committed (see ``.gitignore``); we only use them to
train an on-device classifier and do not redistribute them.

Examples
--------
    # Plan only (no download), see counts and licenses
    python scripts/fetch_dataset.py --dry-run

    # Download the download-strategy classes (ui, photo, text)
    python scripts/fetch_dataset.py --limit 1500

    # Just one class
    python scripts/fetch_dataset.py --classes photo --limit 1200
"""

from __future__ import annotations

import argparse
import hashlib
import io
import json
import shutil
import subprocess
import sys
from pathlib import Path

LABELS = ["code", "ui", "terminal", "photo", "diagram", "text"]
HERE = Path(__file__).resolve().parent
ROOT = HERE.parent
MIN_SIDE = 64  # drop thumbnails / icons


def load_sources(path: Path) -> dict:
    with path.open(encoding="utf-8") as handle:
        return json.load(handle)


def require_pillow():
    try:
        from PIL import Image  # noqa: F401
    except ImportError:  # pragma: no cover - environment guard
        raise SystemExit("Pillow is required: pip install -r requirements.txt")
    from PIL import Image

    return Image


def save_image(image, dest_dir: Path, seen: set[str], stem: str) -> bool:
    """Normalise to RGB PNG, dedup by content hash. Returns True if written."""
    from PIL import Image as PILImage

    if image.width < MIN_SIDE or image.height < MIN_SIDE:
        return False
    if image.mode not in ("RGB", "L"):
        image = image.convert("RGB")
    elif image.mode == "L":
        image = image.convert("RGB")

    buffer = io.BytesIO()
    image.save(buffer, format="PNG", optimize=False)
    payload = buffer.getvalue()
    digest = hashlib.sha1(payload).hexdigest()
    if digest in seen:
        return False
    seen.add(digest)

    dest = dest_dir / f"{stem}_{digest[:12]}.png"
    dest.write_bytes(payload)
    return True


def find_image_column(features) -> str | None:
    """Auto-detect the datasets.Image column so we are robust to schema drift."""
    from datasets import Image as HFImage

    for name, feature in features.items():
        if isinstance(feature, HFImage):
            return name
    # Fallback: common names.
    for candidate in ("image", "img", "screenshot", "page_image"):
        if candidate in features:
            return candidate
    return None


def fetch_hf_dataset(source: dict, label: str, dest_dir: Path, limit: int, seen: set[str]) -> int:
    from datasets import load_dataset

    repo = source["repo"]
    config = source.get("config")
    split = source.get("split", "train")
    print(f"  [{label}] streaming {repo}" + (f":{config}" if config else "") + f" split={split}")

    dataset = load_dataset(repo, config, split=split, streaming=True)
    image_column = None
    written = 0
    PILImage = require_pillow()

    for index, row in enumerate(dataset):
        if image_column is None:
            # Resolve column once we have feature info (streaming exposes it lazily).
            features = getattr(dataset, "features", None)
            image_column = find_image_column(features) if features else None
            if image_column is None:
                # Heuristic on the first row.
                for key, value in row.items():
                    if isinstance(value, PILImage.Image):
                        image_column = key
                        break
            if image_column is None:
                raise SystemExit(f"  [{label}] could not find an image column in {repo}")
            print(f"  [{label}] image column = '{image_column}'")

        value = row.get(image_column)
        if not isinstance(value, PILImage.Image):
            try:
                value = PILImage.open(io.BytesIO(value["bytes"])) if isinstance(value, dict) else None
            except Exception:
                value = None
        if value is None:
            continue

        if save_image(value, dest_dir, seen, stem=f"{label}_{repo.split('/')[-1]}_{index:06d}"):
            written += 1
        if written >= limit:
            break

    print(f"  [{label}] wrote {written} images from {repo}")
    return written


def fetch_hf_snapshot(source: dict, label: str, dest_dir: Path, limit: int, seen: set[str]) -> int:
    from huggingface_hub import snapshot_download

    repo = source["repo"]
    glob = source.get("glob", "**/*.png")
    print(f"  [{label}] snapshot_download {repo} (glob={glob})")
    local = Path(
        snapshot_download(repo_id=repo, repo_type=source.get("repo_type", "dataset"), allow_patterns=[glob])
    )

    PILImage = require_pillow()
    written = 0
    for index, path in enumerate(sorted(local.glob(glob))):
        try:
            with PILImage.open(path) as image:
                image.load()
                ok = save_image(image, dest_dir, seen, stem=f"{label}_{repo.split('/')[-1]}_{index:06d}")
        except Exception:
            ok = False
        if ok:
            written += 1
        if written >= limit:
            break

    print(f"  [{label}] wrote {written} images from {repo}")
    return written


def run_synthesis(label: str, dest_dir: Path, count: int) -> int:
    """Delegate code/terminal/diagram to synthesize.py."""
    script = HERE / "synthesize.py"
    cmd = [sys.executable, str(script), "--classes", label, "--count", str(count), "--out-dir", str(dest_dir.parent)]
    print(f"  [{label}] synthesising via {script.name} (count={count})")
    result = subprocess.run(cmd)
    if result.returncode != 0:
        print(f"  [{label}] synthesis failed (rc={result.returncode}); run synthesize.py manually")
        return 0
    return len(list(dest_dir.glob("*")))


def existing_count(dest_dir: Path) -> int:
    if not dest_dir.exists():
        return 0
    return sum(1 for _ in dest_dir.glob("*") if _.is_file())


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--sources", type=Path, default=ROOT / "sources.json")
    parser.add_argument("--raw-dir", type=Path, default=ROOT / "dataset" / "raw")
    parser.add_argument("--classes", nargs="*", default=LABELS, choices=LABELS)
    parser.add_argument("--limit", type=int, default=None, help="Override target per class.")
    parser.add_argument("--include-optional", action="store_true", help="Also pull research-only optional sources.")
    parser.add_argument("--skip-synthesis", action="store_true", help="Skip code/terminal/diagram synthesis.")
    parser.add_argument("--dry-run", action="store_true", help="Print the plan and licenses, download nothing.")
    args = parser.parse_args()

    config = load_sources(args.sources)
    default_target = args.limit or config.get("default_target_per_class", 1500)
    manifest: dict = {"target_per_class": default_target, "classes": {}}

    for label in args.classes:
        spec = config["classes"][label]
        dest_dir = args.raw_dir / label
        dest_dir.mkdir(parents=True, exist_ok=True)
        target = args.limit or default_target
        print(f"\n== {label} (strategy={spec['strategy']}, target={target}) ==")

        if args.dry_run:
            for source in spec["sources"]:
                tag = source.get("repo", source.get("kind"))
                print(f"  - {tag} | license={source.get('license')} | commercial={source.get('commercial')}")
                print(f"    {source.get('notes', '')}")
            manifest["classes"][label] = spec
            continue

        written = 0
        if spec["strategy"] == "synthesize":
            if args.skip_synthesis:
                print(f"  [{label}] skipped (--skip-synthesis)")
            else:
                written = run_synthesis(label, dest_dir, target)
        else:
            seen: set[str] = set()
            for source in spec["sources"]:
                if source.get("commercial") == "no" and not args.include_optional:
                    print(f"  [{label}] skipping optional/research source {source.get('repo')} (use --include-optional)")
                    continue
                remaining = target - written
                if remaining <= 0:
                    break
                kind = source["kind"]
                if kind == "hf_dataset":
                    written += fetch_hf_dataset(source, label, dest_dir, remaining, seen)
                elif kind == "hf_snapshot":
                    written += fetch_hf_snapshot(source, label, dest_dir, remaining, seen)
                else:
                    print(f"  [{label}] unknown source kind '{kind}', skipping")

        total = existing_count(dest_dir)
        manifest["classes"][label] = {"strategy": spec["strategy"], "sources": spec["sources"], "count_on_disk": total}
        flag = "OK" if total >= 500 else "LOW (<500, see README target)"
        print(f"  [{label}] total on disk = {total} [{flag}]")

    manifest_path = args.raw_dir.parent / "SOURCES.lock.json"
    manifest_path.parent.mkdir(parents=True, exist_ok=True)
    manifest_path.write_text(json.dumps(manifest, indent=2), encoding="utf-8")
    print(f"\nWrote provenance manifest -> {manifest_path}")
    if not args.dry_run:
        print("Next: python scripts/collect.py --raw-dir dataset/raw --dataset-dir dataset")


if __name__ == "__main__":
    main()
