import { Image, ScrollView, StyleSheet, Text, View } from 'react-native';

import { PrimaryButton } from '@/components/primary-button';
import { colors, radii, spacing, typography } from '@/constants/theme';
import type { SweepStatus } from '@/database/sweep-model';
import { getProcessingThumbnailUrl } from '@/lib/processing-api';
import type { ProcessingManifest } from '@/types/processing';

type ProcessingSummaryProps = {
  errorMessage: string | null;
  isVideoAvailable: boolean;
  manifest: ProcessingManifest | null;
  onUpload: () => void;
  status: SweepStatus;
};

function formatTimestamp(timestamp: number) {
  const minutes = Math.floor(timestamp / 60);
  const seconds = (timestamp % 60).toFixed(1).padStart(4, '0');
  return `${minutes}:${seconds}`;
}

function thumbnailUrl(path: string) {
  try {
    return getProcessingThumbnailUrl(path);
  } catch {
    return null;
  }
}

export function ProcessingSummary({
  errorMessage,
  isVideoAvailable,
  manifest,
  onUpload,
  status,
}: ProcessingSummaryProps) {
  const isWorking = status === 'uploading' || status === 'processing';
  const canUpload = status === 'saved' || status === 'failed';

  return (
    <View style={styles.section}>
      <Text style={styles.eyebrow}>PROCESSING</Text>
      <Text style={styles.title}>Prepare this saved memory</Text>

      {canUpload ? (
        <View style={styles.privacyNotice}>
          <View style={styles.noticeMark}>
            <Text style={styles.noticeMarkText}>i</Text>
          </View>
          <View style={styles.noticeCopy}>
            <Text style={styles.noticeTitle}>Before you upload</Text>
            <Text style={styles.noticeBody}>
              A copy of this room video will be sent to your configured
              processing server. The uploaded original is deleted after
              processing succeeds or fails; only retained frames remain on the
              server. Your saved video stays on this device for replay.
            </Text>
          </View>
        </View>
      ) : null}

      {isWorking ? (
        <View accessibilityLiveRegion="polite" style={styles.workingCard}>
          <View style={styles.pulse} />
          <View style={styles.workingCopy}>
            <Text style={styles.workingTitle}>
              {status === 'uploading'
                ? 'Uploading room sweep…'
                : 'Processing frames…'}
            </Text>
            <Text style={styles.workingBody}>
              {status === 'uploading'
                ? 'Keep the app open while the saved video is sent.'
                : 'Blurry and near-duplicate frames are being removed.'}
            </Text>
          </View>
        </View>
      ) : null}

      {status === 'ready' && manifest ? (
        <View accessibilityLiveRegion="polite" style={styles.readyCard}>
          <View style={styles.readyHeader}>
            <View>
              <Text style={styles.readyLabel}>FRAMES READY</Text>
              <Text style={styles.readyCount}>
                {manifest.retainedFrameCount} retained from{' '}
                {manifest.totalFramesSampled}
              </Text>
            </View>
            <View style={styles.readyMark}>
              <Text style={styles.readyMarkText}>✓</Text>
            </View>
          </View>

          <ScrollView
            accessibilityLabel="Retained room sweep frames"
            contentContainerStyle={styles.framesContent}
            horizontal
            showsHorizontalScrollIndicator={false}
          >
            {manifest.frames.map((frame) => {
              const uri = thumbnailUrl(frame.thumbnailUrl);
              return (
                <View key={frame.frameId} style={styles.frameCard}>
                  {uri ? (
                    <Image
                      accessibilityLabel={`Retained frame at ${formatTimestamp(frame.timestamp)}`}
                      source={{ uri }}
                      style={styles.frameImage}
                    />
                  ) : (
                    <View style={[styles.frameImage, styles.frameUnavailable]}>
                      <Text style={styles.frameUnavailableText}>
                        Preview unavailable
                      </Text>
                    </View>
                  )}
                  <Text style={styles.frameTimestamp}>
                    {formatTimestamp(frame.timestamp)}
                  </Text>
                </View>
              );
            })}
          </ScrollView>

          <View style={styles.rejectionRow}>
            <Text style={styles.rejectionText}>
              {manifest.rejectedBlurCount} blurry removed
            </Text>
            <View style={styles.rejectionDot} />
            <Text style={styles.rejectionText}>
              {manifest.rejectedDuplicateCount} duplicates removed
            </Text>
          </View>
          <Text style={styles.readyNote}>
            These frames prepare the memory for a later “last seen” search.
            Object search is not connected yet.
          </Text>
        </View>
      ) : null}

      {status === 'failed' ? (
        <View accessibilityLiveRegion="polite" style={styles.failedCard}>
          <Text style={styles.failedTitle}>Processing did not finish</Text>
          <Text style={styles.failedBody}>
            {manifest?.error?.message ??
              errorMessage ??
              'The saved memory is unchanged. You can try the upload again.'}
          </Text>
        </View>
      ) : null}

      {errorMessage && status !== 'failed' ? (
        <Text accessibilityLiveRegion="polite" style={styles.errorText}>
          {errorMessage}
        </Text>
      ) : null}

      {canUpload ? (
        <PrimaryButton
          accessibilityHint="Confirm before uploading this saved room video to the configured processing server"
          disabled={!isVideoAvailable}
          label={
            status === 'failed' ? 'Retry processing' : 'Upload for processing'
          }
          onPress={onUpload}
          showArrow
        />
      ) : null}

      {canUpload && !isVideoAvailable ? (
        <Text style={styles.disabledNote}>
          The local video is unavailable, so it cannot be uploaded.
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  disabledNote: {
    color: colors.muted,
    fontSize: typography.size.bodySmall,
    lineHeight: typography.lineHeight.bodySmall,
    marginTop: spacing.sm,
    textAlign: 'center',
  },
  errorText: {
    color: colors.danger,
    fontSize: typography.size.bodySmall,
    lineHeight: typography.lineHeight.bodySmall,
    marginBottom: spacing.md,
  },
  eyebrow: {
    color: colors.sage,
    fontSize: typography.size.caption,
    fontWeight: typography.weight.bold,
    letterSpacing: 1.4,
  },
  failedBody: {
    color: colors.danger,
    fontSize: typography.size.bodySmall,
    lineHeight: typography.lineHeight.bodySmall,
    marginTop: spacing.xs,
  },
  failedCard: {
    backgroundColor: colors.dangerSoft,
    borderRadius: radii.md,
    marginBottom: spacing.md,
    padding: spacing.md,
  },
  failedTitle: {
    color: colors.danger,
    fontSize: typography.size.body,
    fontWeight: typography.weight.semibold,
  },
  frameCard: {
    backgroundColor: colors.canvasMuted,
    borderRadius: radii.md,
    marginRight: spacing.sm,
    overflow: 'hidden',
    width: 184,
  },
  frameImage: {
    aspectRatio: 4 / 3,
    backgroundColor: colors.cameraSoft,
    width: '100%',
  },
  frameTimestamp: {
    color: colors.ink,
    fontSize: typography.size.caption,
    fontWeight: typography.weight.semibold,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  frameUnavailable: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  frameUnavailableText: {
    color: colors.faint,
    fontSize: typography.size.caption,
  },
  framesContent: {
    paddingBottom: spacing.xs,
    paddingTop: spacing.md,
  },
  noticeBody: {
    color: colors.inkSoft,
    fontSize: typography.size.bodySmall,
    lineHeight: typography.lineHeight.bodySmall,
    marginTop: spacing.xxs,
  },
  noticeCopy: {
    flex: 1,
    marginLeft: spacing.sm,
  },
  noticeMark: {
    alignItems: 'center',
    borderColor: colors.sage,
    borderRadius: radii.pill,
    borderWidth: 1.5,
    height: 26,
    justifyContent: 'center',
    width: 26,
  },
  noticeMarkText: {
    color: colors.sageDark,
    fontSize: typography.size.bodySmall,
    fontWeight: typography.weight.bold,
  },
  noticeTitle: {
    color: colors.ink,
    fontSize: typography.size.bodySmall,
    fontWeight: typography.weight.semibold,
  },
  privacyNotice: {
    backgroundColor: colors.sageSoft,
    borderRadius: radii.md,
    flexDirection: 'row',
    marginBottom: spacing.md,
    marginTop: spacing.md,
    padding: spacing.md,
  },
  pulse: {
    backgroundColor: colors.sage,
    borderRadius: radii.pill,
    height: 10,
    width: 10,
  },
  readyCard: {
    backgroundColor: colors.surface,
    borderColor: colors.line,
    borderRadius: radii.lg,
    borderWidth: 1,
    marginTop: spacing.md,
    overflow: 'hidden',
    padding: spacing.md,
  },
  readyCount: {
    color: colors.ink,
    fontSize: typography.size.body,
    fontWeight: typography.weight.semibold,
    marginTop: spacing.xxs,
  },
  readyHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  readyLabel: {
    color: colors.sage,
    fontSize: typography.size.caption,
    fontWeight: typography.weight.bold,
    letterSpacing: 1.2,
  },
  readyMark: {
    alignItems: 'center',
    backgroundColor: colors.sageSoft,
    borderRadius: radii.pill,
    height: 34,
    justifyContent: 'center',
    width: 34,
  },
  readyMarkText: {
    color: colors.sageDark,
    fontSize: typography.size.body,
    fontWeight: typography.weight.bold,
  },
  readyNote: {
    color: colors.muted,
    fontSize: typography.size.bodySmall,
    lineHeight: typography.lineHeight.bodySmall,
    marginTop: spacing.md,
  },
  rejectionDot: {
    backgroundColor: colors.lineStrong,
    borderRadius: radii.pill,
    height: 4,
    marginHorizontal: spacing.xs,
    width: 4,
  },
  rejectionRow: {
    alignItems: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: spacing.sm,
  },
  rejectionText: {
    color: colors.muted,
    fontSize: typography.size.caption,
  },
  section: {
    borderColor: colors.line,
    borderTopWidth: 1,
    marginTop: spacing.xl,
    paddingTop: spacing.lg,
  },
  title: {
    color: colors.ink,
    fontSize: typography.size.bodyLarge,
    fontWeight: typography.weight.semibold,
    marginTop: spacing.xxs,
  },
  workingBody: {
    color: colors.muted,
    fontSize: typography.size.bodySmall,
    lineHeight: typography.lineHeight.bodySmall,
    marginTop: spacing.xxs,
  },
  workingCard: {
    alignItems: 'center',
    backgroundColor: colors.sageSoft,
    borderRadius: radii.md,
    flexDirection: 'row',
    marginTop: spacing.md,
    padding: spacing.md,
  },
  workingCopy: {
    flex: 1,
    marginLeft: spacing.sm,
  },
  workingTitle: {
    color: colors.sageDark,
    fontSize: typography.size.body,
    fontWeight: typography.weight.semibold,
  },
});
