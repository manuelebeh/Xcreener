import { spacing } from '@snapglow/design-tokens/tokens.native';
import { Button, useTheme } from '@snapglow/ui-native';
import { useCallback, useRef, useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';

import type { BeautifyCanvasHandle } from '@/modules/editor/components/BeautifyCanvas';
import { useMobileRenderInput } from '@/modules/editor/hooks/useMobileRenderInput';

import { useExportStore } from '../store';
import { saveToPhotos } from '../utils/saveToPhotos';
import { shareExport } from '../utils/shareExport';
import { buildExportRenderInput, encodeSnapshotToFile } from '../utils/skiaExport';
import { ExportCanvas, type ExportCanvasHandle } from './ExportCanvas';

interface ExportBarProps {
  canvasRef: React.RefObject<BeautifyCanvasHandle | null>;
}

export function ExportBar({ canvasRef }: ExportBarProps) {
  const { colors } = useTheme();
  const format = useExportStore((state) => state.format);
  const exporting = useExportStore((state) => state.exporting);
  const setExporting = useExportStore((state) => state.setExporting);
  const renderInput = useMobileRenderInput();
  const exportInput = buildExportRenderInput(renderInput);
  const exportCanvasRef = useRef<ExportCanvasHandle>(null);
  const [status, setStatus] = useState<string | null>(null);

  const runExport = useCallback(async () => {
    if (!exportInput) {
      return null;
    }

    setExporting(true);
    try {
      const snapshot =
        (await exportCanvasRef.current?.makeSnapshot()) ??
        (await canvasRef.current?.makeSnapshot());
      const fileUri = await encodeSnapshotToFile(snapshot, format);
      return fileUri;
    } finally {
      setExporting(false);
    }
  }, [canvasRef, exportInput, format, setExporting]);

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
      {exportInput ? <ExportCanvas ref={exportCanvasRef} input={exportInput} /> : null}
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
      {exportInput?.watermark ? (
        <Text style={{ color: colors.muted, fontSize: 13 }}>Free plan: SnapGlow watermark</Text>
      ) : null}
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
