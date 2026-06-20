import { spacing } from '@snapglow/design-tokens/tokens.native';
import { useTheme } from '@snapglow/ui-native';
import { useEffect, useState } from 'react';
import { Modal, StyleSheet, Text, TextInput, View } from 'react-native';

import { useEditorStore } from '../store';

export interface TextEditRequest {
  annotationId: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

interface TextEditorOverlayProps {
  request: TextEditRequest | null;
  onClose: () => void;
}

export function TextEditorOverlay({ request, onClose }: TextEditorOverlayProps) {
  const { colors } = useTheme();
  const updateAnnotation = useEditorStore((state) => state.updateAnnotation);
  const annotations = useEditorStore((state) => state.annotations);
  const [text, setText] = useState('');

  useEffect(() => {
    if (!request) {
      return;
    }
    const annotation = annotations.find((entry) => entry.id === request.annotationId);
    if (annotation?.type === 'text') {
      setText(annotation.text);
    }
  }, [annotations, request]);

  if (!request) {
    return null;
  }

  const commit = () => {
    updateAnnotation(request.annotationId, { text: text.trim() || 'Text' });
    onClose();
  };

  return (
    <Modal transparent animationType="fade" visible onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View
          style={[styles.panel, { backgroundColor: colors.surface, borderColor: colors.border }]}
        >
          <Text style={[styles.title, { color: colors.foreground }]}>Edit text</Text>
          <TextInput
            autoFocus
            value={text}
            onChangeText={setText}
            onSubmitEditing={commit}
            style={[
              styles.input,
              {
                color: colors.foreground,
                borderColor: colors.border,
                backgroundColor: colors.background,
              },
            ]}
            multiline
          />
          <Text style={[styles.action, { color: colors.primary }]} onPress={commit}>
            Done
          </Text>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: '#00000066',
    justifyContent: 'center',
    padding: spacing['6'],
  },
  panel: {
    borderWidth: 1,
    borderRadius: 12,
    padding: spacing['4'],
    gap: spacing['3'],
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
  },
  input: {
    minHeight: 80,
    borderWidth: 1,
    borderRadius: 8,
    padding: spacing['3'],
    fontSize: 16,
    textAlignVertical: 'top',
  },
  action: {
    fontSize: 16,
    fontWeight: '600',
    alignSelf: 'flex-end',
  },
});
