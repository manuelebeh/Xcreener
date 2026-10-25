import { spacing } from '@xcreener/design-tokens/tokens.native';
import { useTheme } from '@xcreener/ui-native';
import { useRef } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ExportBar } from '@/modules/export/components/ExportBar';
import { RedactionBar, useAutoRedaction } from '@/modules/redaction';
import { useEditorStore } from '../store';
import { AnnotationToolbar } from './AnnotationToolbar';
import type { BeautifyCanvasHandle } from './BeautifyCanvas';
import { EditorCanvas } from './EditorCanvas';
import { PresetBar } from './PresetBar';
import { StyleBar } from './StyleBar';

export function EditorView() {
  const { colors } = useTheme();
  const screenshot = useEditorStore((state) => state.screenshot);
  const canvasRef = useRef<BeautifyCanvasHandle>(null);
  useAutoRedaction();

  if (!screenshot) {
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
        <View style={styles.empty}>
          <Text style={[styles.emptyText, { color: colors.muted }]}>
            No image loaded. Import a screenshot first.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      <View style={styles.canvasArea}>
        <EditorCanvas canvasRef={canvasRef} />
      </View>
      <ScrollView contentContainerStyle={styles.controls}>
        <PresetBar />
        <StyleBar />
        <AnnotationToolbar />
        <RedactionBar />
        <ExportBar canvasRef={canvasRef} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
  },
  canvasArea: {
    flex: 1,
    minHeight: 280,
    padding: spacing['3'],
  },
  controls: {
    padding: spacing['4'],
    gap: spacing['4'],
  },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing['6'],
  },
  emptyText: {
    fontSize: 16,
    textAlign: 'center',
  },
});
