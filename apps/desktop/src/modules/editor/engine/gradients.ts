import type { GradientPreset } from '../types';

export const DEFAULT_GRADIENT_PRESET_ID = 'snapglow-brand';

const FALLBACK_PRESET: GradientPreset = {
  id: DEFAULT_GRADIENT_PRESET_ID,
  name: 'SnapGlow',
  angle: 135,
  stops: [
    { offset: 0, color: '#667eea' },
    { offset: 1, color: '#764ba2' },
  ],
};

export const GRADIENT_PRESETS: GradientPreset[] = [
  FALLBACK_PRESET,
  {
    id: 'sunset',
    name: 'Sunset',
    angle: 135,
    stops: [
      { offset: 0, color: '#f093fb' },
      { offset: 1, color: '#f5576c' },
    ],
  },
  {
    id: 'ocean',
    name: 'Ocean',
    angle: 135,
    stops: [
      { offset: 0, color: '#4facfe' },
      { offset: 1, color: '#00f2fe' },
    ],
  },
  {
    id: 'forest',
    name: 'Forest',
    angle: 135,
    stops: [
      { offset: 0, color: '#11998e' },
      { offset: 1, color: '#38ef7d' },
    ],
  },
  {
    id: 'midnight',
    name: 'Midnight',
    angle: 135,
    stops: [
      { offset: 0, color: '#0f0c29' },
      { offset: 0.5, color: '#302b63' },
      { offset: 1, color: '#24243e' },
    ],
  },
  {
    id: 'peach',
    name: 'Peach',
    angle: 120,
    stops: [
      { offset: 0, color: '#ffecd2' },
      { offset: 1, color: '#fcb69f' },
    ],
  },
  {
    id: 'lavender',
    name: 'Lavender',
    angle: 135,
    stops: [
      { offset: 0, color: '#e0c3fc' },
      { offset: 1, color: '#8ec5fc' },
    ],
  },
  {
    id: 'rose-gold',
    name: 'Rose Gold',
    angle: 135,
    stops: [
      { offset: 0, color: '#f6d365' },
      { offset: 1, color: '#fda085' },
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
      { offset: 0, color: '#ff416c' },
      { offset: 1, color: '#ff4b2b' },
    ],
  },
  {
    id: 'aurora',
    name: 'Aurora',
    angle: 160,
    stops: [
      { offset: 0, color: '#00c6ff' },
      { offset: 1, color: '#0072ff' },
    ],
  },
  {
    id: 'moss',
    name: 'Moss',
    angle: 90,
    stops: [
      { offset: 0, color: '#134e5e' },
      { offset: 1, color: '#71b280' },
    ],
  },
  {
    id: 'candy',
    name: 'Candy',
    angle: 135,
    stops: [
      { offset: 0, color: '#ff9a9e' },
      { offset: 1, color: '#fecfef' },
    ],
  },
  {
    id: 'slate',
    name: 'Slate',
    angle: 135,
    stops: [
      { offset: 0, color: '#434343' },
      { offset: 1, color: '#000000' },
    ],
  },
  {
    id: 'sky',
    name: 'Sky',
    angle: 180,
    stops: [
      { offset: 0, color: '#a1c4fd' },
      { offset: 1, color: '#c2e9fb' },
    ],
  },
  {
    id: 'lime',
    name: 'Lime',
    angle: 90,
    stops: [
      { offset: 0, color: '#d4fc79' },
      { offset: 1, color: '#96e6a1' },
    ],
  },
  {
    id: 'berry',
    name: 'Berry',
    angle: 135,
    stops: [
      { offset: 0, color: '#8e2de2' },
      { offset: 1, color: '#4a00e0' },
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
      { offset: 0, color: '#12c2e9' },
      { offset: 0.5, color: '#c471ed' },
      { offset: 1, color: '#f64f59' },
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
      { offset: 0, color: '#ffe259' },
      { offset: 1, color: '#ffa751' },
    ],
  },
  {
    id: 'plum',
    name: 'Plum',
    angle: 135,
    stops: [
      { offset: 0, color: '#cc2b5e' },
      { offset: 1, color: '#753a88' },
    ],
  },
  {
    id: 'mint',
    name: 'Mint',
    angle: 90,
    stops: [
      { offset: 0, color: '#a8edea' },
      { offset: 1, color: '#fed6e3' },
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
      { offset: 0, color: '#ff6b6b' },
      { offset: 1, color: '#feca57' },
    ],
  },
  {
    id: 'indigo',
    name: 'Indigo',
    angle: 135,
    stops: [
      { offset: 0, color: '#3a1c71' },
      { offset: 1, color: '#d76d77' },
    ],
  },
  {
    id: 'teal',
    name: 'Teal',
    angle: 90,
    stops: [
      { offset: 0, color: '#136a8a' },
      { offset: 1, color: '#267871' },
    ],
  },
  {
    id: 'blush',
    name: 'Blush',
    angle: 120,
    stops: [
      { offset: 0, color: '#ffafbd' },
      { offset: 1, color: '#ffc3a0' },
    ],
  },
  {
    id: 'graphite',
    name: 'Graphite',
    angle: 180,
    stops: [
      { offset: 0, color: '#2c3e50' },
      { offset: 1, color: '#4ca1af' },
    ],
  },
  {
    id: 'honey',
    name: 'Honey',
    angle: 45,
    stops: [
      { offset: 0, color: '#f7971e' },
      { offset: 1, color: '#ffd200' },
    ],
  },
  {
    id: 'violet',
    name: 'Violet',
    angle: 135,
    stops: [
      { offset: 0, color: '#654ea3' },
      { offset: 1, color: '#eaafc8' },
    ],
  },
  {
    id: 'seafoam',
    name: 'Seafoam',
    angle: 90,
    stops: [
      { offset: 0, color: '#1cd8d2' },
      { offset: 1, color: '#93edc7' },
    ],
  },
  {
    id: 'wine',
    name: 'Wine',
    angle: 135,
    stops: [
      { offset: 0, color: '#200122' },
      { offset: 1, color: '#6f0000' },
    ],
  },
  {
    id: 'cloud',
    name: 'Cloud',
    angle: 180,
    stops: [
      { offset: 0, color: '#ffffff' },
      { offset: 1, color: '#e6e6e6' },
    ],
  },
  {
    id: 'tropical',
    name: 'Tropical',
    angle: 135,
    stops: [
      { offset: 0, color: '#f83600' },
      { offset: 1, color: '#f9d423' },
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
      { offset: 0, color: '#ff9a9e' },
      { offset: 1, color: '#fad0c4' },
    ],
  },
  {
    id: 'sage',
    name: 'Sage',
    angle: 90,
    stops: [
      { offset: 0, color: '#c9d6ff' },
      { offset: 1, color: '#e2e2e2' },
    ],
  },
  {
    id: 'crimson',
    name: 'Crimson',
    angle: 45,
    stops: [
      { offset: 0, color: '#eb3349' },
      { offset: 1, color: '#f45c43' },
    ],
  },
  {
    id: 'denim',
    name: 'Denim',
    angle: 135,
    stops: [
      { offset: 0, color: '#1e3c72' },
      { offset: 1, color: '#2a5298' },
    ],
  },
  {
    id: 'lemon',
    name: 'Lemon',
    angle: 90,
    stops: [
      { offset: 0, color: '#f7ff00' },
      { offset: 1, color: '#db36a4' },
    ],
  },
  {
    id: 'obsidian',
    name: 'Obsidian',
    angle: 180,
    stops: [
      { offset: 0, color: '#000000' },
      { offset: 1, color: '#434343' },
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
      { offset: 0, color: '#f12711' },
      { offset: 1, color: '#f5af19' },
    ],
  },
  {
    id: 'jade',
    name: 'Jade',
    angle: 135,
    stops: [
      { offset: 0, color: '#56ab2f' },
      { offset: 1, color: '#a8e063' },
    ],
  },
  {
    id: 'orchid',
    name: 'Orchid',
    angle: 135,
    stops: [
      { offset: 0, color: '#da22ff' },
      { offset: 1, color: '#9733ee' },
    ],
  },
  {
    id: 'dusk',
    name: 'Dusk',
    angle: 160,
    stops: [
      { offset: 0, color: '#2b5876' },
      { offset: 1, color: '#4e4376' },
    ],
  },
  {
    id: 'cream',
    name: 'Cream',
    angle: 90,
    stops: [
      { offset: 0, color: '#fff1eb' },
      { offset: 1, color: '#ace0f9' },
    ],
  },
  {
    id: 'ruby',
    name: 'Ruby',
    angle: 135,
    stops: [
      { offset: 0, color: '#e52d27' },
      { offset: 1, color: '#b31217' },
    ],
  },
  {
    id: 'azure',
    name: 'Azure',
    angle: 180,
    stops: [
      { offset: 0, color: '#2193b0' },
      { offset: 1, color: '#6dd5ed' },
    ],
  },
  {
    id: 'olive',
    name: 'Olive',
    angle: 90,
    stops: [
      { offset: 0, color: '#808080' },
      { offset: 1, color: '#3fada8' },
    ],
  },
  {
    id: 'mauve',
    name: 'Mauve',
    angle: 135,
    stops: [
      { offset: 0, color: '#c471f5' },
      { offset: 1, color: '#fa71cd' },
    ],
  },
  {
    id: 'pine',
    name: 'Pine',
    angle: 180,
    stops: [
      { offset: 0, color: '#0f2027' },
      { offset: 0.5, color: '#203a43' },
      { offset: 1, color: '#2c5364' },
    ],
  },
  {
    id: 'apricot',
    name: 'Apricot',
    angle: 120,
    stops: [
      { offset: 0, color: '#ff9a56' },
      { offset: 1, color: '#ff6a88' },
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
