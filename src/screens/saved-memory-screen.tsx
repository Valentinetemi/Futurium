import { useEvent } from 'expo';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { StatusBar } from 'expo-status-bar';
import { useVideoPlayer, VideoView } from 'expo-video';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';

import { BackButton } from '@/components/back-button';
import { PrimaryButton } from '@/components/primary-button';
import { ScreenContainer } from '@/components/screen-container';
import { colors, layout, radii, spacing, typography } from '@/constants/theme';
import type { Sweep } from '@/database/sweep-model';
import { getSweep } from '@/database/sweep-repository';
import {
  deleteSweepWithVideo,
  isSweepVideoAvailable,
} from '@/services/sweep-storage';
import {
  formatSweepDate,
  formatSweepDuration,
  getSweepStatusLabel,
} from '@/utils/sweep-formatters';

type SavedMemoryVideoProps = {
  uri: string;
};

function SavedMemoryVideo({ uri }: SavedMemoryVideoProps) {
  const player = useVideoPlayer(uri, (videoPlayer) => {
    videoPlayer.loop = false;
  });
  const { status } = useEvent(player, 'statusChange', {
    status: player.status,
  });

  if (status === 'error') {
    return (
      <View accessibilityLiveRegion="polite" style={styles.videoUnavailable}>
        <View style={styles.unavailableIcon}>
          <Text style={styles.unavailableIconText}>!</Text>
        </View>
        <Text style={styles.unavailableTitle}>Video cannot be played</Text>
        <Text style={styles.unavailableCopy}>
          The saved file may be damaged or use a format this device cannot open.
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.videoFrame}>
      <VideoView
        accessibilityLabel="Saved room sweep video player"
        contentFit="contain"
        nativeControls
        player={player}
        style={styles.video}
        surfaceType="textureView"
      />
      {status !== 'readyToPlay' ? (
        <View pointerEvents="none" style={styles.videoLoading}>
          <ActivityIndicator color={colors.white} />
          <Text style={styles.videoLoadingText}>Preparing video…</Text>
        </View>
      ) : null}
    </View>
  );
}

