import { spacing } from '@xcreener/design-tokens/tokens.native';
import { Button, useTheme } from '@xcreener/ui-native';
import { StatusBar } from 'expo-status-bar';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AccountSection } from '@/modules/account';

export default function HomeScreen() {
  const { colors, resolvedTheme, theme, setTheme } = useTheme();

  const toggleTheme = () => {
    if (theme === 'system') {
      setTheme(resolvedTheme === 'dark' ? 'light' : 'dark');
      return;
    }
    setTheme(theme === 'dark' ? 'light' : 'dark');
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      <StatusBar style={resolvedTheme === 'dark' ? 'light' : 'dark'} />
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={[styles.title, { color: colors.foreground }]}>Xcreener</Text>
        <Text style={[styles.subtitle, { color: colors.muted }]}>
          Share a screenshot from Photos or any app to import it here.
        </Text>

        <AccountSection />

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Design tokens</Text>
          <View style={styles.row}>
            <Button variant="primary">Primary</Button>
            <Button variant="secondary">Secondary</Button>
          </View>
          <View style={styles.row}>
            <Button variant="ghost">Ghost</Button>
            <Button variant="destructive">Destructive</Button>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Theme</Text>
          <Button variant="secondary" onPress={toggleTheme}>
            Switch to {resolvedTheme === 'dark' ? 'light' : 'dark'} mode
          </Button>
        </View>

        <View
          style={[styles.swatch, { backgroundColor: colors.surface, borderColor: colors.border }]}
        >
          <View style={[styles.dot, { backgroundColor: colors.primary }]} />
          <Text style={{ color: colors.foreground }}>Primary · Surface · Border tokens</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
  },
  content: {
    padding: spacing['6'],
    gap: spacing['6'],
  },
  title: {
    fontSize: 28,
    fontWeight: '600',
  },
  subtitle: {
    fontSize: 16,
    lineHeight: 24,
  },
  section: {
    gap: spacing['3'],
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing['3'],
  },
  swatch: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing['3'],
    padding: spacing['4'],
    borderRadius: 12,
    borderWidth: 1,
  },
  dot: {
    width: 16,
    height: 16,
    borderRadius: 8,
  },
});
