import { useEvent } from 'expo';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { StatusBar } from 'expo-status-bar';
import { useVideoPlayer, VideoView } from 'expo-video';
import { useCallback, useEffect, useState } from 'react';
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
import { ProcessingSummary } from '@/components/processing-summary';
import { ScreenContainer } from '@/components/screen-container';
import { colors, layout, radii, spacing, typography } from '@/constants/theme';
import type { Sweep } from '@/database/sweep-model';
import {
  beginSweepUpload,
  getSweep,
  saveSweepProcessingManifest,
  updateSweepStatus,
} from '@/database/sweep-repository';
import {
  getSweepProcessing,
  ProcessingApiError,
  uploadSweepForProcessing,
} from '@/lib/processing-api';
import {
  deleteSweepWithVideo,
  isSweepVideoAvailable,
} from '@/services/sweep-storage';
import { formatSweepDate, formatSweepDuration } from '@/utils/sweep-formatters';

type SavedMemoryVideoProps = {
  uri: string;
};

function processingErrorMessage(error: unknown) {
  if (error instanceof ProcessingApiError || error instanceof Error) {
    return error.message;
  }

  return 'The saved memory could not be processed. Please try again.';
}

function SavedMemoryVideo({ uri }: SavedMemoryVideoProps) {
  const player = useVideoPlayer(uri, (videoPlayer) => {
    videoPlayer.loop = false;
  });
  const { status } = useEvent(player, 'statusChange', {
    status: player.status,
  });

  if (status === 'error') {
    return (
      <VideoMessage
        body="The file may be damaged, or this phone cannot open its format."
        title="This video cannot be played"
      />
    );
  }

  return (
    <View style={styles.videoFrame}>
      <VideoView
        accessibilityLabel="Video of this room"
        contentFit="contain"
        nativeControls
        player={player}
        style={styles.video}
        surfaceType="textureView"
      />
      {status !== 'readyToPlay' ? (
        <View pointerEvents="none" style={styles.videoLoading}>
          <ActivityIndicator color={colors.cameraText} />
        </View>
      ) : null}
    </View>
  );
}

