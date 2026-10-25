import { spacing } from '@xcreener/design-tokens/tokens.native';
import { Button, useTheme } from '@xcreener/ui-native';
import { useEffect, useState } from 'react';
import { StyleSheet, Switch, Text, View } from 'react-native';

import { useEditorStore } from '@/modules/editor/store';
import { useRedactionScan } from '../hooks/useRedactionScan';
import { getAutoRedactionEnabled, setAutoRedactionEnabled } from '../settings';
import { useRedactionStore } from '../store';

export function RedactionBar() {
  const { colors } = useTheme();
  const screenshot = useEditorStore((state) => state.screenshot);
  const status = useRedactionStore((state) => state.status);
  const detections = useRedactionStore((state) => state.detections);
  const error = useRedactionStore((state) => state.error);
  const { scan, maskAll } = useRedactionScan();
  const [autoRedaction, setAutoRedaction] = useState(false);

  useEffect(() => {
    void getAutoRedactionEnabled().then(setAutoRedaction);
  }, []);

  if (!screenshot) {
    return null;
  }

  const toggleAutoRedaction = async (value: boolean) => {
    setAutoRedaction(value);
    await setAutoRedactionEnabled(value);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.titleBlock}>
          <Text style={[styles.title, { color: colors.foreground }]}>Sensitive data</Text>
          <Text style={[styles.subtitle, { color: colors.muted }]}>
            On-device OCR scan · 1-click masking
          </Text>
        </View>
        <View style={styles.actions}>
          <Button
            variant="secondary"
            disabled={status === 'scanning'}
            onPress={() => void scan()}
            style={styles.actionButton}
          >
            {status === 'scanning' ? 'Scanning…' : 'Scan'}
          </Button>
          {detections.length > 0 ? (
            <Button variant="primary" onPress={() => maskAll(false)} style={styles.actionButton}>
              Mask all ({detections.length})
            </Button>
          ) : null}
        </View>
      </View>

      <View style={styles.autoRow}>
        <Text style={[styles.autoLabel, { color: colors.foreground }]}>Auto-redact on import</Text>
        <Switch value={autoRedaction} onValueChange={(value) => void toggleAutoRedaction(value)} />
      </View>

      {status === 'ready' && detections.length === 0 ? (
        <Text style={[styles.message, { color: colors.muted }]}>No sensitive data detected.</Text>
      ) : null}

      {error ? <Text style={[styles.message, { color: colors.destructive }]}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing['2'],
  },
  header: {
    gap: spacing['2'],
  },
  titleBlock: {
    gap: spacing['1'],
  },
  title: {
    fontSize: 14,
    fontWeight: '600',
  },
  subtitle: {
    fontSize: 12,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing['2'],
  },
  actionButton: {
    flex: 1,
  },
  autoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  autoLabel: {
    fontSize: 13,
  },
  message: {
    fontSize: 12,
  },
});
