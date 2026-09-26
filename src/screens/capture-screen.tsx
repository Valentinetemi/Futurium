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
  useWindowDimensions,
  View,
} from 'react-native';

import { Text, TextInput } from '@/components/app-text';
import { BackButton } from '@/components/back-button';
import { PrimaryButton } from '@/components/primary-button';
import { ScreenContainer } from '@/components/screen-container';
import { colors, layout, radii, spacing, typography } from '@/constants/theme';
import { saveSweepWithVideo } from '@/services/sweep-storage';
import { formatSweepDuration } from '@/utils/sweep-formatters';

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
      <View style={styles.previewHeader}>
        <Text accessibilityRole="header" heading style={styles.previewTitle}>
          Keep this recording?
        </Text>
        <Text style={styles.previewCopy}>
          Check that the room is clear before you save it.
        </Text>
      </View>

      <View style={styles.previewVideoArea}>
        <VideoView
          accessibilityLabel="Playback of the room you just recorded"
          contentFit="contain"
          nativeControls
          player={player}
          style={styles.videoPreview}
          surfaceType="textureView"
        />
      </View>

      <View style={styles.previewActions}>
        <PrimaryButton
          accessibilityHint="Name the room, then save it as a memory"
          disabled={isSaving}
          label="Save memory"
          onPress={onSave}
        />
        <PrimaryButton
          accessibilityHint="Deletes this recording and returns to the camera"
          disabled={isSaving}
          label="Discard and record again"
          onDark
          onPress={onDiscard}
          style={styles.previewSecondaryAction}
          variant="secondary"
        />
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
          accessibilityLabel="Close without saving"
          accessibilityRole="button"
          disabled={isSaving}
          onPress={onCancel}
          style={styles.modalBackdrop}
        />
        <View style={styles.roomSheet}>
          <View style={styles.sheetHandle} />
          <Text accessibilityRole="header" heading style={styles.sheetTitle}>
            Which room is this?
          </Text>
          <Text style={styles.sheetCopy}>
            Choose one, or type your own name.
          </Text>

          <View accessibilityLabel="Room names" style={styles.suggestions}>
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
            placeholder="Room name"
            placeholderTextColor={colors.textSecondary}
            returnKeyType="done"
            style={styles.roomInput}
            value={roomName}
          />

          <PrimaryButton
            accessibilityHint="Saves this recording as a memory on this phone"
            disabled={!trimmedRoomName || isSaving}
            label={isSaving ? 'Saving…' : 'Save memory'}
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
    setErrorMessage(
      'Please allow camera and microphone access to record a room.',
    );

    const cameraResult = await requestCameraPermission();
    const microphoneResult = await requestMicrophonePermission();

    if (!cameraResult.granted || !microphoneResult.granted) {
      setErrorMessage(
        'FoundIt needs both the camera and the microphone to record a room.',
      );
    } else {
      setErrorMessage(null);
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
        setErrorMessage('Nothing was recorded. Please try again.');
      }
    } catch {
      setErrorMessage('The recording did not work. Please try again.');
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
      setErrorMessage('This memory could not be saved. Please try again.');
    } finally {
      setIsSaving(false);
    }
  }

  const horizontalPadding = isCompact
    ? layout.horizontalPaddingCompact
    : layout.horizontalPadding;

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
          <View accessibilityLiveRegion="polite" style={styles.errorBanner}>
            <Text style={styles.errorBannerText}>{errorMessage}</Text>
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
          <ActivityIndicator color={colors.cameraText} size="large" />
          <Text style={styles.loadingText}>Starting the camera…</Text>
        </View>
      </ScreenContainer>
    );
  }

  if (!hasPermissions) {
    return (
      <ScreenContainer>
        <StatusBar style="dark" />
        <View
          style={[
            styles.permissionContent,
            { paddingHorizontal: horizontalPadding },
          ]}
        >
          <BackButton
            accessibilityLabel="Return home"
            onPress={() => router.back()}
          />

          <View style={styles.permissionBody}>
            <Text
              accessibilityRole="header"
              heading
              style={styles.permissionTitle}
            >
              FoundIt needs your camera and microphone
            </Text>
            <Text style={styles.permissionCopy}>
              They are used only while you record a room. Each recording is up
              to 30 seconds and stays on this phone.
            </Text>
          </View>

          <View style={styles.permissionActions}>
            <PrimaryButton
              accessibilityHint={
                canAskAgain
                  ? 'Asks for camera and microphone access'
                  : 'Opens settings so you can allow camera and microphone access'
              }
              label={canAskAgain ? 'Allow access' : 'Open settings'}
              onPress={
                canAskAgain ? requestPermissions : () => Linking.openSettings()
              }
            />
            {errorMessage ? (
              <Text
                accessibilityLiveRegion="polite"
                style={styles.permissionError}
              >
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
              'The camera could not start. Close the app and try again.',
            )
          }
          ref={cameraRef}
          style={StyleSheet.absoluteFill}
          videoQuality="720p"
        />

        <View
          style={[
            styles.cameraTopBar,
            { paddingHorizontal: horizontalPadding },
          ]}
        >
          {!isRecording ? (
            <BackButton
              accessibilityLabel="Return home without recording"
              dark
              label="Close"
              onPress={() => router.back()}
            />
          ) : (
            <View />
          )}

          <View
            accessibilityLabel={
              isRecording
                ? `Recording. ${elapsedSeconds} of 30 seconds.`
                : 'Not recording. Up to 30 seconds.'
            }
            accessible
            style={[styles.timerPlate, isRecording && styles.timerRecording]}
          >
            {isRecording ? <View style={styles.recordingDot} /> : null}
            <Text
              maxFontSizeMultiplier={typography.maxScale.control}
              style={styles.timerText}
            >
              {formatSweepDuration(elapsedSeconds)}
            </Text>
            <Text
              maxFontSizeMultiplier={typography.maxScale.control}
              style={styles.timerLimit}
            >
              {' '}
              / 0:30
            </Text>
          </View>
        </View>
      </View>

      <View
        style={[styles.controlBar, { paddingHorizontal: horizontalPadding }]}
      >
        {errorMessage ? (
          <Text accessibilityLiveRegion="polite" style={styles.cameraError}>
            {errorMessage}
          </Text>
        ) : (
          <Text accessibilityLiveRegion="polite" style={styles.cameraHint}>
            {isRecording
              ? `Recording · ${secondsRemaining} seconds left`
              : 'Move slowly around the room.'}
          </Text>
        )}

        <Pressable
          accessibilityHint={
            isRecording
              ? 'Stops recording so you can review it'
              : 'Records the room for up to 30 seconds'
          }
          accessibilityLabel={isRecording ? 'Stop recording' : 'Record'}
          accessibilityRole="button"
          accessibilityState={{ disabled: !isCameraReady }}
          disabled={!isCameraReady}
          onPress={isRecording ? stopRecording : beginRecording}
          style={({ pressed }) => [
            styles.recordControl,
            isRecording && styles.recordControlActive,
            !isCameraReady && styles.controlDisabled,
            pressed && styles.controlPressed,
          ]}
        >
          {isCameraReady ? (
            <View
              style={isRecording ? styles.stopSquare : styles.recordCircle}
            />
          ) : (
            <ActivityIndicator color={colors.cameraText} />
          )}
        </Pressable>

        <Text
          maxFontSizeMultiplier={typography.maxScale.control}
          style={styles.controlLabel}
        >
          {isCameraReady ? (isRecording ? 'Stop' : 'Record') : 'Getting ready'}
        </Text>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  cameraError: {
    color: colors.errorOnDark,
    fontSize: typography.size.body,
    lineHeight: typography.lineHeight.body,
    textAlign: 'center',
  },
  cameraFrame: {
    backgroundColor: colors.camera,
    flex: 1,
    overflow: 'hidden',
  },
  cameraHint: {
    color: colors.cameraText,
    fontSize: typography.size.body,
    lineHeight: typography.lineHeight.body,
    textAlign: 'center',
  },
  cameraTopBar: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    left: 0,
    position: 'absolute',
    right: 0,
    top: spacing.sm,
  },
  controlBar: {
    alignItems: 'center',
    backgroundColor: colors.camera,
    paddingBottom: spacing.md,
    paddingTop: spacing.md,
  },
  controlDisabled: {
    opacity: 0.5,
  },
  controlLabel: {
    color: colors.cameraText,
    fontSize: typography.size.body,
    fontWeight: typography.weight.semibold,
    marginTop: spacing.xs,
  },
  controlPressed: {
    opacity: 0.8,
  },
  errorBanner: {
    backgroundColor: colors.error,
    borderRadius: radii.md,
    left: spacing.lg,
    padding: spacing.md,
    position: 'absolute',
    right: spacing.lg,
    top: spacing.lg,
  },
  errorBannerText: {
    color: colors.onPrimary,
    fontSize: typography.size.body,
    lineHeight: typography.lineHeight.body,
    textAlign: 'center',
  },
  loadingState: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
  },
  loadingText: {
    color: colors.cameraText,
    fontSize: typography.size.body,
    marginTop: spacing.md,
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: colors.backdrop,
  },
  modalRoot: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  permissionActions: {
    paddingBottom: spacing.lg,
  },
  permissionBody: {
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
    color: colors.textSecondary,
    fontSize: typography.size.body,
    lineHeight: typography.lineHeight.body,
    marginTop: spacing.md,
    maxWidth: 480,
  },
  permissionError: {
    color: colors.error,
    fontSize: typography.size.body,
    lineHeight: typography.lineHeight.body,
    marginTop: spacing.md,
  },
  permissionTitle: {
    color: colors.text,
    fontSize: typography.size.title,
    fontWeight: typography.weight.semibold,
    lineHeight: typography.lineHeight.title,
    maxWidth: 480,
  },
  previewActions: {
    paddingBottom: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
  },
  previewCopy: {
    color: colors.cameraTextSecondary,
    fontSize: typography.size.body,
    lineHeight: typography.lineHeight.body,
    marginTop: spacing.xxs,
  },
  previewHeader: {
    paddingBottom: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
  },
  previewScreen: {
    flex: 1,
  },
  previewSecondaryAction: {
    marginTop: spacing.sm,
  },
  previewTitle: {
    color: colors.cameraText,
    fontSize: typography.size.title,
    fontWeight: typography.weight.semibold,
    lineHeight: typography.lineHeight.title,
  },
  previewVideoArea: {
    backgroundColor: colors.camera,
    flex: 1,
  },
  recordCircle: {
    backgroundColor: colors.error,
    borderRadius: radii.pill,
    height: 54,
    width: 54,
  },
  recordControl: {
    alignItems: 'center',
    borderColor: colors.cameraText,
    borderRadius: radii.pill,
    borderWidth: 4,
    height: 76,
    justifyContent: 'center',
    marginTop: spacing.sm,
    width: 76,
  },
  recordControlActive: {
    borderColor: colors.error,
  },
  recordingDot: {
    backgroundColor: colors.error,
    borderRadius: radii.pill,
    height: 12,
    marginRight: spacing.xs,
    width: 12,
  },
  roomInput: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radii.md,
    borderWidth: 1.5,
    color: colors.text,
    fontSize: typography.size.body,
    marginBottom: spacing.md,
    minHeight: layout.buttonHeight,
    paddingHorizontal: spacing.md,
  },
  roomSheet: {
    alignSelf: 'center',
    backgroundColor: colors.background,
    borderTopLeftRadius: radii.lg,
    borderTopRightRadius: radii.lg,
    maxWidth: layout.maxContentWidth,
    paddingBottom: spacing.xl,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    width: '100%',
  },
  screen: {
    backgroundColor: colors.camera,
  },
  sheetCopy: {
    color: colors.textSecondary,
    fontSize: typography.size.body,
    lineHeight: typography.lineHeight.body,
    marginTop: spacing.xxs,
  },
  sheetError: {
    color: colors.error,
    fontSize: typography.size.body,
    lineHeight: typography.lineHeight.body,
    marginTop: spacing.md,
  },
  sheetHandle: {
    alignSelf: 'center',
    backgroundColor: colors.border,
    borderRadius: radii.pill,
    height: 4,
    marginBottom: spacing.lg,
    width: 40,
  },
  sheetTitle: {
    color: colors.text,
    fontSize: typography.size.title,
    fontWeight: typography.weight.semibold,
    lineHeight: typography.lineHeight.title,
  },
  stopSquare: {
    backgroundColor: colors.error,
    borderRadius: radii.sm,
    height: 30,
    width: 30,
  },
  suggestion: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radii.md,
    borderWidth: 1.5,
    justifyContent: 'center',
    marginBottom: spacing.xs,
    marginRight: spacing.xs,
    minHeight: layout.minTouchTarget,
    paddingHorizontal: spacing.md,
  },
  suggestionPressed: {
    opacity: 0.7,
  },
  suggestionSelected: {
    backgroundColor: colors.softBlue,
    borderColor: colors.primary,
  },
  suggestionText: {
    color: colors.text,
    fontSize: typography.size.body,
  },
  suggestionTextSelected: {
    color: colors.primary,
    fontWeight: typography.weight.semibold,
  },
  suggestions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: spacing.sm,
    marginTop: spacing.lg,
  },
  timerLimit: {
    color: colors.cameraTextSecondary,
    fontSize: typography.size.body,
    fontVariant: ['tabular-nums'],
  },
  timerPlate: {
    alignItems: 'center',
    backgroundColor: colors.cameraPlate,
    borderRadius: radii.md,
    flexDirection: 'row',
    minHeight: layout.minTouchTarget,
    paddingHorizontal: spacing.md,
  },
  timerRecording: {
    borderColor: colors.error,
    borderWidth: 2,
  },
  timerText: {
    color: colors.cameraText,
    fontSize: typography.size.title,
    fontVariant: ['tabular-nums'],
    fontWeight: typography.weight.semibold,
  },
  videoPreview: {
    ...StyleSheet.absoluteFill,
  },
});