function VideoMessage({ body, title }: { body: string; title: string }) {
  return (
    <View accessibilityLiveRegion="polite" style={styles.videoMessage}>
      <Text style={styles.videoMessageTitle}>{title}</Text>
      <Text style={styles.videoMessageBody}>{body}</Text>
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
  const [processingError, setProcessingError] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isVideoAvailable, setIsVideoAvailable] = useState(false);
  const { width } = useWindowDimensions();
  const isCompact = width < layout.compactBreakpoint;
  const rawId = Array.isArray(id) ? id[0] : id;
  const sweepId = Number(rawId);
  const hasProcessingManifest = Boolean(sweep?.processingManifest);

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
      let savedSweep = await getSweep(database, sweepId);

      if (savedSweep?.status === 'uploading' && !savedSweep.processingJobId) {
        savedSweep = await updateSweepStatus(database, sweepId, 'failed');
        setProcessingError(
          'The previous upload was interrupted before the server created a job. You can retry it safely.',
        );
      }

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

  useEffect(() => {
    const jobId = sweep?.processingJobId;
    const processingStatus = sweep?.status;
    const needsManifestRefresh =
      processingStatus === 'processing' ||
      (processingStatus === 'ready' && !hasProcessingManifest);

    if (!jobId || !needsManifestRefresh) {
      return;
    }

    const activeJobId = jobId;
    let isCancelled = false;
    let nextCheck: ReturnType<typeof setTimeout> | undefined;

    async function checkProcessing() {
      try {
        const manifest = await getSweepProcessing(activeJobId);
        if (isCancelled) {
          return;
        }

        const updatedSweep = await saveSweepProcessingManifest(
          database,
          sweepId,
          manifest,
        );
        if (isCancelled) {
          return;
        }

        setSweep(updatedSweep);
        setProcessingError(null);

        if (manifest.status === 'processing') {
          nextCheck = setTimeout(() => void checkProcessing(), 1200);
        }
      } catch (error) {
        if (isCancelled) {
          return;
        }

        setProcessingError(
          `${processingErrorMessage(error)} The app will check again automatically.`,
        );
        nextCheck = setTimeout(() => void checkProcessing(), 3000);
      }
    }

    void checkProcessing();

    return () => {
      isCancelled = true;
      if (nextCheck) {
        clearTimeout(nextCheck);
      }
    };
  }, [
    database,
    hasProcessingManifest,
    sweep?.processingJobId,
    sweep?.status,
    sweepId,
  ]);

  async function uploadForProcessing(savedSweep: Sweep) {
    setProcessingError(null);

    try {
      const uploadingSweep = await beginSweepUpload(database, savedSweep.id);
      if (!uploadingSweep) {
        throw new Error('This saved memory no longer exists.');
      }
      setSweep(uploadingSweep);

      const manifest = await uploadSweepForProcessing(
        savedSweep.id,
        savedSweep.videoUri,
      );
      const updatedSweep = await saveSweepProcessingManifest(
        database,
        savedSweep.id,
        manifest,
      );
      setSweep(updatedSweep);
    } catch (error) {
      const failedSweep = await updateSweepStatus(
        database,
        savedSweep.id,
        'failed',
      );
      setSweep(failedSweep);
      setProcessingError(processingErrorMessage(error));
    }
  }

  function confirmUpload(savedSweep: Sweep) {
    Alert.alert(
      'Prepare this memory?',
      'A copy of this video will be sent to your processing server. The server deletes the copy once it has finished, whether or not it succeeds. Your video stays on this phone.',
      [
        { style: 'cancel', text: 'Cancel' },
        {
          onPress: () => void uploadForProcessing(savedSweep),
          text: 'Send copy',
        },
      ],
    );
  }

  async function deleteMemory(savedSweep: Sweep) {
    setIsDeleting(true);
    setDeleteError(null);

    try {
      await deleteSweepWithVideo(database, savedSweep);
      router.replace('/');
    } catch {
      setDeleteError(
        'This memory could not be deleted. It is still here, so you can try again.',
      );
      setIsDeleting(false);
    }
  }

  function confirmDelete(savedSweep: Sweep) {
    Alert.alert(
      'Delete this memory?',
      `${savedSweep.roomName} and its video will be removed from this phone. This cannot be undone.`,
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
            accessibilityLabel="Return to your memories"
            label="Memories"
            onPress={() => router.back()}
          />

          {isLoading ? (
            <View accessibilityLiveRegion="polite" style={styles.centerState}>
              <ActivityIndicator color={colors.primary} size="large" />
              <Text style={styles.centerCopy}>Loading this memory…</Text>
            </View>
          ) : null}

          {!isLoading && (loadError || !sweep) ? (
            <View accessibilityLiveRegion="polite" style={styles.centerState}>
              <Text accessibilityRole="header" style={styles.centerTitle}>
                Memory not found
              </Text>
              <Text style={styles.centerCopy}>
                {loadError ?? 'This memory is no longer on this phone.'}
              </Text>
            </View>
          ) : null}

          {!isLoading && sweep ? (
            <>
              <View style={styles.header}>
                <Text accessibilityRole="header" style={styles.title}>
                  {sweep.roomName}
                </Text>
                <Text style={styles.meta}>
                  Recorded {formatSweepDate(sweep.createdAt)} ·{' '}
                  {formatSweepDuration(sweep.durationSeconds)}
                </Text>
              </View>

              {isVideoAvailable ? (
                <SavedMemoryVideo uri={sweep.videoUri} />
              ) : (
                <VideoMessage
                  body="The memory is still listed, but its video is no longer on this phone."
                  title="Video missing"
                />
              )}

              <ProcessingSummary
                errorMessage={processingError}
                isVideoAvailable={isVideoAvailable}
                manifest={sweep.processingManifest}
                onUpload={() => confirmUpload(sweep)}
                status={sweep.status}
              />

              <View style={styles.deleteSection}>
                <Text style={styles.deleteCopy}>
                  Deleting removes this memory and its video from this phone.
                </Text>
                <PrimaryButton
                  accessibilityHint="Asks before permanently deleting this memory and its video"
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
  centerCopy: {
    color: colors.textSecondary,
    fontSize: typography.size.body,
    lineHeight: typography.lineHeight.body,
    marginTop: spacing.sm,
    maxWidth: 420,
    textAlign: 'center',
  },
  centerState: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    minHeight: 420,
  },
  centerTitle: {
    color: colors.text,
    fontSize: typography.size.title,
    fontWeight: typography.weight.semibold,
    lineHeight: typography.lineHeight.title,
  },
  contentWidth: {
    alignSelf: 'center',
    maxWidth: layout.maxContentWidth,
    width: '100%',
  },
  deleteCopy: {
    color: colors.textSecondary,
    fontSize: typography.size.small,
    lineHeight: typography.lineHeight.small,
    marginBottom: spacing.md,
  },
  deleteError: {
    color: colors.error,
    fontSize: typography.size.small,
    lineHeight: typography.lineHeight.small,
    marginTop: spacing.md,
  },
  deleteSection: {
    borderTopColor: colors.border,
    borderTopWidth: 1,
    marginTop: spacing.xxl,
    paddingTop: spacing.lg,
  },
  header: {
    marginBottom: spacing.lg,
    marginTop: spacing.md,
  },
  meta: {
    color: colors.textSecondary,
    fontSize: typography.size.body,
    lineHeight: typography.lineHeight.body,
    marginTop: spacing.xs,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: spacing.xxl,
    paddingTop: spacing.xs,
  },
  title: {
    color: colors.text,
    fontSize: typography.size.heading,
    fontWeight: typography.weight.semibold,
    lineHeight: typography.lineHeight.heading,
  },
  video: {
    flex: 1,
  },
  videoFrame: {
    aspectRatio: 3 / 4,
    backgroundColor: colors.camera,
    borderRadius: radii.md,
    maxHeight: 560,
    overflow: 'hidden',
    width: '100%',
  },
  videoLoading: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  videoMessage: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radii.md,
    borderWidth: 1,
    padding: spacing.lg,
  },
  videoMessageBody: {
    color: colors.textSecondary,
    fontSize: typography.size.body,
    lineHeight: typography.lineHeight.body,
    marginTop: spacing.xs,
  },
  videoMessageTitle: {
    color: colors.text,
    fontSize: typography.size.bodyLarge,
    fontWeight: typography.weight.semibold,
    lineHeight: typography.lineHeight.bodyLarge,
  },
});
