#!/usr/bin/env python3
"""Prepare dataset folders and optionally split raw class directories."""

from __future__ import annotations

import argparse
import random
import shutil
from pathlib import Path

LABELS = ["code", "ui", "terminal", "photo", "diagram", "text"]
SPLITS = ("train", "val", "test")
RATIOS = (0.7, 0.15, 0.15)


def ensure_layout(root: Path) -> None:
    for split in SPLITS:
        for label in LABELS:
            (root / split / label).mkdir(parents=True, exist_ok=True)


def split_raw(raw_dir: Path, output_dir: Path, seed: int) -> None:
    ensure_layout(output_dir)
    random.seed(seed)

    for label in LABELS:
        source = raw_dir / label
        if not source.exists():
            print(f"skip missing class folder: {source}")
            continue

        files = [
            path
            for path in source.iterdir()
            if path.is_file() and path.suffix.lower() in {".png", ".jpg", ".jpeg", ".webp"}
        ]
        random.shuffle(files)

        train_count = int(len(files) * RATIOS[0])
        val_count = int(len(files) * RATIOS[1])
        buckets = {
            "train": files[:train_count],
            "val": files[train_count : train_count + val_count],
            "test": files[train_count + val_count :],
        }

        for split, items in buckets.items():
            target_dir = output_dir / split / label
            for item in items:
                shutil.copy2(item, target_dir / item.name)

        print(f"{label}: train={len(buckets['train'])} val={len(buckets['val'])} test={len(buckets['test'])}")


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--dataset-dir", type=Path, default=Path("dataset"))
    parser.add_argument("--raw-dir", type=Path, default=None)
    parser.add_argument("--seed", type=int, default=42)
    args = parser.parse_args()

    if args.raw_dir:
        split_raw(args.raw_dir, args.dataset_dir, args.seed)
    else:
        ensure_layout(args.dataset_dir)
        print(f"Created empty dataset layout at {args.dataset_dir}")


if __name__ == "__main__":
    main()
