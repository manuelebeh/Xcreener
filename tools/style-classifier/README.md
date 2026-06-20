# SnapGlow style classifier training

Offline tooling to fine-tune MobileNetV3-Small for screenshot content classification.

> **Statut (2026-06-20)** : scripts prêts ; **dataset non collecté** → pas de modèle exporté. L'app desktop utilise un classifieur heuristique jusqu'à ce que `export.py` alimente `apps/desktop/src-tauri/resources/models/`.

## Classes

`code`, `ui`, `terminal`, `photo`, `diagram`, `text`

## Dataset layout

Place screenshots under `dataset/raw/<class>/` then split:

```bash
cd tools/style-classifier
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
python scripts/collect.py --raw-dir dataset/raw --dataset-dir dataset
```

Expected split:

```
dataset/
  train/<class>/
  val/<class>/
  test/<class>/
```

Target: 500–2000 images per class before augmentation.

## Train

```bash
python scripts/train.py --data-dir dataset --output-dir artifacts --epochs 10
```

## Evaluate (gate ≥ 80 %)

```bash
python scripts/evaluate.py --data-dir dataset --checkpoint artifacts/best.pt
```

Writes `artifacts/metrics.json` with `gatePassed`.

## Export to desktop bundle

```bash
python scripts/export.py --checkpoint artifacts/best.pt
```

Copies models into `apps/desktop/src-tauri/resources/models/`:

- `content_classifier.tflite` (Windows + macOS fallback)
- `content_classifier.mlmodel` (macOS)
- `labels.json`

When no TFLite model is present, the desktop app falls back to an on-device heuristic classifier so development builds keep working.

## Collection tips

| Class | Suggested sources |
|-------|-------------------|
| code | IDE, GitHub, editor screenshots |
| ui | Web apps, dashboards, settings screens |
| terminal | iTerm, PowerShell, logs |
| photo | Camera roll shares, photo viewers |
| diagram | Figma, Mermaid, whiteboards |
| text | PDF readers, docs, articles |

Keep screenshots PNG/JPG/WebP. Avoid personal data in committed datasets.
