import type { ComponentProps } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';
import { Pressable, StyleSheet, Text, View } from 'react-native';

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
  onPress?: ComponentProps<typeof Pressable>['onPress'];
  showArrow?: boolean;
  style?: StyleProp<ViewStyle>;
  variant?: ButtonVariant;
};

export function PrimaryButton({
  accessibilityHint,
  disabled = false,
  label,
  onPress,
  showArrow = false,
  style,
  variant = 'primary',
}: PrimaryButtonProps) {
  return (
    <Pressable
      accessibilityHint={disabled ? undefined : accessibilityHint}
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        variant === 'secondary' && styles.secondary,
        variant === 'danger' && styles.danger,
        disabled && styles.disabled,
        style,
        pressed && styles.pressed,
      ]}
    >
      <View style={styles.labelRow}>
        <Text
          numberOfLines={1}
          style={[
            styles.label,
            variant === 'secondary' && styles.labelSecondary,
            variant === 'danger' && styles.labelDanger,
            disabled && styles.labelDisabled,
          ]}
        >
          {label}
        </Text>
        {showArrow ? <Text style={styles.arrow}>→</Text> : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  arrow: {
    color: colors.white,
    fontSize: 18,
    marginLeft: spacing.sm,
  },
  button: {
    ...shadows.card,
    alignItems: 'center',
    alignSelf: 'center',
    backgroundColor: colors.sageDark,
    borderColor: colors.sageDark,
    borderRadius: radii.pill,
    borderWidth: 1,
    justifyContent: 'center',
    minHeight: 56,
    paddingHorizontal: spacing.lg,
    width: '100%',
  },
  danger: {
    backgroundColor: colors.dangerSoft,
    borderColor: colors.dangerSoft,
    elevation: 0,
    shadowOpacity: 0,
  },
  disabled: {
    backgroundColor: colors.canvasMuted,
    borderColor: colors.line,
    elevation: 0,
    shadowOpacity: 0,
  },
  label: {
    color: colors.white,
    fontSize: typography.size.body,
    fontWeight: typography.weight.semibold,
    lineHeight: typography.lineHeight.body,
  },
  labelDanger: {
    color: colors.danger,
  },
  labelDisabled: {
    color: colors.muted,
  },
  labelRow: {
    alignItems: 'center',
    flexDirection: 'row',
    minHeight: layout.minTouchTarget,
  },
  labelSecondary: {
    color: colors.ink,
  },
  pressed: {
    opacity: 0.82,
    transform: [{ scale: 0.99 }],
  },
  secondary: {
    backgroundColor: colors.surface,
    borderColor: colors.lineStrong,
    elevation: 0,
    shadowOpacity: 0,
  },
});
