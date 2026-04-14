// ===== DentalVis Design System =====
// 完全對應網頁版 CSS Variables

export const Colors = {
  jade:       '#03695e',
  jadeLight:  '#6daf5f',
  aqua:       '#239dca',
  aquaLight:  '#a5c6db',
  linen:      '#e7e9d8',
  linenDark:  '#d4d8c0',
  ink:        '#1a2420',
  inkSoft:    '#2e3d38',
  muted:      '#5a7068',
  surface:    '#f4f6ef',
  surface2:   '#eaede3',
  white:      '#ffffff',
  redPlaque:  '#c0392b',

  // 常用透明色
  jadeAlpha04: 'rgba(3,105,94,0.04)',
  jadeAlpha08: 'rgba(3,105,94,0.08)',
  jadeAlpha12: 'rgba(3,105,94,0.12)',
  jadeAlpha20: 'rgba(3,105,94,0.20)',
  jadeAlpha25: 'rgba(3,105,94,0.25)',
};

export const Gradients = {
  primary:  ['#03695e', '#6daf5f'] as const,   // btn-primary
  plaque:   ['#239dca', '#a5c6db'] as const,   // btn-plaque
};

export const Radius = {
  sm:  6,
  md:  14,
  lg:  24,
  xl:  40,
};

export const Shadows = {
  sm: {
    shadowColor: '#03695e',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  md: {
    shadowColor: '#03695e',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 32,
    elevation: 6,
  },
};

export const FontFamilies = {
  display: 'DMSerifDisplay_400Regular',
  body:    'DMSans_400Regular',
  bodyMed: 'DMSans_500Medium',
};
