import type { ComponentProps } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, layout, radii, spacing, typography } from '@/constants/theme';

type BackButtonProps = {
  accessibilityLabel: string;
  label: string;
  onPress: ComponentProps<typeof Pressable>['onPress'];
};

export function BackButton({
  accessibilityLabel,
  label,
  onPress,
}: BackButtonProps) {
  return (
    <Pressable
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="button"
      hitSlop={8}
      onPress={onPress}
      style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}
    >
      <View style={styles.iconCircle}>
        <Text style={styles.arrow}>←</Text>
      </View>
      <Text style={styles.label}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  arrow: {
    color: colors.cyan,
    fontSize: 19,
    lineHeight: 21,
    marginTop: -1,
  },
  button: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    flexDirection: 'row',
    minHeight: layout.minTouchTarget,
    paddingRight: spacing.md,
  },
  buttonPressed: {
    opacity: 0.68,
    transform: [{ translateX: -2 }],
  },
  iconCircle: {
    alignItems: 'center',
    borderColor: colors.borderStrong,
    borderRadius: radii.pill,
    borderWidth: 1,
    height: 38,
    justifyContent: 'center',
    marginRight: spacing.sm,
    width: 38,
  },
  label: {
    color: colors.textSecondary,
    fontSize: 10,
    fontWeight: typography.weight.bold,
    letterSpacing: 1.5,
  },
});
