import type { ComponentProps } from 'react';
import { useEffect, useState } from 'react';
import {
  AccessibilityInfo,
  Animated,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { colors, radii, shadows, spacing, typography } from '@/constants/theme';
import type { CareerField } from '@/data/career-fields';

type FrontierStationCardProps = {
  compact?: boolean;
  index: number;
  onPress?: ComponentProps<typeof Pressable>['onPress'];
  station: CareerField;
};

export function FrontierStationCard({
  compact = false,
  index,
  onPress,
  station,
}: FrontierStationCardProps) {
  const [entrance] = useState(() => new Animated.Value(0));
  const isAvailable = station.status === 'available';
  const isInteractive = isAvailable && Boolean(onPress);
  const statusLabel = isAvailable ? 'Available' : 'Coming Soon';

  useEffect(() => {
    let isMounted = true;

    void AccessibilityInfo.isReduceMotionEnabled().then(
      (reduceMotionEnabled) => {
        if (!isMounted || reduceMotionEnabled) {
          entrance.setValue(1);
          return;
        }

        Animated.timing(entrance, {
          delay: index * 75,
          duration: 420,
          toValue: 1,
          useNativeDriver: true,
        }).start();
      },
    );

    return () => {
      isMounted = false;
      entrance.stopAnimation();
    };
  }, [entrance, index]);

  return (
    <Animated.View
      style={[
        styles.animatedCard,
        {
          opacity: entrance,
          transform: [
            {
              translateY: entrance.interpolate({
                inputRange: [0, 1],
                outputRange: [18, 0],
              }),
            },
          ],
        },
      ]}
    >
      <Pressable
        accessibilityHint={
          isInteractive
            ? 'Opens the Computer Vision mission briefing'
            : undefined
        }
        accessibilityLabel={`${station.name}. ${statusLabel}. ${station.description}`}
        accessibilityRole={isInteractive ? 'button' : undefined}
        accessibilityState={{ disabled: !isInteractive }}
        android_ripple={isInteractive ? { color: colors.cyanGlow } : undefined}
        disabled={!isInteractive}
        onPress={onPress}
        style={({ pressed }) => [
          styles.card,
          !isAvailable && styles.cardUnavailable,
          compact && styles.cardCompact,
          pressed && styles.cardPressed,
        ]}
      >
        <View
          style={[styles.edgeGlow, !isAvailable && styles.edgeGlowUnavailable]}
        />
        <View style={styles.topRow}>
          <View style={styles.identifier}>
            <View
              style={[
                styles.codeBadge,
                !isAvailable && styles.codeBadgeUnavailable,
              ]}
            >
              <Text
                style={[styles.code, !isAvailable && styles.codeUnavailable]}
              >
                {station.code}
              </Text>
            </View>
            <View>
              <Text style={styles.stationNumber}>
                STATION {String(index + 1).padStart(2, '0')}
              </Text>
              <Text style={styles.signalLabel}>FRONTIER SIGNAL</Text>
            </View>
          </View>

          <View
            style={[
              styles.statusPill,
              isAvailable && styles.statusPillAvailable,
            ]}
          >
            <View
              style={[
                styles.statusDot,
                isAvailable && styles.statusDotAvailable,
              ]}
            />
            <Text
              style={[
                styles.statusText,
                isAvailable && styles.statusTextAvailable,
              ]}
            >
              {statusLabel.toUpperCase()}
            </Text>
          </View>
        </View>

        <Text style={[styles.name, compact && styles.nameCompact]}>
          {station.name}
        </Text>
        <Text style={styles.description}>{station.description}</Text>

        <View style={styles.footer}>
          <Text style={[styles.action, isAvailable && styles.actionAvailable]}>
            {isAvailable ? 'ENTER STATION' : 'ACCESS LOCKED'}
          </Text>
          <View
            style={[
              styles.actionGlyph,
              isAvailable && styles.actionGlyphAvailable,
            ]}
          >
            <Text
              style={[
                styles.actionArrow,
                isAvailable && styles.actionArrowAvailable,
              ]}
            >
              {isAvailable ? '→' : '·'}
            </Text>
          </View>
        </View>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  action: {
    color: colors.textMuted,
    fontSize: 10,
    fontWeight: typography.weight.bold,
    letterSpacing: 1.5,
  },
  actionArrow: {
    color: colors.textMuted,
    fontSize: 16,
    lineHeight: 18,
    marginTop: -1,
  },
  actionArrowAvailable: {
    color: colors.backgroundDeep,
  },
  actionAvailable: {
    color: colors.cyan,
  },
  actionGlyph: {
    alignItems: 'center',
    borderColor: colors.border,
    borderRadius: radii.pill,
    borderWidth: 1,
    height: 30,
    justifyContent: 'center',
    width: 30,
  },
  actionGlyphAvailable: {
    backgroundColor: colors.cyan,
    borderColor: colors.cyanSoft,
  },
  animatedCard: {
    marginBottom: spacing.md,
    width: '100%',
  },
  card: {
    ...shadows.panel,
    backgroundColor: colors.backgroundElevated,
    borderColor: colors.borderStrong,
    borderRadius: radii.lg,
    borderWidth: 1,
    overflow: 'hidden',
    padding: spacing.lg,
  },
  cardCompact: {
    borderRadius: radii.md,
    padding: spacing.md,
  },
  cardPressed: {
    borderColor: colors.cyan,
    opacity: 0.92,
    transform: [{ scale: 0.99 }],
  },
  cardUnavailable: {
    backgroundColor: colors.backgroundDeep,
    borderColor: colors.border,
    elevation: 0,
    shadowOpacity: 0.12,
  },
  code: {
    color: colors.backgroundDeep,
    fontSize: 13,
    fontWeight: typography.weight.black,
    letterSpacing: 0.5,
  },
  codeBadge: {
    alignItems: 'center',
    backgroundColor: colors.cyan,
    borderRadius: radii.sm,
    height: 42,
    justifyContent: 'center',
    marginRight: spacing.sm,
    width: 42,
  },
  codeBadgeUnavailable: {
    backgroundColor: colors.surfaceMuted,
    borderColor: colors.border,
    borderWidth: 1,
  },
  codeUnavailable: {
    color: colors.textMuted,
  },
  description: {
    color: colors.textSecondary,
    fontSize: typography.size.body,
    lineHeight: typography.lineHeight.body,
    marginTop: spacing.xs,
    maxWidth: 560,
  },
  edgeGlow: {
    backgroundColor: colors.cyan,
    bottom: spacing.lg,
    opacity: 0.55,
    position: 'absolute',
    right: 0,
    top: spacing.lg,
    width: 2,
  },
  edgeGlowUnavailable: {
    backgroundColor: colors.violet,
    opacity: 0.16,
  },
  footer: {
    alignItems: 'center',
    borderTopColor: colors.border,
    borderTopWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.lg,
    minHeight: 40,
    paddingTop: spacing.md,
  },
  identifier: {
    alignItems: 'center',
    flexDirection: 'row',
  },
  name: {
    color: colors.textPrimary,
    fontSize: 25,
    fontWeight: typography.weight.bold,
    letterSpacing: -0.5,
    lineHeight: 31,
    marginTop: spacing.lg,
  },
  nameCompact: {
    fontSize: 22,
    lineHeight: 28,
  },
  signalLabel: {
    color: colors.textMuted,
    fontSize: 8,
    fontWeight: typography.weight.medium,
    letterSpacing: 1.1,
    marginTop: 2,
  },
  stationNumber: {
    color: colors.textSecondary,
    fontSize: 9,
    fontWeight: typography.weight.bold,
    letterSpacing: 1.4,
  },
  statusDot: {
    backgroundColor: colors.textMuted,
    borderRadius: radii.pill,
    height: 5,
    marginRight: 6,
    width: 5,
  },
  statusDotAvailable: {
    backgroundColor: colors.cyan,
    shadowColor: colors.cyan,
    shadowOpacity: 0.8,
    shadowRadius: 5,
  },
  statusPill: {
    alignItems: 'center',
    borderColor: colors.border,
    borderRadius: radii.pill,
    borderWidth: 1,
    flexDirection: 'row',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  statusPillAvailable: {
    backgroundColor: colors.cyanGlow,
    borderColor: colors.borderStrong,
  },
  statusText: {
    color: colors.textMuted,
    fontSize: 8,
    fontWeight: typography.weight.bold,
    letterSpacing: 1,
  },
  statusTextAvailable: {
    color: colors.cyanSoft,
  },
  topRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
});
