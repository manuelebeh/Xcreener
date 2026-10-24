import { spacing } from '@snapglow/design-tokens/tokens.native';
import { Button, useTheme } from '@snapglow/ui-native';
import { Alert, StyleSheet, Text, View } from 'react-native';

import { isAccountConfigured } from '../config';
import { deleteAccount, signIn, signOut, useAccountStore, usePremiumAccess } from '../store';

const PLAN_LABELS = { free: 'Free', team_starter: 'Team Starter', team_pro: 'Team Pro' } as const;

function confirmDeleteAccount() {
  Alert.alert(
    'Delete cloud account',
    'This permanently deletes your SnapGlow cloud account and the data stored with it. Edits saved on this phone are kept.',
    [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete account', style: 'destructive', onPress: () => void deleteAccount() },
    ]
  );
}

export function AccountSection() {
  const { colors } = useTheme();
  const signedIn = useAccountStore((state) => state.signedIn);
  const entitlement = useAccountStore((state) => state.entitlement);
  const busy = useAccountStore((state) => state.busy);
  const error = useAccountStore((state) => state.error);
  const premium = usePremiumAccess();

  if (!isAccountConfigured()) {
    return null;
  }

  return (
    <View style={styles.section}>
      <Text style={[styles.title, { color: colors.foreground }]}>Account</Text>
      {signedIn ? (
        <Text style={{ color: colors.foreground }}>
          Plan: {PLAN_LABELS[entitlement?.plan ?? 'free']}
        </Text>
      ) : null}
      {premium ? null : (
        <Text style={[styles.note, { color: colors.muted }]}>
          Exports include the SnapGlow watermark. Upgrade from the desktop app: Settings → Team →
          Billing.
        </Text>
      )}
      {signedIn ? (
        <>
          <Button variant="secondary" onPress={() => void signOut()}>
            Sign out
          </Button>
          <Button variant="ghost" disabled={busy} onPress={confirmDeleteAccount}>
            Delete cloud account
          </Button>
        </>
      ) : (
        <Button variant="primary" disabled={busy} onPress={() => void signIn()}>
          {busy ? 'Signing in…' : 'Sign in'}
        </Button>
      )}
      {error ? (
        <Text style={[styles.note, { color: colors.destructive }]} accessibilityRole="alert">
          {error}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: spacing['3'],
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
  },
  note: {
    fontSize: 14,
    lineHeight: 20,
  },
});
