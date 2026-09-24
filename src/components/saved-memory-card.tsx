import { useState, type ComponentProps } from 'react';
import { Image, Pressable, StyleSheet, View } from 'react-native';

import { Text } from '@/components/app-text';
import { RoomIcon } from '@/components/room-icon';
import { colors, radii, spacing, typography } from '@/constants/theme';
import type { Sweep } from '@/database/sweep-model';
import { safeThumbnailUrl } from '@/utils/frame-thumbnail';
import {
  formatRoomName,
  formatSweepDate,
  formatSweepDuration,
  formatSweepTime,
  getSweepStatusLabel,
} from '@/utils/sweep-formatters';

const THUMBNAIL_SIZE = 60;
const NODE_SIZE = 9;

type SavedMemoryCardProps = {
  isFirst?: boolean;
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

  return <RoomIcon size={THUMBNAIL_SIZE} />;
}

export function SavedMemoryCard({
  isFirst = false,
  isLast = false,
  onPress,
  sweep,
}: SavedMemoryCardProps) {
  const roomName = formatRoomName(sweep.roomName);
  const statusLabel = getSweepStatusLabel(sweep.status);
  const isWorking =
    sweep.status === 'uploading' || sweep.status === 'processing';

  return (
    <Pressable
      accessibilityHint="Opens this memory"
      accessibilityLabel={`${roomName}. Recorded ${formatSweepDate(sweep.createdAt)}. ${formatSweepDuration(sweep.durationSeconds)} long. ${statusLabel}.`}
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
    >
      <Text
        maxFontSizeMultiplier={typography.maxScale.control}
        style={styles.time}
      >
        {formatSweepTime(sweep.createdAt)}
      </Text>

      <View
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        style={styles.rail}
      >
        {isFirst && isLast ? null : (
          <View
            style={[
              styles.line,
              isFirst && styles.lineStartsAtNode,
              isLast && styles.lineEndsAtNode,
            ]}
          />
        )}
        <View style={styles.node} />
      </View>

      <View
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        style={styles.thumbnailSlot}
      >
        <MemoryThumbnail sweep={sweep} />
      </View>

      <View style={styles.content}>
        <Text numberOfLines={3} style={styles.roomName}>
          {roomName}
        </Text>
        <Text style={styles.meta}>
          {formatSweepDuration(sweep.durationSeconds)}
          {sweep.status !== 'saved' ? ' · ' : ''}
          {sweep.status !== 'saved' ? (
            <Text
              style={[
                styles.status,
                isWorking && styles.statusWorking,
                sweep.status === 'failed' && styles.statusFailed,
              ]}
            >
              {statusLabel}
            </Text>
          ) : null}
        </Text>
      </View>
    </Pressable>
  );
}

const railCenter = spacing.sm + THUMBNAIL_SIZE / 2;

const styles = StyleSheet.create({
  content: {
    flex: 1,
    justifyContent: 'center',
    marginLeft: spacing.sm,
    marginVertical: spacing.sm,
    minHeight: THUMBNAIL_SIZE,
  },
  line: {
    backgroundColor: colors.secondaryBlue,
    bottom: 0,
    left: 9.25,
    position: 'absolute',
    top: 0,
    width: 1.5,
  },
  lineEndsAtNode: {
    bottom: undefined,
    height: railCenter,
  },
  lineStartsAtNode: {
    top: railCenter,
  },
  meta: {
    color: colors.textSecondary,
    fontSize: typography.size.small,
    lineHeight: typography.lineHeight.small,
    marginTop: 2,
  },
  node: {
    backgroundColor: colors.background,
    borderColor: colors.primary,
    borderRadius: radii.pill,
    borderWidth: 2,
    height: NODE_SIZE,
    left: 10 - NODE_SIZE / 2,
    position: 'absolute',
    top: railCenter - NODE_SIZE / 2,
    width: NODE_SIZE,
  },
  rail: {
    alignSelf: 'stretch',
    marginHorizontal: spacing.xs,
    width: 20,
  },
  roomName: {
    color: colors.text,
    fontSize: typography.size.body,
    fontWeight: typography.weight.semibold,
    lineHeight: typography.lineHeight.body,
  },
  row: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    minHeight: THUMBNAIL_SIZE + spacing.sm * 2,
  },
  rowPressed: {
    opacity: 0.6,
  },
  status: {
    color: colors.textSecondary,
    fontWeight: typography.weight.medium,
  },
  statusFailed: {
    color: colors.error,
    fontWeight: typography.weight.semibold,
  },
  statusWorking: {
    color: colors.primary,
  },
  thumbnail: {
    backgroundColor: colors.softBlue,
    borderRadius: radii.sm,
    height: THUMBNAIL_SIZE,
    width: THUMBNAIL_SIZE,
  },
  time: {
    color: colors.primary,
    fontSize: typography.size.caption,
    fontVariant: ['tabular-nums'],
    fontWeight: typography.weight.semibold,
    lineHeight: typography.lineHeight.caption,
    marginTop: railCenter - typography.lineHeight.caption / 2,
    textAlign: 'right',
    width: 60,
  },
  thumbnailSlot: {
    marginVertical: spacing.sm,
  },
});
