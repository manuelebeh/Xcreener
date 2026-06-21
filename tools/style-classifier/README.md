# SnapGlow style classifier training

Offline tooling to fine-tune MobileNetV3-Small for screenshot content classification.

> **Statut (2026-06-21)** : scripts prêts **+ pipeline de constitution du dataset** (`fetch_dataset.py`, `synthesize.py`, `sources.json`). Lancer la repro ci-dessous pour générer `dataset/raw/`, entraîner et exporter. Tant que `export.py` n'a pas alimenté `apps/desktop/src-tauri/resources/models/`, l'app desktop utilise le classifieur heuristique.

## Classes

`code`, `ui`, `terminal`, `photo`, `diagram`, `text`

## Constituer le dataset (sources publiques, license-clean)

Sources, licences et conformité aux normes : **[`DATASET.md`](DATASET.md)**.

```bash
cd tools/style-classifier
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt

# Plan + licences (aucun téléchargement)
python scripts/fetch_dataset.py --dry-run

# Télécharge ui/photo/text + synthétise code/terminal/diagram → dataset/raw/<class>/
python scripts/fetch_dataset.py --limit 1500

# Split train/val/test
python scripts/collect.py --raw-dir dataset/raw --dataset-dir dataset
```

`fetch_dataset.py` délègue automatiquement `code`/`terminal`/`diagram` à
`synthesize.py` (rendu Pygments + Graphviz, license-clean). Pour collecter
manuellement, placer des images sous `dataset/raw/<class>/` puis lancer
`collect.py`.

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
