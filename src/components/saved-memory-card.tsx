import { useState, type ComponentProps } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, radii, spacing, typography } from '@/constants/theme';
import type { Sweep } from '@/database/sweep-model';
import { safeThumbnailUrl } from '@/utils/frame-thumbnail';
import {
  formatSweepDate,
  formatSweepDuration,
  formatSweepTime,
  getSweepStatusLabel,
} from '@/utils/sweep-formatters';

type SavedMemoryCardProps = {
  isLast?: boolean;
  onPress: ComponentProps<typeof Pressable>['onPress'];
  sweep: Sweep;
};

function MemoryThumbnail({ sweep }: { sweep: Sweep }) {
  const [hasImageError, setHasImageError] = useState(false);
  const firstFrame = sweep.processingManifest?.frames[0];
  const uri =
    sweep.status === 'ready' && firstFrame
      ? safeThumbnailUrl(firstFrame.thumbnailUrl)
      : null;

  if (uri && !hasImageError) {
    return (
      <Image
        onError={() => setHasImageError(true)}
        source={{ uri }}
        style={styles.thumbnail}
      />
    );
  }

  return (
    <View style={[styles.thumbnail, styles.thumbnailEmpty]}>
      <Text style={styles.thumbnailInitial}>
        {sweep.roomName.trim().charAt(0).toUpperCase() || '·'}
      </Text>
    </View>
  );
}

export function SavedMemoryCard({
  isLast = false,
  onPress,
  sweep,
}: SavedMemoryCardProps) {
  const statusLabel = getSweepStatusLabel(sweep.status);
  const showStatus = sweep.status !== 'saved';

  return (
    <Pressable
      accessibilityHint="Opens this memory"
      accessibilityLabel={`${sweep.roomName}. Recorded ${formatSweepDate(sweep.createdAt)}. ${formatSweepDuration(sweep.durationSeconds)} long. ${statusLabel}.`}
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.row,
        !isLast && styles.rowDivider,
        pressed && styles.rowPressed,
      ]}
    >
      <View
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
      >
        <MemoryThumbnail sweep={sweep} />
      </View>

      <View style={styles.content}>
        <Text numberOfLines={2} style={styles.roomName}>
          {sweep.roomName}
        </Text>
        <Text style={styles.meta}>
          {formatSweepTime(sweep.createdAt)} ·{' '}
          {formatSweepDuration(sweep.durationSeconds)}
        </Text>
        {showStatus ? (
          <Text
            style={[
              styles.status,
              sweep.status === 'failed' && styles.statusFailed,
            ]}
          >
            {statusLabel}
          </Text>
        ) : null}
      </View>

      <Text style={styles.chevron}>›</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chevron: {
    color: colors.textSecondary,
    fontSize: 28,
    lineHeight: 30,
    marginLeft: spacing.sm,
  },
  content: {
    flex: 1,
    marginLeft: spacing.md,
  },
  meta: {
    color: colors.textSecondary,
    fontSize: typography.size.small,
    lineHeight: typography.lineHeight.small,
    marginTop: spacing.xxs,
  },
  roomName: {
    color: colors.text,
    fontSize: typography.size.bodyLarge,
    fontWeight: typography.weight.semibold,
    lineHeight: typography.lineHeight.bodyLarge,
  },
  row: {
    alignItems: 'center',
    flexDirection: 'row',
    minHeight: 96,
    paddingVertical: spacing.md,
  },
  rowDivider: {
    borderBottomColor: colors.border,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  rowPressed: {
    opacity: 0.6,
  },
  status: {
    color: colors.memoryBlue,
    fontSize: typography.size.small,
    fontWeight: typography.weight.semibold,
    lineHeight: typography.lineHeight.small,
    marginTop: spacing.xxs,
  },
  statusFailed: {
    color: colors.error,
  },
  thumbnail: {
    backgroundColor: colors.sage,
    borderRadius: radii.sm,
    height: 72,
    width: 72,
  },
  thumbnailEmpty: {
    alignItems: 'center',
    borderColor: colors.border,
    borderWidth: StyleSheet.hairlineWidth,
    justifyContent: 'center',
  },
  thumbnailInitial: {
    color: colors.memoryBlue,
    fontSize: typography.size.title,
    fontWeight: typography.weight.semibold,
  },
});
