import { radius, spacing } from '@snapglow/design-tokens/tokens.native';
import { useRef } from 'react';
import { PanResponder, StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../theme/ThemeProvider';

export interface SliderProps {
  label?: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  onValueChange: (value: number) => void;
}

export function Slider({ label, value, min, max, step = 1, onValueChange }: SliderProps) {
  const { colors } = useTheme();
  const trackWidthRef = useRef(0);
  const range = max - min;
  const ratio = range > 0 ? (value - min) / range : 0;

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (evt) => {
        updateFromX(evt.nativeEvent.locationX);
      },
      onPanResponderMove: (evt) => {
        updateFromX(evt.nativeEvent.locationX);
      },
    })
  ).current;

  function updateFromX(x: number) {
    const width = trackWidthRef.current;
    if (width <= 0) {
      return;
    }
    const clamped = Math.min(width, Math.max(0, x));
    const nextRatio = clamped / width;
    const raw = min + nextRatio * range;
    const stepped = step > 0 ? Math.round(raw / step) * step : raw;
    onValueChange(Math.min(max, Math.max(min, stepped)));
  }

  return (
    <View style={styles.container}>
      {label ? (
        <View style={styles.header}>
          <Text style={[styles.label, { color: colors.foreground }]}>{label}</Text>
          <Text style={[styles.value, { color: colors.muted }]}>{Math.round(value)}</Text>
        </View>
      ) : null}
      <View
        style={[styles.track, { backgroundColor: `${colors.muted}30` }]}
        onLayout={(event) => {
          trackWidthRef.current = event.nativeEvent.layout.width;
        }}
        {...panResponder.panHandlers}
      >
        <View
          style={[styles.fill, { backgroundColor: colors.primary, width: `${ratio * 100}%` }]}
        />
        <View
          style={[
            styles.thumb,
            {
              backgroundColor: colors.primary,
              borderColor: colors.background,
              left: `${ratio * 100}%`,
            },
          ]}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing['2'],
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
  },
  value: {
    fontSize: 13,
  },
  track: {
    height: 36,
    borderRadius: radius.md,
    justifyContent: 'center',
    overflow: 'visible',
  },
  fill: {
    position: 'absolute',
    left: 0,
    top: '50%',
    marginTop: -2,
    height: 4,
    borderRadius: 2,
  },
  thumb: {
    position: 'absolute',
    width: 20,
    height: 20,
    borderRadius: 10,
    marginLeft: -10,
    top: '50%',
    marginTop: -10,
    borderWidth: 2,
  },
});
