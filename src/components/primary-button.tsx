import type { ComponentProps } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';
import { Pressable, StyleSheet } from 'react-native';

import { Text } from '@/components/app-text';
import {
  colors,
  layout,
  radii,
  shadows,
  spacing,
  typography,
} from '@/constants/theme';

type ButtonVariant = 'primary' | 'secondary' | 'danger';

type PrimaryButtonProps = {
  accessibilityHint?: string;
  disabled?: boolean;
  label: string;
  onDark?: boolean;
  onPress?: ComponentProps<typeof Pressable>['onPress'];
  style?: StyleProp<ViewStyle>;
  variant?: ButtonVariant;
};

export function PrimaryButton({
  accessibilityHint,
  disabled = false,
  label,
  onDark = false,
  onPress,
  style,
  variant = 'primary',
}: PrimaryButtonProps) {
  const isOutlined = variant !== 'primary';

  return (
    <Pressable
      accessibilityHint={disabled ? undefined : accessibilityHint}
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        isOutlined && styles.outlined,
        variant === 'danger' && styles.danger,
        onDark && isOutlined && styles.outlinedOnDark,
        disabled && styles.disabled,
        style,
        pressed && styles.pressed,
      ]}
    >
      <Text
        maxFontSizeMultiplier={typography.maxScale.control}
        numberOfLines={2}
        style={[
          styles.label,
          variant === 'secondary' && styles.labelSecondary,
          variant === 'danger' && styles.labelDanger,
          onDark && isOutlined && styles.labelOnDark,
          disabled && styles.labelDisabled,
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    ...shadows.subtle,
    alignItems: 'center',
    backgroundColor: colors.primary,
    borderColor: colors.primary,
    borderRadius: radii.md,
    borderWidth: 1,
    justifyContent: 'center',
    minHeight: layout.buttonHeight,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xs,
    width: '100%',
  },
  danger: {
    borderColor: colors.error,
  },
  disabled: {
    backgroundColor: colors.border,
    borderColor: colors.border,
    elevation: 0,
    shadowOpacity: 0,
  },
  label: {
    color: colors.onPrimary,
    fontSize: typography.size.body,
    fontWeight: typography.weight.semibold,
    lineHeight: typography.lineHeight.body,
    textAlign: 'center',
  },
  labelDanger: {
    color: colors.error,
  },
  labelDisabled: {
    color: colors.textSecondary,
  },
  labelOnDark: {
    color: colors.cameraText,
  },
  labelSecondary: {
    color: colors.text,
  },
  outlined: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    elevation: 0,
    shadowOpacity: 0,
  },
  outlinedOnDark: {
    backgroundColor: colors.transparent,
    borderColor: colors.cameraBorder,
  },
  pressed: {
    opacity: 0.8,
  },
});
