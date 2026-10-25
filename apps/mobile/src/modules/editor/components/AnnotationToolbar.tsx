import { spacing } from '@xcreener/design-tokens/tokens.native';
import type { EditorTool } from '@xcreener/editor-core';
import { Button, useTheme } from '@xcreener/ui-native';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { useEditorStore } from '../store';

const TOOLS: { id: EditorTool; label: string }[] = [
  { id: 'select', label: 'Select' },
  { id: 'text', label: 'Text' },
  { id: 'rect', label: 'Rect' },
  { id: 'ellipse', label: 'Ellipse' },
  { id: 'highlight', label: 'Highlight' },
  { id: 'blur', label: 'Blur' },
];

export function AnnotationToolbar() {
  const { colors } = useTheme();
  const activeTool = useEditorStore((state) => state.activeTool);
  const setActiveTool = useEditorStore((state) => state.setActiveTool);
  const undo = useEditorStore((state) => state.undo);
  const redo = useEditorStore((state) => state.redo);
  const history = useEditorStore((state) => state.history);

  return (
    <View style={styles.container}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.row}
      >
        {TOOLS.map((tool) => (
          <Button
            key={tool.id}
            variant={activeTool === tool.id ? 'primary' : 'secondary'}
            size="sm"
            onPress={() => setActiveTool(tool.id)}
            style={styles.toolButton}
          >
            {tool.label}
          </Button>
        ))}
      </ScrollView>
      <View style={styles.historyRow}>
        <Button variant="ghost" size="sm" disabled={history.past.length === 0} onPress={undo}>
          Undo
        </Button>
        <Button variant="ghost" size="sm" disabled={history.future.length === 0} onPress={redo}>
          Redo
        </Button>
        <Text style={[styles.hint, { color: colors.muted }]}>Draw on canvas</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing['2'],
  },
  row: {
    gap: spacing['2'],
    paddingVertical: spacing['1'],
  },
  toolButton: {
    minWidth: 72,
  },
  historyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing['2'],
  },
  hint: {
    fontSize: 12,
    marginLeft: 'auto',
  },
});
