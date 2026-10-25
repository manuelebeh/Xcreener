import { spacing } from '@xcreener/design-tokens/tokens.native';
import { BUILT_IN_PRESETS, FREE_PRESET_ID, SOCIAL_NETWORKS } from '@xcreener/editor-core';
import { Button, useTheme } from '@xcreener/ui-native';
import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { useEditorStore } from '../store';
import { PresetPicker } from './PresetPicker';

export function PresetBar() {
  const { colors } = useTheme();
  const selectedPresetId = useEditorStore((state) => state.selectedPresetId);
  const setPreset = useEditorStore((state) => state.setPreset);
  const [pickerOpen, setPickerOpen] = useState(false);

  const quickPresets = BUILT_IN_PRESETS.filter((preset) =>
    ['twitter', 'instagram', 'youtube', 'ratio-16-9', 'ratio-1-1', FREE_PRESET_ID].includes(
      preset.id
    )
  );

  const activeId = selectedPresetId ?? FREE_PRESET_ID;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.foreground }]}>Format</Text>
        <Button variant="ghost" size="sm" onPress={() => setPickerOpen(true)}>
          All
        </Button>
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.row}
      >
        {quickPresets.map((preset) => (
          <Button
            key={preset.id}
            variant={activeId === preset.id ? 'primary' : 'secondary'}
            size="sm"
            onPress={() => setPreset(preset.id === FREE_PRESET_ID ? null : preset.id)}
            style={styles.chip}
          >
            {SOCIAL_NETWORKS.find((network) => network.id === preset.network)?.name ?? preset.name}
          </Button>
        ))}
      </ScrollView>
      <PresetPicker visible={pickerOpen} onClose={() => setPickerOpen(false)} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing['2'],
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
  },
  row: {
    gap: spacing['2'],
  },
  chip: {
    minWidth: 88,
  },
});
