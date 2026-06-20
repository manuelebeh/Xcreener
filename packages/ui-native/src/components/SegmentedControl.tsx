import { radius, spacing } from '@snapglow/design-tokens/tokens.native';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../theme/ThemeProvider';

export interface SegmentedControlProps<T extends string> {
  options: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
}

export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
}: SegmentedControlProps<T>) {
  const { colors } = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: `${colors.muted}25` }]}>
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <Pressable
            key={option.value}
            accessibilityRole="button"
            onPress={() => onChange(option.value)}
            style={[styles.segment, selected && { backgroundColor: colors.primary }]}
          >
            <Text
              style={[
                styles.label,
                { color: selected ? colors.primaryForeground : colors.foreground },
              ]}
            >
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    borderRadius: radius.md,
    padding: 2,
    gap: 2,
  },
  segment: {
    flex: 1,
    paddingVertical: spacing['2'],
    paddingHorizontal: spacing['3'],
    borderRadius: radius.md - 2,
    alignItems: 'center',
  },
  label: {
    fontSize: 13,
    fontWeight: '500',
    textTransform: 'capitalize',
  },
});
