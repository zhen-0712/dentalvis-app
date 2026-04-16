// ===== DentalVis Design System =====

export const Colors = {
  jade:       '#03695e',
  jadeLight:  '#6daf5f',
  aqua:       '#239dca',
  aquaLight:  '#5bbcd4',
  linen:      '#e7e9d8',
  linenDark:  '#d4d8c0',
  ink:        '#1a2420',
  inkSoft:    '#2e3d38',
  muted:      '#5a7068',
  surface:    '#f4f6ef',
  surface2:   '#eaede3',
  white:      '#ffffff',
  redPlaque:  '#c0392b',

  jadeAlpha04: 'rgba(3,105,94,0.04)',
  jadeAlpha08: 'rgba(3,105,94,0.08)',
  jadeAlpha12: 'rgba(3,105,94,0.12)',
  jadeAlpha20: 'rgba(3,105,94,0.20)',
  jadeAlpha25: 'rgba(3,105,94,0.25)',
};

export const Gradients = {
  primary: ['#03695e', '#6daf5f'] as const,
  plaque:  ['#239dca', '#5bbcd4'] as const,
  hero:    ['#03695e', '#0e8a7c', '#239dca'] as const, // forest → sky
};

export const Radius = {
  sm:  6,
  md:  16,
  lg:  26,
  xl:  40,
};

export const Shadows = {
  sm: {
    shadowColor: '#03695e',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 8,
    elevation: 2,
  },
  md: {
    shadowColor: '#03695e',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.11,
    shadowRadius: 24,
    elevation: 6,
  },
  hero: {
    shadowColor: '#03695e',
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 0.22,
    shadowRadius: 40,
    elevation: 12,
  },
};

export const FontFamilies = {
  display:  'DMSerifDisplay_400Regular', // Latin-only brand text (DentalVis)
  heading:  'NotoSansTC_500Medium',      // Chinese page headings — round, clean
  body:     'NotoSansTC_400Regular',     // Chinese body / descriptions
  bodyMed:  'NotoSansTC_500Medium',      // Labels / buttons
};
