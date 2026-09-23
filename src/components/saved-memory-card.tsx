import type { ComponentProps } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, radii, shadows, spacing, typography } from '@/constants/theme';
import type { Sweep } from '@/database/sweep-model';
import {
  formatSweepDate,
  formatSweepDuration,
  getSweepStatusLabel,
} from '@/utils/sweep-formatters';

type SavedMemoryCardProps = {
  onPress: ComponentProps<typeof Pressable>['onPress'];
  sweep: Sweep;
};

export function SavedMemoryCard({ onPress, sweep }: SavedMemoryCardProps) {
  const statusLabel = getSweepStatusLabel(sweep.status);

  return (
    <Pressable
      accessibilityHint="Open this saved memory and replay its room sweep"
      accessibilityLabel={`${sweep.roomName}. ${statusLabel}. ${formatSweepDuration(sweep.durationSeconds)} video. Saved ${formatSweepDate(sweep.createdAt)}.`}
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
    >
      <View style={styles.memoryIcon}>
        <View style={styles.memoryLens} />
      </View>

      <View style={styles.content}>
        <View style={styles.titleRow}>
          <Text numberOfLines={1} style={styles.roomName}>
            {sweep.roomName}
          </Text>
          <Text style={styles.arrow}>›</Text>
        </View>
        <Text style={styles.savedAt}>{formatSweepDate(sweep.createdAt)}</Text>

        <View style={styles.metadataRow}>
          <View
            style={[
              styles.statusPill,
              sweep.status === 'failed' && styles.statusPillFailed,
            ]}
          >
            <View
              style={[
                styles.statusDot,
                sweep.status === 'failed' && styles.statusDotFailed,
              ]}
            />
            <Text
              style={[
                styles.statusText,
                sweep.status === 'failed' && styles.statusTextFailed,
              ]}
            >
              {statusLabel}
            </Text>
          </View>
          <Text style={styles.duration}>
            {formatSweepDuration(sweep.durationSeconds)} video
          </Text>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  arrow: {
    color: colors.sage,
    fontSize: 27,
    lineHeight: 28,
    marginLeft: spacing.sm,
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
    minHeight: 126,
    padding: spacing.md,
  },
  cardPressed: {
    opacity: 0.76,
    transform: [{ scale: 0.992 }],
  },
  content: {
    flex: 1,
    marginLeft: spacing.md,
  },
  duration: {
    color: colors.muted,
    fontSize: typography.size.caption,
    lineHeight: typography.lineHeight.caption,
    marginLeft: spacing.sm,
  },
  memoryIcon: {
    alignItems: 'center',
    backgroundColor: colors.sageSoft,
    borderRadius: radii.md,
    height: 64,
    justifyContent: 'center',
    width: 64,
  },
  memoryLens: {
    borderColor: colors.sage,
    borderRadius: radii.pill,
    borderWidth: 2,
    height: 24,
    width: 24,
  },
  metadataRow: {
    alignItems: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: spacing.sm,
  },
  roomName: {
    color: colors.ink,
    flex: 1,
    fontSize: typography.size.bodyLarge,
    fontWeight: typography.weight.semibold,
    lineHeight: typography.lineHeight.bodyLarge,
  },
  savedAt: {
    color: colors.muted,
    fontSize: typography.size.bodySmall,
    lineHeight: typography.lineHeight.bodySmall,
    marginTop: spacing.xxs,
  },
  statusDot: {
    backgroundColor: colors.sage,
    borderRadius: radii.pill,
    height: 6,
    marginRight: 6,
    width: 6,
  },
  statusDotFailed: {
    backgroundColor: colors.danger,
  },
  statusPill: {
    alignItems: 'center',
    backgroundColor: colors.sageSoft,
    borderRadius: radii.pill,
    flexDirection: 'row',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xxs,
  },
  statusPillFailed: {
    backgroundColor: colors.dangerSoft,
  },
  statusText: {
    color: colors.sageDark,
    fontSize: 10,
    fontWeight: typography.weight.bold,
    letterSpacing: 0.6,
    lineHeight: 14,
  },
  statusTextFailed: {
    color: colors.danger,
  },
  titleRow: {
    alignItems: 'center',
    flexDirection: 'row',
  },
});
