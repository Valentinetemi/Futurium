import type { ComponentProps } from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';

import { colors, layout, radii, spacing, typography } from '@/constants/theme';

type BackButtonProps = {
  accessibilityLabel: string;
  dark?: boolean;
  label?: string;
  onPress: ComponentProps<typeof Pressable>['onPress'];
};

export function BackButton({
  accessibilityLabel,
  dark = false,
  label = 'Back',
  onPress,
}: BackButtonProps) {
  return (
    <Pressable
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="button"
      hitSlop={8}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        dark && styles.buttonDark,
        pressed && styles.buttonPressed,
      ]}
    >
      <Text style={[styles.arrow, dark && styles.textDark]}>‹</Text>
      <Text style={[styles.label, dark && styles.textDark]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  arrow: {
    color: colors.primary,
    fontSize: 30,
    lineHeight: 32,
    marginRight: spacing.xs,
    marginTop: -3,
  },
  button: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    flexDirection: 'row',
    minHeight: layout.minTouchTarget,
    paddingRight: spacing.md,
  },
  buttonDark: {
    backgroundColor: colors.cameraPlate,
    borderRadius: radii.md,
    paddingLeft: spacing.sm,
  },
  buttonPressed: {
    opacity: 0.6,
  },
  label: {
    color: colors.primary,
    fontSize: typography.size.body,
    fontWeight: typography.weight.semibold,
  },
  textDark: {
    color: colors.cameraText,
  },
});
