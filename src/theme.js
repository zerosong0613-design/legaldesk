import { createTheme } from '@mantine/core';

const teal = [
  '#e6fcf5','#c3fae8','#96f2d7','#63e6be',
  '#38d9a9','#20c997','#12b886','#0ca678','#099268','#087f5b'
];

const dark = [
  '#f8f9fa','#f1f3f5','#e9ecef','#dee2e6',
  '#ced4da','#adb5bd','#868e96','#495057','#343a40','#1d2124'
];

export const legalDeskTheme = createTheme({
  primaryColor: 'indigo',
  colors: { teal, dark },

  fontFamily: "'Karla', -apple-system, sans-serif",
  fontFamilyMonospace: "'JetBrains Mono', monospace",
  headings: {
    fontFamily: "'Noto Serif KR', serif",
    fontWeight: '700',
  },

  radius: {
    xs: '4px', sm: '6px', md: '8px', lg: '12px', xl: '16px',
  },
  defaultRadius: 'md',

  components: {
    Badge: {
      defaultProps: { variant: 'light', radius: 'sm' },
    },
    Card: {
      defaultProps: { radius: 'lg', withBorder: true },
      styles: { root: { boxShadow: '0 1px 3px rgba(0,0,0,.06)' } },
    },
    TextInput: {
      defaultProps: { radius: 'md' },
    },
    Button: {
      defaultProps: { radius: 'md' },
    },
    SegmentedControl: {
      defaultProps: { radius: 'md' },
    },
    Timeline: {
      defaultProps: { bulletSize: 32, lineWidth: 2 },
    },
  },
});
