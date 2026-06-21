# SnapGlow style-classifier dataset

How the dataset for **AI-001** (Sprint 2b.1 — Suggestion de style IA) is constituted.

Six classes drive the style-suggestion mapping (`@snapglow/style-suggestion-core`):
`code`, `ui`, `terminal`, `photo`, `diagram`, `text`.

The dataset is **constituted reproducibly from researched public sources**, not
checked into the repo. Downloaded/synthesised images land in
`dataset/raw/<class>/` (git-ignored), then `collect.py` splits them into
`train/val/test`. Target: **500–2000 images per class** before augmentation.

## Norms compliance

| Project norm | How it is met |
|---|---|
| On-device, no personal data | Public datasets + synthetic renders only; no PII, no user captures committed. |
| No image redistribution | Images stay local (`.gitignore`); we ship only the trained `.tflite` / `.mlmodel`. |
| License-clean for a commercial app | `text` = CDLA-Permissive; `code`/`terminal`/`diagram` = synthetic (clean); `photo` = Unsplash license (commercial OK, no redistribution); `ui` research source flagged. |
| Reproducible | `sources.json` (manifest) + `fetch_dataset.py` + `synthesize.py`; provenance written to `SOURCES.lock.json`. |
| ≥ 80 % accuracy gate | Balanced ~1500/class feeds `train.py` → `evaluate.py` gate. |

## Sources (researched)

| Class | Strategy | Primary source | License | Commercial |
|---|---|---|---|---|
| `ui` | download | [`biglab/webui-7k`](https://huggingface.co/datasets/biglab/webui-7k) (WebUI, CHI 2023) | other / research ([COPYRIGHT](https://github.com/js0nwu/webui/blob/main/COPYRIGHT.txt)) | review-required |
| `ui` (optional) | download | [`creative-graphic-design/Rico`](https://huggingface.co/datasets/creative-graphic-design/Rico) (mobile UI) | research-only | no |
| `photo` | download | [`1aurent/unsplash-lite`](https://huggingface.co/datasets/1aurent/unsplash-lite) (~25k) | Unsplash Dataset License | yes, no redistribution |
| `text` | download | [`pierreguillou/DocLayNet-base`](https://huggingface.co/datasets/pierreguillou/DocLayNet-base) (IBM DocLayNet) | CDLA-Permissive-1.0 | **yes** |
| `code` | synthesize | Pygments render of permissive source (defaults to this repo) | generated (clean) | **yes** |
| `terminal` | synthesize | Pygments console render + window chrome | generated (clean) | **yes** |
| `diagram` | synthesize | Graphviz random flowcharts/DAGs (networkx fallback) | generated (clean) | **yes** |

> **Licensing note.** For a fully commercial-clean model, run with the defaults
> (DocLayNet + Unsplash + synthetic). The `ui` web source (WebUI) and the
> optional Rico mobile set are research-leaning — keep them for internal/QA
> models, or replace `ui` with synthesised browser-chrome renders before any
> commercial release. `--include-optional` is required to pull Rico.

Alternatives considered: `aharley/rvl_cdip` (text — dropped, research-only),
Kaggle "Graphs Dataset" / "Flowchart 3b" (diagram — dropped to avoid Kaggle auth
and keep synthesis license-clean), `image-search-2/unsplash_lite_image_dataset`
(photo — interchangeable mirror).

## Reproduce

```bash
cd tools/style-classifier
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt

# 0. (optional) see the plan + licenses without downloading
python scripts/fetch_dataset.py --dry-run

# 1a. download download-strategy classes (ui, photo, text)
python scripts/fetch_dataset.py --classes ui photo text --limit 1500

# 1b. synthesise license-clean classes (code, terminal, diagram)
python scripts/synthesize.py --classes code terminal diagram --count 1500
#     (fetch_dataset.py also triggers synthesis automatically for these classes)

# 2. split into train/val/test
python scripts/collect.py --raw-dir dataset/raw --dataset-dir dataset

# 3. train + gate (>= 80%) + export
python scripts/train.py --data-dir dataset --output-dir artifacts --epochs 10
python scripts/evaluate.py --data-dir dataset --checkpoint artifacts/best.pt
python scripts/export.py --checkpoint artifacts/best.pt
```

`diagram` synthesis needs the Graphviz `dot` binary (`brew install graphviz`);
without it the script falls back to matplotlib + networkx automatically.

## Provenance

`fetch_dataset.py` writes `SOURCES.lock.json` recording, per class, the sources
used and the image count on disk — keep it with each trained artifact so the
dataset behind a shipped model is auditable.
