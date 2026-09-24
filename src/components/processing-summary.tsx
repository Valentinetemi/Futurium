import { useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

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

function Moments({ manifest }: { manifest: ProcessingManifest }) {
  if (manifest.frames.length === 0) {
    return (
      <Text style={styles.body}>
        No clear moments were found in this video. Try recording the room again
        with a slower, steadier sweep.
      </Text>
    );
  }

  return (
    <ScrollView
      accessibilityLabel="Moments from this room"
      contentContainerStyle={styles.momentsContent}
      horizontal
      showsHorizontalScrollIndicator={false}
      style={styles.moments}
    >
      {manifest.frames.map((frame) => {
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
              <View style={[styles.momentImage, styles.momentUnavailable]}>
                <Text style={styles.momentUnavailableText}>No preview</Text>
              </View>
            )}
            <Text style={styles.momentTime}>At {time}</Text>
          </View>
        );
      })}
    </ScrollView>
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
          <Text accessibilityRole="header" style={styles.title}>
            Prepare for finding
          </Text>
          <Text style={styles.body}>
            Futurium picks out clear moments from this video, so you can check
            where things were last seen.
          </Text>
          <Text style={styles.note}>
            A copy is sent to your processing server and deleted there
            afterwards. Your video stays on this phone.
          </Text>
        </>
      ) : null}

      {isWorking ? (
        <View accessibilityLiveRegion="polite">
          <Text accessibilityRole="header" style={styles.title}>
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
          <Text accessibilityRole="header" style={styles.title}>
            {manifest.retainedFrameCount === 1
              ? '1 moment kept'
              : `${manifest.retainedFrameCount} moments kept`}
          </Text>
          <Text style={styles.body}>
            These are the clearest views of the room. Find will use them to show
            where something was last seen, once search is ready.
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
          <Text accessibilityRole="header" style={styles.failedTitle}>
            This memory was not prepared
          </Text>
          <Text style={styles.body}>
            Your video is safe on this phone. You can try again.
          </Text>
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
    marginTop: spacing.md,
  },
  detailsToggle: {
    alignSelf: 'flex-start',
    justifyContent: 'center',
    minHeight: layout.minTouchTarget,
  },
  detailsToggleText: {
    color: colors.primary,
    fontSize: typography.size.small,
    fontWeight: typography.weight.semibold,
  },
  failedTitle: {
    color: colors.error,
    fontSize: typography.size.title,
    fontWeight: typography.weight.semibold,
    lineHeight: typography.lineHeight.title,
  },
  moment: {
    marginRight: spacing.md,
    width: 200,
  },
  momentImage: {
    aspectRatio: 4 / 3,
    backgroundColor: colors.sage,
    borderRadius: radii.sm,
    width: '100%',
  },
  momentTime: {
    color: colors.memoryBlue,
    fontSize: typography.size.small,
    fontVariant: ['tabular-nums'],
    fontWeight: typography.weight.semibold,
    marginTop: spacing.xs,
  },
  momentUnavailable: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  momentUnavailableText: {
    color: colors.textSecondary,
    fontSize: typography.size.caption,
  },
  moments: {
    marginTop: spacing.lg,
  },
  momentsContent: {
    paddingRight: spacing.md,
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
    marginTop: spacing.xl,
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
