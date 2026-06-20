import { spacing } from '@snapglow/design-tokens/tokens.native';
import { Button, useTheme } from '@snapglow/ui-native';
import { useCallback, useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';

import type { BeautifyCanvasHandle } from '@/modules/editor/components/BeautifyCanvas';
import { useMobileRenderInput } from '@/modules/editor/hooks/useMobileRenderInput';

import { useExportStore } from '../store';
import { saveToPhotos } from '../utils/saveToPhotos';
import { shareExport } from '../utils/shareExport';
import { buildExportRenderInput, encodeSnapshotToFile } from '../utils/skiaExport';

interface ExportBarProps {
  canvasRef: React.RefObject<BeautifyCanvasHandle | null>;
}

export function ExportBar({ canvasRef }: ExportBarProps) {
  const { colors } = useTheme();
  const format = useExportStore((state) => state.format);
  const exporting = useExportStore((state) => state.exporting);
  const setExporting = useExportStore((state) => state.setExporting);
  const renderInput = useMobileRenderInput();
  const [status, setStatus] = useState<string | null>(null);

  const runExport = useCallback(async () => {
    const input = buildExportRenderInput(renderInput);
    if (!input) {
      return null;
    }
    void input;

    setExporting(true);
    try {
      const snapshot = await canvasRef.current?.makeSnapshot();
      return await encodeSnapshotToFile(snapshot, format);
    } finally {
      setExporting(false);
    }
  }, [canvasRef, format, renderInput, setExporting]);

  const handleSave = async () => {
    setStatus(null);
    const fileUri = await runExport();
    if (!fileUri) {
      Alert.alert('Export failed', 'Could not render the image.');
      return;
    }

    const saved = await saveToPhotos(fileUri);
    setStatus(saved ? 'Saved to Photos' : 'Photos permission denied');
  };

  const handleShare = async () => {
    setStatus(null);
    const fileUri = await runExport();
    if (!fileUri) {
      Alert.alert('Export failed', 'Could not render the image.');
      return;
    }

    const shared = await shareExport(fileUri, format);
    if (!shared) {
      Alert.alert('Share failed', 'Could not open the share sheet.');
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.row}>
        <Button variant="primary" disabled={exporting} onPress={handleSave} style={styles.button}>
          Save to Photos
        </Button>
        <Button
          variant="secondary"
          disabled={exporting}
          onPress={handleShare}
          style={styles.button}
        >
          Share
        </Button>
      </View>
      {status ? <Text style={{ color: colors.muted, fontSize: 13 }}>{status}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing['2'],
  },
  row: {
    flexDirection: 'row',
    gap: spacing['3'],
  },
  button: {
    flex: 1,
  },
});
