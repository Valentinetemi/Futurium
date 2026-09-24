import { useState } from 'react';

import {
  ActivityIndicator,
  Image,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';

import { Text } from '@/components/app-text';
import { PrimaryButton } from '@/components/primary-button';
import { colors, layout, radii, spacing, typography } from '@/constants/theme';
import type { SweepStatus } from '@/database/sweep-model';
import type { ProcessingManifest } from '@/types/processing';
import { formatMomentTime, safeThumbnailUrl } from '@/utils/frame-thumbnail';

type ProcessingSummaryProps = {
  errorMessage: string | null;
  isVideoAvailable: boolean;
  manifest: ProcessingManifest | null;
  onUpload: () => void;
  status: SweepStatus;
};

type DetailsProps = {
  errorMessage: string | null;
  manifest: ProcessingManifest | null;
};

function ProcessingDetails({ errorMessage, manifest }: DetailsProps) {
  const [isOpen, setIsOpen] = useState(false);
  const rows: [string, string][] = [];

  if (manifest) {
    rows.push(
      ['Frames checked', String(manifest.totalFramesSampled)],
      ['Blurry frames skipped', String(manifest.rejectedBlurCount)],
      ['Repeated frames skipped', String(manifest.rejectedDuplicateCount)],
    );
    if (manifest.error) {
      rows.push(['Server message', manifest.error.message]);
    }
  }
  if (errorMessage) {
    rows.push(['Last message', errorMessage]);
  }

  if (rows.length === 0) {
    return null;
  }

  return (
    <View style={styles.details}>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded: isOpen }}
        onPress={() => setIsOpen((open) => !open)}
        style={({ pressed }) => [
          styles.detailsToggle,
          pressed && styles.pressed,
        ]}
      >
        <Text style={styles.detailsToggleText}>
          {isOpen ? 'Hide details' : 'Show details'}
        </Text>
      </Pressable>

      {isOpen
        ? rows.map(([label, value]) => (
            <View key={label} style={styles.detailRow}>
              <Text style={styles.detailLabel}>{label}</Text>
              <Text selectable style={styles.detailValue}>
                {value}
              </Text>
            </View>
          ))
        : null}
    </View>
  );
}

const CONTACT_SHEET_PREVIEW = 9;

