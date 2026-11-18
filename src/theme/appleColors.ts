import { useColorScheme } from 'react-native';

export interface ApplePalette {
  isDark: boolean;
  groupedBackground: string;
  secondaryGroupedBackground: string;
  cellHighlight: string;
  tertiaryFill: string;
  separator: string;
  label: string;
  secondaryLabel: string;
  tertiaryLabel: string;
  blue: string;
  green: string;
  orange: string;
  red: string;
  purple: string;
  indigo: string;
  teal: string;
  cyan: string;
  mint: string;
  gray: string;
}

const lightPalette: ApplePalette = {
  isDark: false,
  groupedBackground: '#F2F2F7',
  secondaryGroupedBackground: '#FFFFFF',
  cellHighlight: '#E5E5EA',
  tertiaryFill: 'rgba(118, 118, 128, 0.12)',
  separator: 'rgba(60, 60, 67, 0.18)',
  label: '#000000',
  secondaryLabel: 'rgba(60, 60, 67, 0.6)',
  tertiaryLabel: 'rgba(60, 60, 67, 0.35)',
  blue: '#007AFF',
  green: '#34C759',
  orange: '#FF9500',
  red: '#FF3B30',
  purple: '#AF52DE',
  indigo: '#5856D6',
  teal: '#30B0C7',
  cyan: '#32ADE6',
  mint: '#00C7BE',
  gray: '#8E8E93',
};

const darkPalette: ApplePalette = {
  isDark: true,
  groupedBackground: '#000000',
  secondaryGroupedBackground: '#1C1C1E',
  cellHighlight: '#2C2C2E',
  tertiaryFill: 'rgba(118, 118, 128, 0.24)',
  separator: 'rgba(84, 84, 88, 0.55)',
  label: '#FFFFFF',
  secondaryLabel: 'rgba(235, 235, 245, 0.6)',
  tertiaryLabel: 'rgba(235, 235, 245, 0.35)',
  blue: '#0A84FF',
  green: '#30D158',
  orange: '#FF9F0A',
  red: '#FF453A',
  purple: '#BF5AF2',
  indigo: '#5E5CE6',
  teal: '#40CBE0',
  cyan: '#64D2FF',
  mint: '#66D4CF',
  gray: '#8E8E93',
};

export function useAppleTheme(): ApplePalette {
  const scheme = useColorScheme();
  return scheme === 'dark' ? darkPalette : lightPalette;
}
