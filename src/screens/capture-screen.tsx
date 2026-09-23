import {
  CameraView,
  useCameraPermissions,
  useMicrophonePermissions,
} from 'expo-camera';
import { File } from 'expo-file-system';
import { useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { StatusBar } from 'expo-status-bar';
import { useVideoPlayer, VideoView } from 'expo-video';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Linking,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';

import { BackButton } from '@/components/back-button';
import { PrimaryButton } from '@/components/primary-button';
import { ScreenContainer } from '@/components/screen-container';
import { colors, layout, radii, spacing, typography } from '@/constants/theme';
import { saveSweepWithVideo } from '@/services/sweep-storage';

const MAX_RECORDING_SECONDS = 30;
const ROOM_SUGGESTIONS = [
  'Bedroom',
  'Living room',
  'Kitchen',
  'Other',
] as const;

type SweepPreviewProps = {
  isSaving: boolean;
  onDiscard: () => void;
  onSave: () => void;
  uri: string;
};

function SweepPreview({ isSaving, onDiscard, onSave, uri }: SweepPreviewProps) {
  const player = useVideoPlayer(uri, (videoPlayer) => {
    videoPlayer.loop = true;
    videoPlayer.play();
  });

  return (
    <View style={styles.previewScreen}>
      <VideoView
        accessibilityLabel="Preview of the completed room sweep"
        contentFit="cover"
        nativeControls
        player={player}
        style={styles.videoPreview}
        surfaceType="textureView"
      />

      <View style={styles.previewShade} pointerEvents="none" />

      <View style={styles.previewHeader}>
        <Text style={styles.cameraEyebrow}>REVIEW SWEEP</Text>
        <Text accessibilityRole="header" style={styles.previewTitle}>
          Keep this room sweep?
        </Text>
        <Text style={styles.previewCopy}>
          Play it back and make sure the room is covered clearly.
        </Text>
      </View>

      <View style={styles.previewActions}>
        <>
          <PrimaryButton
            accessibilityHint="Name this room before saving the memory"
            disabled={isSaving}
            label="Save memory"
            onPress={onSave}
          />
          <PrimaryButton
            accessibilityHint="Delete this recording and return to the camera"
            disabled={isSaving}
            label="Discard"
            onPress={onDiscard}
            variant="secondary"
          />
        </>
      </View>
    </View>
  );
}

type RoomNameModalProps = {
  errorMessage: string | null;
  isSaving: boolean;
  onCancel: () => void;
  onChangeRoomName: (roomName: string) => void;
  onSave: () => void;
  roomName: string;
  visible: boolean;
};

function RoomNameModal({
  errorMessage,
  isSaving,
  onCancel,
  onChangeRoomName,
  onSave,
  roomName,
  visible,
}: RoomNameModalProps) {
  const trimmedRoomName = roomName.trim();
  const presetRoomNames: readonly string[] = ROOM_SUGGESTIONS.slice(0, -1);

  return (
    <Modal
      animationType="slide"
      onRequestClose={isSaving ? undefined : onCancel}
      transparent
      visible={visible}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.modalRoot}
      >
        <Pressable
          accessibilityLabel="Close room name dialog"
          accessibilityRole="button"
          disabled={isSaving}
          onPress={onCancel}
          style={styles.modalBackdrop}
        />
        <View style={styles.roomSheet}>
          <View style={styles.sheetHandle} />
          <Text style={styles.sheetEyebrow}>SAVE MEMORY</Text>
          <Text accessibilityRole="header" style={styles.sheetTitle}>
            Which room is this?
          </Text>
          <Text style={styles.sheetCopy}>
            A clear room name will make this saved memory easier to recognize.
          </Text>

          <View
            accessibilityLabel="Room name suggestions"
            style={styles.suggestions}
          >
            {ROOM_SUGGESTIONS.map((suggestion) => {
              const isOther = suggestion === 'Other';
              const isSelected = isOther
                ? trimmedRoomName.length > 0 &&
                  !presetRoomNames.includes(trimmedRoomName)
                : trimmedRoomName === suggestion;

              return (
                <Pressable
                  accessibilityRole="button"
                  accessibilityState={{ selected: isSelected }}
                  key={suggestion}
                  onPress={() => onChangeRoomName(isOther ? '' : suggestion)}
                  style={({ pressed }) => [
                    styles.suggestion,
                    isSelected && styles.suggestionSelected,
                    pressed && styles.suggestionPressed,
                  ]}
                >
                  <Text
                    style={[
                      styles.suggestionText,
                      isSelected && styles.suggestionTextSelected,
                    ]}
                  >
                    {suggestion}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <TextInput
            accessibilityLabel="Room name"
            autoCapitalize="words"
            editable={!isSaving}
            maxLength={80}
            onChangeText={onChangeRoomName}
            placeholder="Or type a room name"
            placeholderTextColor={colors.faint}
            returnKeyType="done"
            style={styles.roomInput}
            value={roomName}
          />

          <PrimaryButton
            accessibilityHint="Copy the video to permanent storage and create a saved memory"
            disabled={!trimmedRoomName || isSaving}
            label={isSaving ? 'Saving memory…' : 'Save memory'}
            onPress={onSave}
          />

          {errorMessage ? (
            <Text accessibilityLiveRegion="polite" style={styles.sheetError}>
              {errorMessage}
            </Text>
          ) : null}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

export function CaptureScreen() {
  const router = useRouter();
  const database = useSQLiteContext();
  const cameraRef = useRef<CameraView>(null);
  const recordingStartedAt = useRef(0);
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const [microphonePermission, requestMicrophonePermission] =
    useMicrophonePermissions();
  const [isCameraReady, setIsCameraReady] = useState(false);
  const [isNamingRoom, setIsNamingRoom] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [recordedDurationSeconds, setRecordedDurationSeconds] = useState(0);
  const [roomName, setRoomName] = useState('');
  const [videoUri, setVideoUri] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const { width } = useWindowDimensions();
  const isCompact = width < layout.compactBreakpoint;

  useEffect(() => {
    if (!isRecording) {
      return;
    }

    const timer = setInterval(() => {
      const seconds = Math.min(
        MAX_RECORDING_SECONDS,
        Math.floor((Date.now() - recordingStartedAt.current) / 1000),
      );
      setElapsedSeconds(seconds);
    }, 250);

    return () => clearInterval(timer);
  }, [isRecording]);

  const hasPermissions =
    cameraPermission?.granted === true &&
    microphonePermission?.granted === true;
  const canAskAgain =
    cameraPermission?.canAskAgain !== false &&
    microphonePermission?.canAskAgain !== false;

  async function requestPermissions() {
    setErrorMessage(null);

    const cameraResult = await requestCameraPermission();
    const microphoneResult = await requestMicrophonePermission();

    if (!cameraResult.granted || !microphoneResult.granted) {
      setErrorMessage(
        'Camera and microphone access are both needed to record a room sweep.',
      );
    }
  }

  async function beginRecording() {
    if (!cameraRef.current || !isCameraReady || isRecording) {
      return;
    }

    setErrorMessage(null);
    setElapsedSeconds(0);
    setIsRecording(true);
    recordingStartedAt.current = Date.now();

    try {
      const recording = await cameraRef.current.recordAsync({
        maxDuration: MAX_RECORDING_SECONDS,
      });

      if (recording?.uri) {
        setRecordedDurationSeconds(
          Math.max(
            1,
            Math.min(
              MAX_RECORDING_SECONDS,
              Math.round((Date.now() - recordingStartedAt.current) / 1000),
            ),
          ),
        );
        setVideoUri(recording.uri);
      } else {
        setErrorMessage('No video was recorded. Please try the sweep again.');
      }
    } catch {
      setErrorMessage('The sweep could not be recorded. Please try again.');
    } finally {
      setIsRecording(false);
    }
  }

  function stopRecording() {
    if (!isRecording) {
      return;
    }

    cameraRef.current?.stopRecording();
  }

  function discardSweep() {
    if (videoUri) {
      const temporaryVideo = new File(videoUri);

      if (temporaryVideo.exists) {
        temporaryVideo.delete();
      }
    }

    setVideoUri(null);
    setIsNamingRoom(false);
    setElapsedSeconds(0);
    setRecordedDurationSeconds(0);
    setRoomName('');
    setErrorMessage(null);
  }

  async function saveSweep() {
    if (!videoUri || !roomName.trim() || isSaving) {
      return;
    }

    setIsSaving(true);
    setErrorMessage(null);

    try {
      await saveSweepWithVideo(database, {
        durationSeconds: recordedDurationSeconds,
        roomName,
        temporaryVideoUri: videoUri,
      });
      router.replace('/');
    } catch {
      setErrorMessage(
        'This saved memory could not be created. Please try again.',
      );
    } finally {
      setIsSaving(false);
    }
  }

  if (videoUri) {
    return (
      <ScreenContainer dark style={styles.screen}>
        <StatusBar style="light" />
        <SweepPreview
          isSaving={isSaving}
          onDiscard={discardSweep}
          onSave={() => {
            setErrorMessage(null);
            setIsNamingRoom(true);
          }}
          uri={videoUri}
        />
        {!isNamingRoom && errorMessage ? (
          <View accessibilityLiveRegion="polite" style={styles.errorToast}>
            <Text style={styles.errorToastText}>{errorMessage}</Text>
          </View>
        ) : null}
        <RoomNameModal
          errorMessage={errorMessage}
          isSaving={isSaving}
          onCancel={() => {
            setErrorMessage(null);
            setIsNamingRoom(false);
          }}
          onChangeRoomName={setRoomName}
          onSave={saveSweep}
          roomName={roomName}
          visible={isNamingRoom}
        />
      </ScreenContainer>
    );
  }

  if (!cameraPermission || !microphonePermission) {
    return (
      <ScreenContainer dark style={styles.screen}>
        <StatusBar style="light" />
        <View style={styles.loadingState}>
          <ActivityIndicator color={colors.mint} size="large" />
          <Text style={styles.loadingText}>Preparing the camera…</Text>
        </View>
      </ScreenContainer>
    );
  }

  if (!hasPermissions) {
    return (
      <ScreenContainer dark style={styles.screen}>
        <StatusBar style="light" />
        <View
          style={[
            styles.permissionContent,
            {
              paddingHorizontal: isCompact
                ? layout.horizontalPaddingCompact
                : layout.horizontalPadding,
            },
          ]}
        >
          <BackButton
            accessibilityLabel="Return home"
            dark
            onPress={() => router.back()}
          />

          <View style={styles.permissionBody}>
            <View style={styles.permissionIcon}>
              <View style={styles.permissionLens} />
            </View>
            <Text style={styles.cameraEyebrow}>ROOM SWEEP</Text>
            <Text accessibilityRole="header" style={styles.permissionTitle}>
              Let Futurium see and hear the space.
            </Text>
            <Text style={styles.permissionCopy}>
              Camera access records the room. Microphone access adds sound to
              the same private, 30-second video.
            </Text>
            <View style={styles.permissionNote}>
              <Text style={styles.permissionNoteText}>
                No frames are extracted or uploaded in this prototype.
              </Text>
            </View>
          </View>

          <View style={styles.permissionActions}>
            <PrimaryButton
              accessibilityHint={
                canAskAgain
                  ? 'Request camera and microphone permissions'
                  : 'Open system settings to allow camera and microphone access'
              }
              label={canAskAgain ? 'Allow access' : 'Open settings'}
              onPress={
                canAskAgain ? requestPermissions : () => Linking.openSettings()
              }
            />
            {errorMessage ? (
              <Text accessibilityLiveRegion="polite" style={styles.errorText}>
                {errorMessage}
              </Text>
            ) : null}
          </View>
        </View>
      </ScreenContainer>
    );
  }

  const secondsRemaining = MAX_RECORDING_SECONDS - elapsedSeconds;

  return (
    <ScreenContainer dark style={styles.screen}>
      <StatusBar style="light" />
      <View style={styles.cameraFrame}>
        <CameraView
          facing="back"
          mode="video"
          mute={false}
          onCameraReady={() => setIsCameraReady(true)}
          onMountError={() =>
            setErrorMessage(
              'The camera could not start. Check this device and try again.',
            )
          }
          ref={cameraRef}
          style={StyleSheet.absoluteFill}
          videoQuality="720p"
        />
        <View pointerEvents="none" style={styles.cameraShade} />

        <View style={styles.cameraTopBar}>
          {!isRecording ? (
            <BackButton
              accessibilityLabel="Return home"
              dark
              onPress={() => router.back()}
            />
          ) : (
            <View style={styles.recordingBadge}>
              <View style={styles.recordingDot} />
              <Text style={styles.recordingBadgeText}>REC</Text>
            </View>
          )}

          <View style={styles.timerPill}>
            <Text accessibilityLiveRegion="polite" style={styles.timerText}>
              00:{elapsedSeconds.toString().padStart(2, '0')}
            </Text>
            <Text style={styles.timerLimit}> / 00:30</Text>
          </View>
        </View>

        <View pointerEvents="none" style={styles.guideFrame}>
          <View style={[styles.corner, styles.cornerTopLeft]} />
          <View style={[styles.corner, styles.cornerTopRight]} />
          <View style={[styles.corner, styles.cornerBottomLeft]} />
          <View style={[styles.corner, styles.cornerBottomRight]} />
        </View>

        <View
          style={[
            styles.cameraBottom,
            {
              paddingHorizontal: isCompact
                ? layout.horizontalPaddingCompact
                : layout.horizontalPadding,
            },
          ]}
        >
          <Text style={styles.cameraEyebrow}>
            {isRecording ? 'SWEEP IN PROGRESS' : 'ROOM SWEEP'}
          </Text>
          <Text style={styles.cameraTitle}>
            {isRecording
              ? `${secondsRemaining} seconds remaining`
              : 'Move slowly around the space.'}
          </Text>
          <Text style={styles.cameraCopy}>
            {isRecording
              ? 'Keep important surfaces and objects clearly in frame.'
              : 'Capture shelves, tables and corners in one continuous video.'}
          </Text>

          <Pressable
            accessibilityHint={
              isRecording
                ? 'Stop and preview this room sweep'
                : 'Begin recording a room sweep for up to 30 seconds'
            }
            accessibilityLabel={
              isRecording ? 'Stop room sweep' : 'Begin room sweep'
            }
            accessibilityRole="button"
            disabled={!isCameraReady}
            onPress={isRecording ? stopRecording : beginRecording}
            style={({ pressed }) => [
              styles.recordControl,
              isRecording && styles.stopControl,
              !isCameraReady && styles.controlDisabled,
              pressed && styles.controlPressed,
            ]}
          >
            {isCameraReady ? (
              <View
                style={
                  isRecording ? styles.stopControlCenter : styles.recordCenter
                }
              />
            ) : (
              <ActivityIndicator color={colors.white} />
            )}
          </Pressable>

          {errorMessage ? (
            <Text accessibilityLiveRegion="polite" style={styles.cameraError}>
              {errorMessage}
            </Text>
          ) : (
            <Text style={styles.cameraHint}>
              {isRecording ? 'Tap to stop early' : 'Maximum 30 seconds'}
            </Text>
          )}
        </View>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  cameraBottom: {
    alignItems: 'center',
    bottom: 0,
    left: 0,
    paddingBottom: spacing.lg,
    position: 'absolute',
    right: 0,
  },
  cameraCopy: {
    color: 'rgba(250,251,249,0.76)',
    fontSize: typography.size.bodySmall,
    lineHeight: typography.lineHeight.bodySmall,
    marginTop: spacing.xs,
    maxWidth: 420,
    textAlign: 'center',
  },
  cameraError: {
    color: '#FFD5D1',
    fontSize: typography.size.bodySmall,
    lineHeight: typography.lineHeight.bodySmall,
    marginTop: spacing.sm,
    textAlign: 'center',
  },
  cameraEyebrow: {
    color: colors.mint,
    fontSize: typography.size.caption,
    fontWeight: typography.weight.bold,
    letterSpacing: 1.6,
    lineHeight: typography.lineHeight.caption,
  },
  cameraFrame: {
    backgroundColor: colors.camera,
    flex: 1,
    overflow: 'hidden',
  },
  cameraHint: {
    color: 'rgba(250,251,249,0.66)',
    fontSize: typography.size.caption,
    marginTop: spacing.sm,
  },
  cameraShade: {
    ...StyleSheet.absoluteFill,
    backgroundColor: colors.overlay,
    opacity: 0.42,
  },
  cameraTitle: {
    color: colors.white,
    fontSize: 22,
    fontWeight: typography.weight.semibold,
    lineHeight: 28,
    marginTop: spacing.xs,
    textAlign: 'center',
  },
  cameraTopBar: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    left: spacing.md,
    position: 'absolute',
    right: spacing.md,
    top: spacing.sm,
  },
  controlDisabled: {
    opacity: 0.55,
  },
  controlPressed: {
    transform: [{ scale: 0.94 }],
  },
  corner: {
    borderColor: 'rgba(255,255,255,0.68)',
    height: 36,
    position: 'absolute',
    width: 36,
  },
  cornerBottomLeft: {
    borderBottomWidth: 1,
    borderLeftWidth: 1,
    bottom: 0,
    left: 0,
  },
  cornerBottomRight: {
    borderBottomWidth: 1,
    borderRightWidth: 1,
    bottom: 0,
    right: 0,
  },
  cornerTopLeft: {
    borderLeftWidth: 1,
    borderTopWidth: 1,
    left: 0,
    top: 0,
  },
  cornerTopRight: {
    borderRightWidth: 1,
    borderTopWidth: 1,
    right: 0,
    top: 0,
  },
  errorText: {
    color: '#FFD5D1',
    fontSize: typography.size.bodySmall,
    lineHeight: typography.lineHeight.bodySmall,
    marginTop: spacing.md,
    textAlign: 'center',
  },
  errorToast: {
    backgroundColor: colors.danger,
    borderRadius: radii.md,
    left: spacing.lg,
    padding: spacing.md,
    position: 'absolute',
    right: spacing.lg,
    top: spacing.lg,
  },
  errorToastText: {
    color: colors.white,
    fontSize: typography.size.bodySmall,
    textAlign: 'center',
  },
  guideFrame: {
    bottom: 238,
    left: spacing.lg,
    position: 'absolute',
    right: spacing.lg,
    top: 90,
  },
  loadingState: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
  },
  loadingText: {
    color: colors.white,
    fontSize: typography.size.body,
    marginTop: spacing.md,
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(10,14,11,0.62)',
  },
  modalRoot: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  permissionActions: {
    paddingBottom: spacing.lg,
  },
  permissionBody: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
  },
  permissionContent: {
    alignSelf: 'center',
    flex: 1,
    maxWidth: layout.maxContentWidth,
    paddingTop: spacing.xs,
    width: '100%',
  },
  permissionCopy: {
    color: colors.faint,
    fontSize: typography.size.body,
    lineHeight: typography.lineHeight.body,
    marginTop: spacing.sm,
    maxWidth: 450,
    textAlign: 'center',
  },
  permissionIcon: {
    alignItems: 'center',
    backgroundColor: colors.cameraSoft,
    borderColor: 'rgba(189,210,198,0.24)',
    borderRadius: radii.xl,
    borderWidth: 1,
    height: 82,
    justifyContent: 'center',
    marginBottom: spacing.lg,
    width: 82,
  },
  permissionLens: {
    borderColor: colors.mint,
    borderRadius: radii.pill,
    borderWidth: 2,
    height: 28,
    width: 28,
  },
  permissionNote: {
    backgroundColor: colors.cameraSoft,
    borderRadius: radii.pill,
    marginTop: spacing.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  permissionNoteText: {
    color: colors.mint,
    fontSize: typography.size.caption,
    lineHeight: typography.lineHeight.caption,
    textAlign: 'center',
  },
  permissionTitle: {
    color: colors.white,
    fontSize: typography.size.heading,
    fontWeight: typography.weight.semibold,
    letterSpacing: -1,
    lineHeight: typography.lineHeight.heading,
    marginTop: spacing.sm,
    maxWidth: 480,
    textAlign: 'center',
  },
  previewActions: {
    bottom: spacing.lg,
    left: spacing.lg,
    position: 'absolute',
    right: spacing.lg,
  },
  previewCopy: {
    color: 'rgba(250,251,249,0.74)',
    fontSize: typography.size.body,
    lineHeight: typography.lineHeight.body,
    marginTop: spacing.sm,
    maxWidth: 480,
  },
  previewHeader: {
    left: spacing.lg,
    position: 'absolute',
    right: spacing.lg,
    top: spacing.xl,
  },
  previewScreen: {
    flex: 1,
  },
  previewShade: {
    ...StyleSheet.absoluteFill,
    backgroundColor: colors.overlay,
  },
  previewTitle: {
    color: colors.white,
    fontSize: typography.size.heading,
    fontWeight: typography.weight.semibold,
    letterSpacing: -1,
    lineHeight: typography.lineHeight.heading,
    marginTop: spacing.xs,
  },
  recordCenter: {
    backgroundColor: '#E3665D',
    borderRadius: radii.pill,
    height: 48,
    width: 48,
  },
  recordControl: {
    alignItems: 'center',
    borderColor: colors.white,
    borderRadius: radii.pill,
    borderWidth: 3,
    height: 70,
    justifyContent: 'center',
    marginTop: spacing.md,
    width: 70,
  },
  recordingBadge: {
    alignItems: 'center',
    backgroundColor: 'rgba(10,14,11,0.68)',
    borderRadius: radii.pill,
    flexDirection: 'row',
    minHeight: layout.minTouchTarget,
    paddingHorizontal: spacing.md,
  },
  recordingBadgeText: {
    color: colors.white,
    fontSize: typography.size.caption,
    fontWeight: typography.weight.bold,
    letterSpacing: 1.4,
  },
  recordingDot: {
    backgroundColor: '#E3665D',
    borderRadius: radii.pill,
    height: 8,
    marginRight: spacing.xs,
    width: 8,
  },
  screen: {
    backgroundColor: colors.camera,
  },
  roomInput: {
    backgroundColor: colors.canvas,
    borderColor: colors.lineStrong,
    borderRadius: radii.md,
    borderWidth: 1,
    color: colors.ink,
    fontSize: typography.size.body,
    marginBottom: spacing.md,
    minHeight: 56,
    paddingHorizontal: spacing.md,
  },
  roomSheet: {
    alignSelf: 'center',
    backgroundColor: colors.surface,
    borderTopLeftRadius: radii.xl,
    borderTopRightRadius: radii.xl,
    maxWidth: layout.maxContentWidth,
    paddingBottom: spacing.xl,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    width: '100%',
  },
  sheetCopy: {
    color: colors.muted,
    fontSize: typography.size.bodySmall,
    lineHeight: typography.lineHeight.bodySmall,
    marginTop: spacing.xs,
  },
  sheetError: {
    color: colors.danger,
    fontSize: typography.size.bodySmall,
    lineHeight: typography.lineHeight.bodySmall,
    marginTop: spacing.md,
    textAlign: 'center',
  },
  sheetEyebrow: {
    color: colors.sage,
    fontSize: typography.size.caption,
    fontWeight: typography.weight.bold,
    letterSpacing: 1.5,
    lineHeight: typography.lineHeight.caption,
    marginTop: spacing.md,
  },
  sheetHandle: {
    alignSelf: 'center',
    backgroundColor: colors.lineStrong,
    borderRadius: radii.pill,
    height: 4,
    width: 40,
  },
  sheetTitle: {
    color: colors.ink,
    fontSize: typography.size.heading,
    fontWeight: typography.weight.semibold,
    letterSpacing: -1,
    lineHeight: typography.lineHeight.heading,
    marginTop: spacing.xs,
  },
  stopControl: {
    borderColor: '#E3665D',
  },
  stopControlCenter: {
    backgroundColor: '#E3665D',
    borderRadius: radii.sm,
    height: 27,
    width: 27,
  },
  suggestion: {
    backgroundColor: colors.canvas,
    borderColor: colors.line,
    borderRadius: radii.pill,
    borderWidth: 1,
    marginBottom: spacing.xs,
    marginRight: spacing.xs,
    minHeight: 42,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  suggestionPressed: {
    opacity: 0.68,
  },
  suggestionSelected: {
    backgroundColor: colors.sageSoft,
    borderColor: colors.sage,
  },
  suggestionText: {
    color: colors.inkSoft,
    fontSize: typography.size.bodySmall,
    fontWeight: typography.weight.medium,
  },
  suggestionTextSelected: {
    color: colors.sageDark,
    fontWeight: typography.weight.semibold,
  },
  suggestions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: spacing.sm,
    marginTop: spacing.lg,
  },
  timerLimit: {
    color: colors.faint,
    fontSize: typography.size.bodySmall,
  },
  timerPill: {
    alignItems: 'baseline',
    backgroundColor: 'rgba(10,14,11,0.68)',
    borderRadius: radii.pill,
    flexDirection: 'row',
    minHeight: layout.minTouchTarget,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  timerText: {
    color: colors.white,
    fontSize: typography.size.body,
    fontVariant: ['tabular-nums'],
    fontWeight: typography.weight.semibold,
  },
  videoPreview: {
    ...StyleSheet.absoluteFill,
  },
});
