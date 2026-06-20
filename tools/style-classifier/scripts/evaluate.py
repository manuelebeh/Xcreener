#!/usr/bin/env python3
"""Evaluate a trained classifier on the held-out test split."""

from __future__ import annotations

import argparse
import json
from pathlib import Path

import torch
from torch.utils.data import DataLoader
from torchvision import datasets, transforms

from train import LABELS, build_model, evaluate


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--data-dir", type=Path, default=Path("dataset"))
    parser.add_argument("--checkpoint", type=Path, default=Path("artifacts/best.pt"))
    parser.add_argument("--report", type=Path, default=Path("artifacts/metrics.json"))
    args = parser.parse_args()

    transform = transforms.Compose(
        [
            transforms.Resize(256),
            transforms.CenterCrop(224),
            transforms.ToTensor(),
            transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225]),
        ]
    )

    test_dataset = datasets.ImageFolder(args.data_dir / "test", transform=transform)
    test_loader = DataLoader(test_dataset, batch_size=32, shuffle=False, num_workers=2)

    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    model = build_model(len(LABELS)).to(device)
    model.load_state_dict(torch.load(args.checkpoint, map_location=device))
    accuracy = evaluate(model, test_loader, device)

    report = {
        "accuracy": accuracy,
        "classes": LABELS,
        "samples": len(test_dataset),
        "gatePassed": accuracy >= 0.8,
    }

    args.report.parent.mkdir(parents=True, exist_ok=True)
    args.report.write_text(json.dumps(report, indent=2))
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
