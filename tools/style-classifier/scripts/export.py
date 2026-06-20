#!/usr/bin/env python3
"""Export trained PyTorch weights to TFLite and Core ML."""

from __future__ import annotations

import argparse
from pathlib import Path

import torch

from train import LABELS, build_model


def export_torchscript(model: torch.nn.Module, output_path: Path) -> None:
    model.eval()
    example = torch.randn(1, 3, 224, 224)
    traced = torch.jit.trace(model, example)
    traced.save(str(output_path))


def export_coreml(model: torch.nn.Module, output_path: Path) -> None:
    import coremltools as ct

    model.eval()
    example = torch.randn(1, 3, 224, 224)
    traced = torch.jit.trace(model, example)
    mlmodel = ct.convert(
        traced,
        inputs=[ct.TensorType(name="image", shape=example.shape)],
        classifier_config=ct.ClassifierConfig(LABELS),
    )
    mlmodel.save(str(output_path))


def export_tflite(model: torch.nn.Module, output_path: Path) -> None:
    try:
        import ai_edge_torch  # type: ignore
    except ImportError as error:
        raise SystemExit(
            "Install ai-edge-torch for TFLite export, or use onnx-tf conversion separately."
        ) from error

    model.eval()
    edge_model = ai_edge_torch.convert(model, (torch.randn(1, 3, 224, 224),))
    edge_model.export(str(output_path))


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--checkpoint", type=Path, default=Path("artifacts/best.pt"))
    parser.add_argument(
        "--desktop-models-dir",
        type=Path,
        default=Path(__file__).resolve().parents[3]
        / "apps/desktop/src-tauri/resources/models",
    )
    args = parser.parse_args()

    model = build_model(len(LABELS))
    model.load_state_dict(torch.load(args.checkpoint, map_location="cpu"))

    args.desktop_models_dir.mkdir(parents=True, exist_ok=True)
    (args.desktop_models_dir / "labels.json").write_text(
        __import__("json").dumps(LABELS, indent=2) + "\n"
    )

    export_torchscript(model, args.desktop_models_dir / "content_classifier.pt")
    export_coreml(model, args.desktop_models_dir / "content_classifier.mlmodel")

    tflite_path = args.desktop_models_dir / "content_classifier.tflite"
    try:
        export_tflite(model, tflite_path)
    except SystemExit as error:
        print(error)
        print("Core ML and TorchScript exports completed; TFLite export skipped.")

    print(f"Models exported to {args.desktop_models_dir}")


if __name__ == "__main__":
    main()