function Moments({ manifest }: { manifest: ProcessingManifest }) {
  const [showAll, setShowAll] = useState(false);

  if (manifest.frames.length === 0) {
    return (
      <Text style={styles.body}>
        No clear moments were found. Try recording the room again, moving more
        slowly.
      </Text>
    );
  }

  const frames = showAll
    ? manifest.frames
    : manifest.frames.slice(0, CONTACT_SHEET_PREVIEW);
  const hiddenCount = manifest.frames.length - frames.length;

  return (
    <View>
      <View accessibilityLabel="Moments from this room" style={styles.sheet}>
        {frames.map((frame) => {
          const uri = safeThumbnailUrl(frame.thumbnailUrl);
          const time = formatMomentTime(frame.timestamp);

          return (
            <View key={frame.frameId} style={styles.moment}>
              {uri ? (
                <Image
                  accessibilityLabel={`Moment at ${time}`}
                  source={{ uri }}
                  style={styles.momentImage}
                />
              ) : (
                <View
                  accessibilityLabel={`Moment at ${time}, no preview`}
                  accessible
                  style={[styles.momentImage, styles.momentUnavailable]}
                />
              )}
              <Text style={styles.momentTime}>{time}</Text>
            </View>
          );
        })}
      </View>

      {hiddenCount > 0 || showAll ? (
        <Pressable
          accessibilityRole="button"
          onPress={() => setShowAll((value) => !value)}
          style={({ pressed }) => [
            styles.linkButton,
            pressed && styles.pressed,
          ]}
        >
          <Text style={styles.linkText}>
            {showAll ? 'Show fewer' : `Show all ${manifest.frames.length}`}
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}

export function ProcessingSummary({
  errorMessage,
  isVideoAvailable,
  manifest,
  onUpload,
  status,
}: ProcessingSummaryProps) {
  const canUpload = status === 'saved' || status === 'failed';
  const isWorking = status === 'uploading' || status === 'processing';

  return (
    <View style={styles.section}>
      {status === 'saved' ? (
        <>
          <Text accessibilityRole="header" heading style={styles.title}>
            Prepare for finding
          </Text>
          <Text style={styles.body}>
            Futurium keeps the clearest moments from this video, ready for
            search later.
          </Text>
        </>
      ) : null}

      {isWorking ? (
        <View accessibilityLiveRegion="polite">
          <Text accessibilityRole="header" heading style={styles.title}>
            {status === 'uploading' ? 'Sending the video' : 'Choosing moments'}
          </Text>
          <View style={styles.workingRow}>
            <ActivityIndicator color={colors.primary} />
            <Text style={styles.workingText}>
              {status === 'uploading'
                ? 'Please keep the app open.'
                : 'This usually takes under a minute.'}
            </Text>
          </View>
          {errorMessage ? (
            <Text style={styles.softError}>{errorMessage}</Text>
          ) : null}
        </View>
      ) : null}

      {status === 'ready' && manifest ? (
        <View accessibilityLiveRegion="polite">
          <Text accessibilityRole="header" heading style={styles.title}>
            {manifest.retainedFrameCount === 1
              ? '1 moment kept'
              : `${manifest.retainedFrameCount} moments kept`}
          </Text>
          <Text style={styles.note}>
            The clearest views of the room, by time in the video.
          </Text>
          <Moments manifest={manifest} />
        </View>
      ) : null}

      {status === 'ready' && !manifest ? (
        <View accessibilityLiveRegion="polite" style={styles.workingRow}>
          <ActivityIndicator color={colors.primary} />
          <Text style={styles.workingText}>Loading moments…</Text>
        </View>
      ) : null}

      {status === 'failed' ? (
        <View accessibilityLiveRegion="polite">
          <Text accessibilityRole="header" heading style={styles.failedTitle}>
            This memory was not prepared
          </Text>
          {isVideoAvailable ? (
            <Text style={styles.body}>
              Your video is safe on this phone. You can try again.
            </Text>
          ) : null}
        </View>
      ) : null}

      {errorMessage &&
      (status === 'saved' || (status === 'ready' && !manifest)) ? (
        <Text accessibilityLiveRegion="polite" style={styles.softError}>
          {errorMessage}
        </Text>
      ) : null}

      {canUpload ? (
        <PrimaryButton
          accessibilityHint="Asks before sending a copy of this video to your processing server"
          disabled={!isVideoAvailable}
          label={status === 'failed' ? 'Try again' : 'Prepare this memory'}
          onPress={onUpload}
          style={styles.action}
        />
      ) : null}

      {canUpload && !isVideoAvailable ? (
        <Text style={styles.note}>
          The video is missing from this phone, so it cannot be prepared.
        </Text>
      ) : null}

      {status === 'failed' || status === 'ready' ? (
        <ProcessingDetails
          errorMessage={status === 'failed' ? errorMessage : null}
          manifest={manifest}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  action: {
    marginTop: spacing.lg,
  },
  body: {
    color: colors.text,
    fontSize: typography.size.body,
    lineHeight: typography.lineHeight.body,
    marginTop: spacing.xs,
  },
  detailLabel: {
    color: colors.textSecondary,
    fontSize: typography.size.small,
    lineHeight: typography.lineHeight.small,
  },
  detailRow: {
    borderTopColor: colors.border,
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingVertical: spacing.sm,
  },
  detailValue: {
    color: colors.text,
    fontSize: typography.size.small,
    lineHeight: typography.lineHeight.small,
    marginTop: 2,
  },
  details: {
    marginTop: spacing.xxs,
  },
  detailsToggle: {
    alignSelf: 'flex-start',
    justifyContent: 'center',
    minHeight: layout.minTouchTarget,
  },
  detailsToggleText: {
    color: colors.textSecondary,
    fontSize: typography.size.small,
    fontWeight: typography.weight.semibold,
  },
  failedTitle: {
    color: colors.error,
    fontSize: typography.size.title,
    fontWeight: typography.weight.semibold,
    lineHeight: typography.lineHeight.title,
  },
  linkButton: {
    alignSelf: 'flex-start',
    justifyContent: 'center',
    marginTop: spacing.xxs,
    minHeight: layout.minTouchTarget,
  },
  linkText: {
    color: colors.primary,
    fontSize: typography.size.small,
    fontWeight: typography.weight.semibold,
  },
  moment: {
    padding: spacing.xxs,
    width: '33.3333%',
  },
  momentImage: {
    aspectRatio: 4 / 3,
    backgroundColor: colors.softBlue,
    borderColor: colors.border,
    borderWidth: StyleSheet.hairlineWidth,
    width: '100%',
  },
  momentTime: {
    color: colors.primary,
    fontSize: typography.size.caption,
    fontVariant: ['tabular-nums'],
    fontWeight: typography.weight.medium,
    lineHeight: typography.lineHeight.caption,
    marginTop: spacing.xxs,
  },
  momentUnavailable: {
    borderStyle: 'dashed',
  },
  note: {
    color: colors.textSecondary,
    fontSize: typography.size.small,
    lineHeight: typography.lineHeight.small,
    marginTop: spacing.sm,
  },
  pressed: {
    opacity: 0.6,
  },
  section: {
    marginTop: spacing.lg,
  },
  sheet: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radii.sm,
    borderWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: spacing.md,
    padding: spacing.xs,
  },
  softError: {
    color: colors.error,
    fontSize: typography.size.small,
    lineHeight: typography.lineHeight.small,
    marginTop: spacing.sm,
  },
  title: {
    color: colors.text,
    fontSize: typography.size.title,
    fontWeight: typography.weight.semibold,
    lineHeight: typography.lineHeight.title,
  },
  workingRow: {
    alignItems: 'center',
    flexDirection: 'row',
    marginTop: spacing.sm,
    minHeight: layout.minTouchTarget,
  },
  workingText: {
    color: colors.textSecondary,
    fontSize: typography.size.body,
    lineHeight: typography.lineHeight.body,
    marginLeft: spacing.sm,
  },
});
