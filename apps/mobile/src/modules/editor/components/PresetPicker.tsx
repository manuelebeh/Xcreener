import { spacing } from '@snapglow/design-tokens/tokens.native';
import {
  BUILT_IN_PRESETS,
  FREE_PRESET_ID,
  getNetworkPresets,
  SOCIAL_NETWORKS,
  STANDARD_PRESETS,
} from '@snapglow/editor-core';
import { Button, useTheme } from '@snapglow/ui-native';
import { Modal, ScrollView, StyleSheet, Text, View } from 'react-native';

import { useEditorStore } from '../store';

interface PresetPickerProps {
  visible: boolean;
  onClose: () => void;
}

function PresetSection({
  title,
  presetIds,
  onSelect,
}: {
  title: string;
  presetIds: string[];
  onSelect: () => void;
}) {
  const { colors } = useTheme();
  const selectedPresetId = useEditorStore((state) => state.selectedPresetId);
  const setPreset = useEditorStore((state) => state.setPreset);
  const presets = BUILT_IN_PRESETS.filter((preset) => presetIds.includes(preset.id));
  const activeId = selectedPresetId ?? FREE_PRESET_ID;

  return (
    <View style={styles.section}>
      <Text style={[styles.sectionTitle, { color: colors.foreground }]}>{title}</Text>
      <View style={styles.grid}>
        {presets.map((preset) => (
          <Button
            key={preset.id}
            variant={activeId === preset.id ? 'primary' : 'secondary'}
            size="sm"
            onPress={() => {
              setPreset(preset.id === FREE_PRESET_ID ? null : preset.id);
              onSelect();
            }}
            style={styles.item}
          >
            {preset.width > 0 ? `${preset.name} · ${preset.width}×${preset.height}` : preset.name}
          </Button>
        ))}
      </View>
    </View>
  );
}

export function PresetPicker({ visible, onClose }: PresetPickerProps) {
  const { colors } = useTheme();

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={[styles.sheet, { backgroundColor: colors.background }]}>
          <View style={styles.header}>
            <Text style={[styles.title, { color: colors.foreground }]}>Presets</Text>
            <Button variant="ghost" size="sm" onPress={onClose}>
              Close
            </Button>
          </View>
          <ScrollView contentContainerStyle={styles.content}>
            {SOCIAL_NETWORKS.map((network) => (
              <PresetSection
                key={network.id}
                title={network.name}
                presetIds={getNetworkPresets(network.id).map((p) => p.id)}
                onSelect={onClose}
              />
            ))}
            <PresetSection
              title="Ratios"
              presetIds={STANDARD_PRESETS.map((p) => p.id)}
              onSelect={onClose}
            />
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: '#00000055',
  },
  sheet: {
    maxHeight: '70%',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: spacing['4'],
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing['3'],
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
  },
  content: {
    gap: spacing['4'],
    paddingBottom: spacing['6'],
  },
  section: {
    gap: spacing['2'],
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing['2'],
  },
  item: {
    minWidth: '30%',
    flexGrow: 1,
  },
});
