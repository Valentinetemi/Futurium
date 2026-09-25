import type { ComponentProps } from 'react';
import { Pressable, StyleSheet } from 'react-native';

import { Text } from '@/components/app-text';
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
      hitSlop={{ bottom: 8, left: 8, right: 16, top: 8 }}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        dark && styles.buttonDark,
        pressed && styles.buttonPressed,
      ]}
    >
      <Text
        maxFontSizeMultiplier={typography.maxScale.control}
        style={[styles.arrow, dark && styles.textDark]}
      >
        ‹
      </Text>
      <Text
        maxFontSizeMultiplier={typography.maxScale.control}
        style={[styles.label, dark && styles.textDark]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  arrow: {
    color: colors.primary,
    fontSize: 24,
    lineHeight: 26,
    marginRight: spacing.xxs + 2,
    marginTop: -2,
  },
  button: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    flexDirection: 'row',
    minHeight: layout.minTouchTarget,
    paddingRight: spacing.sm,
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
    fontSize: typography.size.small,
    fontWeight: typography.weight.medium,
  },
  textDark: {
    color: colors.cameraText,
  },
});
