import { createTheme, rem } from '@mantine/core';

export const theme = createTheme({
  fontFamily: '"Noto Sans JP", "Segoe UI", sans-serif',
  headings: {
    fontFamily: '"Noto Sans JP", "Segoe UI", sans-serif',
    fontWeight: '700',
    sizes: {
      h1: { fontSize: rem(28), lineHeight: '1.25' },
      h2: { fontSize: rem(20), lineHeight: '1.3' },
      h3: { fontSize: rem(16), lineHeight: '1.35' },
    },
  },
  primaryColor: 'kotcya',
  primaryShade: { light: 6, dark: 5 },
  defaultRadius: 'sm',
  colors: {
    kotcya: [
      '#eef8f0',
      '#dceee0',
      '#b9ddc1',
      '#91c89e',
      '#6ab37d',
      '#4c9c63',
      '#347e4c',
      '#29653e',
      '#214f33',
      '#173a26',
    ],
  },
  black: '#1a1f24',
  white: '#ffffff',
  components: {
    Button: {
      defaultProps: { radius: 'sm' },
    },
    Badge: {
      defaultProps: { radius: 'sm', variant: 'light' },
    },
    Paper: {
      defaultProps: { radius: 'sm', shadow: 'none', withBorder: true },
    },
    Tabs: {
      defaultProps: { radius: 'sm', color: 'kotcya' },
    },
    SegmentedControl: {
      defaultProps: { radius: 'sm', color: 'kotcya' },
    },
  },
});
