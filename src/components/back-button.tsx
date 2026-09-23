import type { ComponentProps } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

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
      style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}
    >
      <View style={[styles.icon, dark && styles.iconDark]}>
        <Text style={[styles.arrow, dark && styles.textDark]}>‹</Text>
      </View>
      <Text style={[styles.label, dark && styles.textDark]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  arrow: {
    color: colors.ink,
    fontSize: 27,
    lineHeight: 29,
    marginLeft: -1,
    marginTop: -2,
  },
  button: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    flexDirection: 'row',
    minHeight: layout.minTouchTarget,
    paddingRight: spacing.md,
  },
  buttonPressed: {
    opacity: 0.58,
  },
  icon: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.line,
    borderRadius: radii.pill,
    borderWidth: 1,
    height: 38,
    justifyContent: 'center',
    marginRight: spacing.sm,
    width: 38,
  },
  iconDark: {
    backgroundColor: colors.cameraSoft,
    borderColor: 'rgba(255,255,255,0.18)',
  },
  label: {
    color: colors.inkSoft,
    fontSize: typography.size.bodySmall,
    fontWeight: typography.weight.semibold,
  },
  textDark: {
    color: colors.white,
  },
});