export function SavedMemoryScreen() {
  const router = useRouter();
  const database = useSQLiteContext();
  const { id } = useLocalSearchParams<{ id?: string | string[] }>();
  const [sweep, setSweep] = useState<Sweep | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isVideoAvailable, setIsVideoAvailable] = useState(false);
  const { width } = useWindowDimensions();
  const isCompact = width < layout.compactBreakpoint;
  const rawId = Array.isArray(id) ? id[0] : id;
  const sweepId = Number(rawId);

  const loadSweep = useCallback(async () => {
    setIsLoading(true);
    setLoadError(null);

    if (!Number.isInteger(sweepId) || sweepId <= 0) {
      setSweep(null);
      setLoadError('This saved memory link is not valid.');
      setIsLoading(false);
      return;
    }

    try {
      const savedSweep = await getSweep(database, sweepId);
      setSweep(savedSweep);
      setIsVideoAvailable(
        savedSweep ? isSweepVideoAvailable(savedSweep.videoUri) : false,
      );
    } catch {
      setLoadError('This saved memory could not be loaded.');
    } finally {
      setIsLoading(false);
    }
  }, [database, sweepId]);

  useFocusEffect(
    useCallback(() => {
      void loadSweep();
    }, [loadSweep]),
  );

  async function deleteMemory(savedSweep: Sweep) {
    setIsDeleting(true);
    setDeleteError(null);

    try {
      await deleteSweepWithVideo(database, savedSweep);
      router.replace('/');
    } catch {
      setDeleteError(
        'This saved memory could not be deleted. Its record has been kept so you can try again.',
      );
      setIsDeleting(false);
    }
  }

  function confirmDelete(savedSweep: Sweep) {
    Alert.alert(
      'Delete saved memory?',
      `This permanently removes ${savedSweep.roomName} and its local video from this device.`,
      [
        { style: 'cancel', text: 'Cancel' },
        {
          onPress: () => void deleteMemory(savedSweep),
          style: 'destructive',
          text: 'Delete',
        },
      ],
    );
  }

  return (
    <ScreenContainer>
      <StatusBar style="dark" />
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingHorizontal: isCompact
              ? layout.horizontalPaddingCompact
              : layout.horizontalPadding,
          },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.contentWidth}>
          <BackButton
            accessibilityLabel="Return to recent memories"
            onPress={() => router.back()}
          />

          {isLoading ? (
            <View accessibilityLiveRegion="polite" style={styles.loadingState}>
              <ActivityIndicator color={colors.sage} size="large" />
              <Text style={styles.loadingText}>Loading saved memory…</Text>
            </View>
          ) : null}

          {!isLoading && (loadError || !sweep) ? (
            <View accessibilityLiveRegion="polite" style={styles.notFoundState}>
              <Text style={styles.notFoundEyebrow}>SAVED MEMORY</Text>
              <Text accessibilityRole="header" style={styles.notFoundTitle}>
                Memory unavailable
              </Text>
              <Text style={styles.notFoundCopy}>
                {loadError ?? 'This saved memory no longer exists.'}
              </Text>
            </View>
          ) : null}

          {!isLoading && sweep ? (
            <>
              <View style={styles.header}>
                <Text style={styles.eyebrow}>SAVED MEMORY</Text>
                <Text accessibilityRole="header" style={styles.title}>
                  {sweep.roomName}
                </Text>
                <Text style={styles.savedAt}>
                  Saved {formatSweepDate(sweep.createdAt)}
                </Text>
              </View>

              {isVideoAvailable ? (
                <SavedMemoryVideo uri={sweep.videoUri} />
              ) : (
                <View
                  accessibilityLiveRegion="polite"
                  style={styles.videoUnavailable}
                >
                  <View style={styles.unavailableIcon}>
                    <Text style={styles.unavailableIconText}>!</Text>
                  </View>
                  <Text style={styles.unavailableTitle}>
                    Video file is missing
                  </Text>
                  <Text style={styles.unavailableCopy}>
                    The memory record still exists, but its local video is no
                    longer available on this device.
                  </Text>
                </View>
              )}

              <View style={styles.detailsCard}>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>DURATION</Text>
                  <Text style={styles.detailValue}>
                    {formatSweepDuration(sweep.durationSeconds)}
                  </Text>
                </View>
                <View style={styles.detailDivider} />
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>STATUS</Text>
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
                      {getSweepStatusLabel(sweep.status)}
                    </Text>
                  </View>
                </View>
              </View>

              <Text style={styles.searchNotice}>
                Object search is not connected yet. This is a saved memory for
                replay only.
              </Text>

              <View style={styles.deleteSection}>
                <Text style={styles.deleteTitle}>Remove saved memory</Text>
                <Text style={styles.deleteCopy}>
                  This deletes both the database record and video from this
                  device.
                </Text>
                <PrimaryButton
                  accessibilityHint="Ask for confirmation before permanently deleting this saved memory and video"
                  disabled={isDeleting}
                  label={isDeleting ? 'Deleting…' : 'Delete memory'}
                  onPress={() => confirmDelete(sweep)}
                  variant="danger"
                />
                {deleteError ? (
                  <Text
                    accessibilityLiveRegion="polite"
                    style={styles.deleteError}
                  >
                    {deleteError}
                  </Text>
                ) : null}
              </View>
            </>
          ) : null}
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  contentWidth: {
    alignSelf: 'center',
    maxWidth: layout.maxContentWidth,
    width: '100%',
  },
  detailDivider: {
    backgroundColor: colors.line,
    height: 1,
    marginVertical: spacing.md,
  },
  detailLabel: {
    color: colors.muted,
    fontSize: 10,
    fontWeight: typography.weight.bold,
    letterSpacing: 1.2,
  },
  detailRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  detailValue: {
    color: colors.ink,
    fontSize: typography.size.body,
    fontWeight: typography.weight.semibold,
  },
  deleteCopy: {
    color: colors.muted,
    fontSize: typography.size.bodySmall,
    lineHeight: typography.lineHeight.bodySmall,
    marginBottom: spacing.md,
    marginTop: spacing.xs,
  },
  deleteError: {
    color: colors.danger,
    fontSize: typography.size.bodySmall,
    lineHeight: typography.lineHeight.bodySmall,
    marginTop: spacing.md,
    textAlign: 'center',
  },
  deleteSection: {
    borderColor: colors.line,
    borderTopWidth: 1,
    marginTop: spacing.xl,
    paddingTop: spacing.lg,
  },
  deleteTitle: {
    color: colors.ink,
    fontSize: typography.size.body,
    fontWeight: typography.weight.semibold,
  },
  detailsCard: {
    backgroundColor: colors.surface,
    borderColor: colors.line,
    borderRadius: radii.lg,
    borderWidth: 1,
    marginTop: spacing.md,
    padding: spacing.lg,
  },
  eyebrow: {
    color: colors.sage,
    fontSize: typography.size.caption,
    fontWeight: typography.weight.bold,
    letterSpacing: 1.5,
    lineHeight: typography.lineHeight.caption,
  },
  header: {
    marginBottom: spacing.lg,
    marginTop: spacing.xl,
  },
  loadingState: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    minHeight: 420,
  },
  loadingText: {
    color: colors.muted,
    fontSize: typography.size.body,
    marginTop: spacing.md,
  },
  notFoundCopy: {
    color: colors.muted,
    fontSize: typography.size.body,
    lineHeight: typography.lineHeight.body,
    marginTop: spacing.sm,
    maxWidth: 420,
    textAlign: 'center',
  },
  notFoundEyebrow: {
    color: colors.sage,
    fontSize: typography.size.caption,
    fontWeight: typography.weight.bold,
    letterSpacing: 1.5,
  },
  notFoundState: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    minHeight: 420,
  },
  notFoundTitle: {
    color: colors.ink,
    fontSize: typography.size.heading,
    fontWeight: typography.weight.semibold,
    marginTop: spacing.sm,
  },
  savedAt: {
    color: colors.muted,
    fontSize: typography.size.body,
    lineHeight: typography.lineHeight.body,
    marginTop: spacing.xs,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: spacing.xl,
    paddingTop: spacing.xs,
  },
  searchNotice: {
    color: colors.muted,
    fontSize: typography.size.bodySmall,
    lineHeight: typography.lineHeight.bodySmall,
    marginTop: spacing.lg,
    textAlign: 'center',
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
    paddingVertical: spacing.xs,
  },
  statusPillFailed: {
    backgroundColor: colors.dangerSoft,
  },
  statusText: {
    color: colors.sageDark,
    fontSize: typography.size.caption,
    fontWeight: typography.weight.semibold,
  },
  statusTextFailed: {
    color: colors.danger,
  },
  title: {
    color: colors.ink,
    fontSize: typography.size.heading,
    fontWeight: typography.weight.semibold,
    letterSpacing: -1,
    lineHeight: typography.lineHeight.heading,
    marginTop: spacing.xs,
  },
  unavailableCopy: {
    color: colors.faint,
    fontSize: typography.size.bodySmall,
    lineHeight: typography.lineHeight.bodySmall,
    marginTop: spacing.xs,
    maxWidth: 340,
    textAlign: 'center',
  },
  unavailableIcon: {
    alignItems: 'center',
    borderColor: colors.faint,
    borderRadius: radii.pill,
    borderWidth: 1.5,
    height: 42,
    justifyContent: 'center',
    marginBottom: spacing.md,
    width: 42,
  },
  unavailableIconText: {
    color: colors.faint,
    fontSize: typography.size.bodyLarge,
    fontWeight: typography.weight.bold,
  },
  unavailableTitle: {
    color: colors.white,
    fontSize: typography.size.bodyLarge,
    fontWeight: typography.weight.semibold,
  },
  video: {
    flex: 1,
  },
  videoFrame: {
    aspectRatio: 3 / 4,
    backgroundColor: colors.camera,
    borderRadius: radii.lg,
    maxHeight: 560,
    overflow: 'hidden',
    width: '100%',
  },
  videoLoading: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    backgroundColor: 'rgba(16,20,17,0.82)',
    justifyContent: 'center',
  },
  videoLoadingText: {
    color: colors.white,
    fontSize: typography.size.bodySmall,
    marginTop: spacing.sm,
  },
  videoUnavailable: {
    alignItems: 'center',
    aspectRatio: 3 / 4,
    backgroundColor: colors.cameraSoft,
    borderRadius: radii.lg,
    justifyContent: 'center',
    maxHeight: 560,
    padding: spacing.lg,
    width: '100%',
  },
});
