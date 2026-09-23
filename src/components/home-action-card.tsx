import type { ComponentProps } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, radii, shadows, spacing, typography } from '@/constants/theme';

type ActionKind = 'record' | 'find';

type HomeActionCardProps = {
  description: string;
  kind: ActionKind;
  onPress: ComponentProps<typeof Pressable>['onPress'];
  title: string;
};

export function HomeActionCard({
  description,
  kind,
  onPress,
  title,
}: HomeActionCardProps) {
  const isPrimary = kind === 'record';

  return (
    <Pressable
      accessibilityHint={description}
      accessibilityLabel={title}
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        isPrimary && styles.cardPrimary,
        pressed && styles.cardPressed,
      ]}
    >
      <View style={[styles.icon, isPrimary && styles.iconPrimary]}>
        {kind === 'record' ? (
          <View style={styles.recordIcon}>
            <View style={styles.recordDot} />
          </View>
        ) : (
          <View style={styles.searchIcon}>
            <View style={styles.searchLens} />
            <View style={styles.searchHandle} />
          </View>
        )}
      </View>

      <View style={styles.copy}>
        <Text style={[styles.title, isPrimary && styles.titlePrimary]}>
          {title}
        </Text>
        <Text
          style={[styles.description, isPrimary && styles.descriptionPrimary]}
        >
          {description}
        </Text>
      </View>

      <View
        style={[styles.arrowCircle, isPrimary && styles.arrowCirclePrimary]}
      >
        <Text style={[styles.arrow, isPrimary && styles.arrowPrimary]}>→</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  arrow: {
    color: colors.ink,
    fontSize: 17,
    lineHeight: 19,
  },
  arrowCircle: {
    alignItems: 'center',
    backgroundColor: colors.canvas,
    borderRadius: radii.pill,
    height: 36,
    justifyContent: 'center',
    marginLeft: spacing.sm,
    width: 36,
  },
  arrowCirclePrimary: {
    backgroundColor: 'rgba(255,255,255,0.14)',
  },
  arrowPrimary: {
    color: colors.white,
  },
  card: {
    ...shadows.card,
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.line,
    borderRadius: radii.lg,
    borderWidth: 1,
    flexDirection: 'row',
    marginBottom: spacing.sm,
    minHeight: 104,
    padding: spacing.md,
    width: '100%',
  },
  cardPressed: {
    opacity: 0.86,
    transform: [{ scale: 0.992 }],
  },
  cardPrimary: {
    backgroundColor: colors.sageDark,
    borderColor: colors.sageDark,
  },
  copy: {
    flex: 1,
    marginHorizontal: spacing.md,
  },
  description: {
    color: colors.muted,
    fontSize: typography.size.bodySmall,
    lineHeight: typography.lineHeight.bodySmall,
    marginTop: spacing.xxs,
  },
  descriptionPrimary: {
    color: colors.mint,
  },
  icon: {
    alignItems: 'center',
    backgroundColor: colors.sageSoft,
    borderRadius: radii.md,
    height: 56,
    justifyContent: 'center',
    width: 56,
  },
  iconPrimary: {
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  recordDot: {
    backgroundColor: colors.white,
    borderRadius: radii.pill,
    height: 9,
    width: 9,
  },
  recordIcon: {
    alignItems: 'center',
    borderColor: colors.white,
    borderRadius: radii.sm,
    borderWidth: 1.5,
    height: 28,
    justifyContent: 'center',
    width: 34,
  },
  searchHandle: {
    backgroundColor: colors.sageDark,
    borderRadius: radii.pill,
    bottom: 4,
    height: 2,
    position: 'absolute',
    right: 3,
    transform: [{ rotate: '45deg' }],
    width: 10,
  },
  searchIcon: {
    height: 30,
    width: 30,
  },
  searchLens: {
    borderColor: colors.sageDark,
    borderRadius: radii.pill,
    borderWidth: 1.8,
    height: 20,
    left: 2,
    position: 'absolute',
    top: 2,
    width: 20,
  },
  title: {
    color: colors.ink,
    fontSize: typography.size.bodyLarge,
    fontWeight: typography.weight.semibold,
    lineHeight: typography.lineHeight.bodyLarge,
  },
  titlePrimary: {
    color: colors.white,
  },
});
