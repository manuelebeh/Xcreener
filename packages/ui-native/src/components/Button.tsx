import { radius, spacing } from '@snapglow/design-tokens/tokens.native';
import { forwardRef, useMemo } from 'react';
import {
  Pressable,
  type PressableProps,
  type StyleProp,
  StyleSheet,
  Text,
  type ViewStyle,
} from 'react-native';
import { useTheme } from '../theme/ThemeProvider';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'destructive';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps extends Omit<PressableProps, 'style'> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  style?: StyleProp<ViewStyle>;
  children: React.ReactNode;
}

const sizeStyles: Record<
  ButtonSize,
  { height: number; paddingHorizontal: number; fontSize: number; borderRadius: number }
> = {
  sm: {
    height: 32,
    paddingHorizontal: spacing['3'],
    fontSize: 14,
    borderRadius: radius.md,
  },
  md: {
    height: 40,
    paddingHorizontal: spacing['4'],
    fontSize: 14,
    borderRadius: radius.md,
  },
  lg: {
    height: 44,
    paddingHorizontal: spacing['6'],
    fontSize: 16,
    borderRadius: radius.lg,
  },
};

export const Button = forwardRef<React.ComponentRef<typeof Pressable>, ButtonProps>(
  (
    { variant = 'primary', size = 'md', disabled, style, children, accessibilityRole, ...props },
    ref
  ) => {
    const { colors } = useTheme();
    const sizeStyle = sizeStyles[size];

    const variantStyle = useMemo(() => {
      switch (variant) {
        case 'secondary':
          return {
            backgroundColor: colors.surface,
            borderColor: colors.border,
            borderWidth: 1,
            textColor: colors.foreground,
          };
        case 'ghost':
          return {
            backgroundColor: 'transparent',
            borderColor: 'transparent',
            borderWidth: 0,
            textColor: colors.foreground,
          };
        case 'destructive':
          return {
            backgroundColor: colors.destructive,
            borderColor: 'transparent',
            borderWidth: 0,
            textColor: colors.primaryForeground,
          };
        default:
          return {
            backgroundColor: colors.primary,
            borderColor: 'transparent',
            borderWidth: 0,
            textColor: colors.primaryForeground,
          };
      }
    }, [variant, colors]);

    return (
      <Pressable
        ref={ref}
        disabled={disabled}
        accessibilityRole={accessibilityRole ?? 'button'}
        style={({ pressed }) => [
          styles.base,
          {
            height: sizeStyle.height,
            paddingHorizontal: sizeStyle.paddingHorizontal,
            borderRadius: sizeStyle.borderRadius,
            backgroundColor: variantStyle.backgroundColor,
            borderColor: variantStyle.borderColor,
            borderWidth: variantStyle.borderWidth,
            opacity: disabled ? 0.5 : pressed ? 0.8 : 1,
          },
          style,
        ]}
        {...props}
      >
        <Text
          style={[styles.label, { color: variantStyle.textColor, fontSize: sizeStyle.fontSize }]}
        >
          {children}
        </Text>
      </Pressable>
    );
  }
);

Button.displayName = 'Button';

const styles = StyleSheet.create({
  base: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontWeight: '500',
  },
});
