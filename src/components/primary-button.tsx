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

type PrimaryButtonProps = {
  label: string;
  onPress?: ComponentProps<typeof Pressable>['onPress'];
  style?: StyleProp<ViewStyle>;
};

export function PrimaryButton({ label, onPress, style }: PrimaryButtonProps) {
  return (
    <Pressable
      accessibilityHint="Opens the Futurium lab"
      accessibilityRole="button"
      android_ripple={{ color: 'rgba(5, 8, 22, 0.12)' }}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        style,
        pressed && styles.buttonPressed,
      ]}
    >
      <View style={styles.labelRow}>
        <Text style={styles.label}>{label}</Text>
        <View style={styles.arrowCircle}>
          <Text style={styles.arrow}>→</Text>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  arrow: {
    color: colors.backgroundDeep,
    fontSize: 17,
    lineHeight: 19,
    marginTop: -1,
  },
  arrowCircle: {
    alignItems: 'center',
    borderColor: 'rgba(5, 8, 22, 0.22)',
    borderRadius: radii.pill,
    borderWidth: 1,
    height: 28,
    justifyContent: 'center',
    marginLeft: spacing.sm,
    width: 28,
  },
  button: {
    ...shadows.cyanGlow,
    alignItems: 'center',
    alignSelf: 'center',
    backgroundColor: colors.cyan,
    borderColor: colors.cyanSoft,
    borderRadius: radii.pill,
    borderWidth: 1,
    justifyContent: 'center',
    maxWidth: 320,
    minHeight: 58,
    paddingHorizontal: spacing.sm,
    width: '100%',
  },
  buttonPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.985 }],
  },
  label: {
    color: colors.backgroundDeep,
    fontSize: typography.size.body,
    fontWeight: typography.weight.bold,
    letterSpacing: 0.2,
    lineHeight: typography.lineHeight.body,
  },
  labelRow: {
    alignItems: 'center',
    flexDirection: 'row',
    minHeight: layout.minTouchTarget,
  },
});
