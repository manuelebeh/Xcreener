import { spacing } from '@snapglow/design-tokens/tokens.native';
import {
  DEFAULT_GRADIENT_PRESET_ID,
  DEFAULT_SOLID_COLOR,
  GRADIENT_PRESETS,
} from '@snapglow/editor-core';
import { SegmentedControl, Slider, useTheme } from '@snapglow/ui-native';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { useEditorStore } from '../store';

type BackgroundTab = 'gradient' | 'solid';

export function StyleBar() {
  const { colors } = useTheme();
  const background = useEditorStore((state) => state.background);
  const padding = useEditorStore((state) => state.padding);
  const borderRadius = useEditorStore((state) => state.borderRadius);
  const shadow = useEditorStore((state) => state.shadow);
  const setPadding = useEditorStore((state) => state.setPadding);
  const updateBackground = useEditorStore((state) => state.updateBackground);
  const setBorderRadius = useEditorStore((state) => state.setBorderRadius);
  const updateShadow = useEditorStore((state) => state.updateShadow);

  const [activeTab, setActiveTab] = useState<BackgroundTab>(
    background.type === 'solid' ? 'solid' : 'gradient'
  );

  const solidColor = background.type === 'solid' ? background.color : DEFAULT_SOLID_COLOR;

  const handleTabChange = (tab: BackgroundTab) => {
    setActiveTab(tab);
    if (tab === 'gradient') {
      updateBackground({ type: 'gradient', presetId: DEFAULT_GRADIENT_PRESET_ID });
    } else {
      updateBackground({ type: 'solid', color: solidColor });
    }
  };

  return (
    <View style={styles.container}>
      <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Style</Text>

      <SegmentedControl<BackgroundTab>
        options={[
          { value: 'gradient', label: 'Gradient' },
          { value: 'solid', label: 'Solid' },
        ]}
        value={activeTab}
        onChange={handleTabChange}
      />

      {activeTab === 'gradient' ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.swatches}
        >
          {GRADIENT_PRESETS.map((preset) => {
            const selected = background.type === 'gradient' && background.presetId === preset.id;
            const previewColor = preset.stops[0]?.color ?? '#ccc';
            return (
              <Pressable
                key={preset.id}
                accessibilityRole="button"
                onPress={() => updateBackground({ type: 'gradient', presetId: preset.id })}
                style={[
                  styles.swatch,
                  {
                    backgroundColor: previewColor,
                    borderColor: selected ? colors.primary : colors.border,
                  },
                  selected && styles.swatchSelected,
                ]}
              />
            );
          })}
        </ScrollView>
      ) : (
        <View style={styles.solidRow}>
          {[DEFAULT_SOLID_COLOR, '#ffffff', '#1a1a1a', '#2563eb', '#ef4444'].map((color) => (
            <Pressable
              key={color}
              accessibilityRole="button"
              onPress={() => updateBackground({ type: 'solid', color })}
              style={[
                styles.swatch,
                {
                  backgroundColor: color,
                  borderColor: solidColor === color ? colors.primary : colors.border,
                },
              ]}
            />
          ))}
        </View>
      )}

      <Slider
        label="Padding"
        value={padding}
        min={0}
        max={160}
        step={1}
        onValueChange={setPadding}
      />
      <Slider
        label="Corner radius"
        value={borderRadius}
        min={0}
        max={32}
        step={1}
        onValueChange={setBorderRadius}
      />
      <Slider
        label="Shadow blur"
        value={shadow.blur}
        min={0}
        max={48}
        step={1}
        onValueChange={(blur) => updateShadow({ blur })}
      />
      <Slider
        label="Shadow opacity"
        value={Math.round(shadow.opacity * 100)}
        min={0}
        max={100}
        step={1}
        onValueChange={(value) => updateShadow({ opacity: value / 100 })}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing['3'],
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  swatches: {
    gap: spacing['2'],
    paddingVertical: spacing['1'],
  },
  solidRow: {
    flexDirection: 'row',
    gap: spacing['2'],
    flexWrap: 'wrap',
  },
  swatch: {
    width: 36,
    height: 36,
    borderRadius: 8,
    borderWidth: 2,
  },
  swatchSelected: {
    borderWidth: 3,
  },
});
