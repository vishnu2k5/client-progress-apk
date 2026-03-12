import React, { createContext, useContext } from 'react';
import { useColorScheme } from 'react-native';

const themes = {
  light: {
    mode: 'light',
    bg: '#f2f2f7',
    cardBg: '#ffffff',
    headerBg: '#ffffff',
    text: '#1c1c1e',
    textSecondary: '#636366',
    subText: '#8e8e93',
    border: '#e5e5ea',
    inputBg: '#ffffff',
    inputBorder: '#d1d1d6',
    primary: '#007aff',
    primaryBg: 'rgba(0,122,255,0.08)',
    accent: '#34c759',
    accentBg: 'rgba(52,199,89,0.08)',
    accentLight: 'rgba(52,199,89,0.15)',
    dotBg: '#f2f2f7',
    dotBorder: '#c7c7cc',
    line: '#d1d1d6',
    placeholder: '#c7c7cc',
    danger: '#ff3b30',
    dangerBg: 'rgba(255,59,48,0.1)',
    dangerBorder: 'rgba(255,59,48,0.2)',
    pending: '#ff9500',
    delivered: '#34c759',
    iconBg: 'rgba(0,122,255,0.12)',
    tabBg: '#e5e5ea',
    statusBar: 'dark',
  },
  dark: {
    mode: 'dark',
    bg: '#0f0f1a',
    cardBg: '#1a1a2e',
    headerBg: '#1a1a2e',
    text: '#ffffff',
    textSecondary: '#94a3b8',
    subText: '#4a4a6a',
    border: '#2a2a3e',
    inputBg: '#0f0f1a',
    inputBorder: '#2a2a3e',
    primary: '#22c55e',
    primaryBg: 'rgba(34,197,94,0.08)',
    accent: '#22c55e',
    accentBg: 'rgba(34,197,94,0.08)',
    accentLight: 'rgba(34,197,94,0.15)',
    dotBg: '#1a1a2e',
    dotBorder: '#3a3a4e',
    line: '#2a2a3e',
    placeholder: '#4a4a6a',
    danger: '#ef4444',
    dangerBg: 'rgba(239,68,68,0.15)',
    dangerBorder: 'rgba(239,68,68,0.3)',
    pending: '#f97316',
    delivered: '#22c55e',
    iconBg: 'rgba(34,197,94,0.15)',
    tabBg: '#0f0f1a',
    statusBar: 'light',
  },
};

const ThemeContext = createContext(themes.dark);

export function ThemeProvider({ children }) {
  const colorScheme = useColorScheme();
  const theme = themes[colorScheme === 'dark' ? 'dark' : 'light'];

  return (
    <ThemeContext.Provider value={theme}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
