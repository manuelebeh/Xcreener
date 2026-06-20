import { getTheme, type NativeTheme } from '@snapglow/design-tokens/tokens.native';
import { createContext, type ReactNode, useContext, useEffect, useMemo, useState } from 'react';
import { useColorScheme as useSystemColorScheme } from 'react-native';

export type ThemePreference = 'light' | 'dark' | 'system';
export type ResolvedTheme = 'light' | 'dark';

interface ThemeContextValue {
  theme: ThemePreference;
  resolvedTheme: ResolvedTheme;
  colors: NativeTheme;
  setTheme: (theme: ThemePreference) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export interface ThemeProviderProps {
  theme?: ThemePreference;
  onThemeChange?: (theme: ThemePreference) => void;
  children: ReactNode;
}

export function ThemeProvider({
  theme: themeProp = 'system',
  onThemeChange,
  children,
}: ThemeProviderProps) {
  const systemScheme = useSystemColorScheme();
  const [preference, setPreference] = useState<ThemePreference>(themeProp);

  useEffect(() => {
    setPreference(themeProp);
  }, [themeProp]);

  const resolvedTheme: ResolvedTheme =
    preference === 'system' ? (systemScheme === 'dark' ? 'dark' : 'light') : preference;

  const colors = useMemo(() => getTheme(resolvedTheme), [resolvedTheme]);

  const value = useMemo<ThemeContextValue>(
    () => ({
      theme: preference,
      resolvedTheme,
      colors,
      setTheme: (next) => {
        setPreference(next);
        onThemeChange?.(next);
      },
    }),
    [preference, resolvedTheme, colors, onThemeChange]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return ctx;
}
