import type { GradientPreset } from './types';

export const DEFAULT_GRADIENT_PRESET_ID = 'snapglow-brand';

export const DEFAULT_SOLID_COLOR = '#ede8e0';

const FALLBACK_PRESET: GradientPreset = {
  id: DEFAULT_GRADIENT_PRESET_ID,
  name: 'SnapGlow',
  angle: 160,
  stops: [
    { offset: 0, color: '#f2ece4' },
    { offset: 1, color: '#ddd4c8' },
  ],
};

export const GRADIENT_PRESETS: GradientPreset[] = [
  FALLBACK_PRESET,
  {
    id: 'sunset',
    name: 'Sunset',
    angle: 135,
    stops: [
      { offset: 0, color: '#f7e8d8' },
      { offset: 1, color: '#e8c4a8' },
    ],
  },
  {
    id: 'ocean',
    name: 'Ocean',
    angle: 135,
    stops: [
      { offset: 0, color: '#dce4ea' },
      { offset: 1, color: '#b8c9d4' },
    ],
  },
  {
    id: 'forest',
    name: 'Forest',
    angle: 135,
    stops: [
      { offset: 0, color: '#dce8df' },
      { offset: 1, color: '#b8cdbf' },
    ],
  },
  {
    id: 'midnight',
    name: 'Midnight',
    angle: 135,
    stops: [
      { offset: 0, color: '#2a2218' },
      { offset: 0.5, color: '#3d3428' },
      { offset: 1, color: '#2e2820' },
    ],
  },
  {
    id: 'peach',
    name: 'Peach',
    angle: 120,
    stops: [
      { offset: 0, color: '#f5ead8' },
      { offset: 1, color: '#e8c8a8' },
    ],
  },
  {
    id: 'lavender',
    name: 'Lavender',
    angle: 135,
    stops: [
      { offset: 0, color: '#ebe6df' },
      { offset: 1, color: '#d4ccc2' },
    ],
  },
  {
    id: 'rose-gold',
    name: 'Rose Gold',
    angle: 135,
    stops: [
      { offset: 0, color: '#f0dcc0' },
      { offset: 1, color: '#e8b898' },
    ],
  },
  {
    id: 'arctic',
    name: 'Arctic',
    angle: 180,
    stops: [
      { offset: 0, color: '#e6e9f0' },
      { offset: 1, color: '#eef1f5' },
    ],
  },
  {
    id: 'ember',
    name: 'Ember',
    angle: 45,
    stops: [
      { offset: 0, color: '#e8c4a8' },
      { offset: 1, color: '#c9956f' },
    ],
  },
  {
    id: 'aurora',
    name: 'Aurora',
    angle: 160,
    stops: [
      { offset: 0, color: '#e8eef2' },
      { offset: 1, color: '#c5d4de' },
    ],
  },
  {
    id: 'moss',
    name: 'Moss',
    angle: 90,
    stops: [
      { offset: 0, color: '#4a6258' },
      { offset: 1, color: '#7a9480' },
    ],
  },
  {
    id: 'candy',
    name: 'Candy',
    angle: 135,
    stops: [
      { offset: 0, color: '#f2ddd8' },
      { offset: 1, color: '#e4c4bc' },
    ],
  },
  {
    id: 'slate',
    name: 'Slate',
    angle: 135,
    stops: [
      { offset: 0, color: '#5a5a5a' },
      { offset: 1, color: '#3a3a3a' },
    ],
  },
  {
    id: 'sky',
    name: 'Sky',
    angle: 180,
    stops: [
      { offset: 0, color: '#dce4ea' },
      { offset: 1, color: '#c5d4de' },
    ],
  },
  {
    id: 'lime',
    name: 'Lime',
    angle: 90,
    stops: [
      { offset: 0, color: '#e4ead8' },
      { offset: 1, color: '#c8d4b8' },
    ],
  },
  {
    id: 'berry',
    name: 'Berry',
    angle: 135,
    stops: [
      { offset: 0, color: '#8a6a62' },
      { offset: 1, color: '#6f524b' },
    ],
  },
  {
    id: 'sand',
    name: 'Sand',
    angle: 120,
    stops: [
      { offset: 0, color: '#fdfcfb' },
      { offset: 1, color: '#e2d1c3' },
    ],
  },
  {
    id: 'copper',
    name: 'Copper',
    angle: 45,
    stops: [
      { offset: 0, color: '#b79891' },
      { offset: 1, color: '#94716b' },
    ],
  },
  {
    id: 'neon',
    name: 'Neon',
    angle: 135,
    stops: [
      { offset: 0, color: '#e6ddd2' },
      { offset: 0.5, color: '#d8cfc4' },
      { offset: 1, color: '#c9bfb4' },
    ],
  },
  {
    id: 'frost',
    name: 'Frost',
    angle: 180,
    stops: [
      { offset: 0, color: '#f5f7fa' },
      { offset: 1, color: '#c3cfe2' },
    ],
  },
  {
    id: 'mango',
    name: 'Mango',
    angle: 135,
    stops: [
      { offset: 0, color: '#f5e6c8' },
      { offset: 1, color: '#e8cfa0' },
    ],
  },
  {
    id: 'plum',
    name: 'Plum',
    angle: 135,
    stops: [
      { offset: 0, color: '#d4c0c8' },
      { offset: 1, color: '#b8a0aa' },
    ],
  },
  {
    id: 'mint',
    name: 'Mint',
    angle: 90,
    stops: [
      { offset: 0, color: '#dce8e4' },
      { offset: 1, color: '#c4d8d0' },
    ],
  },
  {
    id: 'charcoal',
    name: 'Charcoal',
    angle: 180,
    stops: [
      { offset: 0, color: '#232526' },
      { offset: 1, color: '#414345' },
    ],
  },
  {
    id: 'coral',
    name: 'Coral',
    angle: 135,
    stops: [
      { offset: 0, color: '#f0d4c8' },
      { offset: 1, color: '#e4b8a8' },
    ],
  },
  {
    id: 'indigo',
    name: 'Indigo',
    angle: 135,
    stops: [
      { offset: 0, color: '#c8ccd8' },
      { offset: 1, color: '#a8b0c0' },
    ],
  },
  {
    id: 'teal',
    name: 'Teal',
    angle: 90,
    stops: [
      { offset: 0, color: '#3a6878' },
      { offset: 1, color: '#588880' },
    ],
  },
  {
    id: 'blush',
    name: 'Blush',
    angle: 120,
    stops: [
      { offset: 0, color: '#f0d0d8' },
      { offset: 1, color: '#e8c0b0' },
    ],
  },
  {
    id: 'graphite',
    name: 'Graphite',
    angle: 180,
    stops: [
      { offset: 0, color: '#3a3834' },
      { offset: 1, color: '#5a5850' },
    ],
  },
  {
    id: 'honey',
    name: 'Honey',
    angle: 45,
    stops: [
      { offset: 0, color: '#f0dcc0' },
      { offset: 1, color: '#e8c898' },
    ],
  },
  {
    id: 'violet',
    name: 'Violet',
    angle: 135,
    stops: [
      { offset: 0, color: '#d0c8d8' },
      { offset: 1, color: '#b8aec8' },
    ],
  },
  {
    id: 'seafoam',
    name: 'Seafoam',
    angle: 90,
    stops: [
      { offset: 0, color: '#d0e4e0' },
      { offset: 1, color: '#b8d4cc' },
    ],
  },
  {
    id: 'wine',
    name: 'Wine',
    angle: 135,
    stops: [
      { offset: 0, color: '#3d2420' },
      { offset: 1, color: '#6b4038' },
    ],
  },
  {
    id: 'cloud',
    name: 'Cloud',
    angle: 180,
    stops: [
      { offset: 0, color: '#f9f7f4' },
      { offset: 1, color: '#e8e4de' },
    ],
  },
  {
    id: 'tropical',
    name: 'Tropical',
    angle: 135,
    stops: [
      { offset: 0, color: '#f0dcc8' },
      { offset: 1, color: '#e8d0a8' },
    ],
  },
  {
    id: 'steel',
    name: 'Steel',
    angle: 180,
    stops: [
      { offset: 0, color: '#485563' },
      { offset: 1, color: '#29323c' },
    ],
  },
  {
    id: 'bubblegum',
    name: 'Bubblegum',
    angle: 120,
    stops: [
      { offset: 0, color: '#f0d8d8' },
      { offset: 1, color: '#e8c8c0' },
    ],
  },
  {
    id: 'sage',
    name: 'Sage',
    angle: 90,
    stops: [
      { offset: 0, color: '#dce0d8' },
      { offset: 1, color: '#c8d0c0' },
    ],
  },
  {
    id: 'crimson',
    name: 'Crimson',
    angle: 45,
    stops: [
      { offset: 0, color: '#d8a8a8' },
      { offset: 1, color: '#c08888' },
    ],
  },
  {
    id: 'denim',
    name: 'Denim',
    angle: 135,
    stops: [
      { offset: 0, color: '#4a5568' },
      { offset: 1, color: '#6a7588' },
    ],
  },
  {
    id: 'lemon',
    name: 'Lemon',
    angle: 90,
    stops: [
      { offset: 0, color: '#f5f0d8' },
      { offset: 1, color: '#e8dbb8' },
    ],
  },
  {
    id: 'obsidian',
    name: 'Obsidian',
    angle: 180,
    stops: [
      { offset: 0, color: '#2a2a2a' },
      { offset: 1, color: '#4a4a4a' },
    ],
  },
  {
    id: 'cotton',
    name: 'Cotton',
    angle: 120,
    stops: [
      { offset: 0, color: '#fdfbfb' },
      { offset: 1, color: '#ebedee' },
    ],
  },
  {
    id: 'fire',
    name: 'Fire',
    angle: 45,
    stops: [
      { offset: 0, color: '#e8b898' },
      { offset: 1, color: '#d89868' },
    ],
  },
  {
    id: 'jade',
    name: 'Jade',
    angle: 135,
    stops: [
      { offset: 0, color: '#c8d8b8' },
      { offset: 1, color: '#a8c098' },
    ],
  },
  {
    id: 'orchid',
    name: 'Orchid',
    angle: 135,
    stops: [
      { offset: 0, color: '#ddd0c8' },
      { offset: 1, color: '#c4b5ab' },
    ],
  },
  {
    id: 'dusk',
    name: 'Dusk',
    angle: 160,
    stops: [
      { offset: 0, color: '#5a5048' },
      { offset: 1, color: '#6a5a68' },
    ],
  },
  {
    id: 'cream',
    name: 'Cream',
    angle: 90,
    stops: [
      { offset: 0, color: '#fff1eb' },
      { offset: 1, color: '#e8ddd0' },
    ],
  },
  {
    id: 'ruby',
    name: 'Ruby',
    angle: 135,
    stops: [
      { offset: 0, color: '#d8a0a0' },
      { offset: 1, color: '#b88080' },
    ],
  },
  {
    id: 'azure',
    name: 'Azure',
    angle: 180,
    stops: [
      { offset: 0, color: '#c8d8e0' },
      { offset: 1, color: '#a8c0d0' },
    ],
  },
  {
    id: 'olive',
    name: 'Olive',
    angle: 90,
    stops: [
      { offset: 0, color: '#c8c8b8' },
      { offset: 1, color: '#a8a898' },
    ],
  },
  {
    id: 'mauve',
    name: 'Mauve',
    angle: 135,
    stops: [
      { offset: 0, color: '#dcd0d8' },
      { offset: 1, color: '#c4b4c0' },
    ],
  },
  {
    id: 'pine',
    name: 'Pine',
    angle: 180,
    stops: [
      { offset: 0, color: '#2a2820' },
      { offset: 0.5, color: '#3a3830' },
      { offset: 1, color: '#4a4840' },
    ],
  },
  {
    id: 'apricot',
    name: 'Apricot',
    angle: 120,
    stops: [
      { offset: 0, color: '#f0dcc8' },
      { offset: 1, color: '#e8c4a8' },
    ],
  },
  {
    id: 'mono-light',
    name: 'Mono Light',
    angle: 180,
    stops: [
      { offset: 0, color: '#f0f0f0' },
      { offset: 1, color: '#d9d9d9' },
    ],
  },
  {
    id: 'mono-dark',
    name: 'Mono Dark',
    angle: 180,
    stops: [
      { offset: 0, color: '#1a1a1a' },
      { offset: 1, color: '#333333' },
    ],
  },
];

export function getGradientPreset(id: string): GradientPreset {
  return GRADIENT_PRESETS.find((entry) => entry.id === id) ?? FALLBACK_PRESET;
}
