import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View } from 'react-native';

import { BackButton } from '@/components/back-button';
import { ScreenContainer } from '@/components/screen-container';
import { colors, layout, spacing, typography } from '@/constants/theme';

export function CaptureScreen() {
  const router = useRouter();

  return (
    <ScreenContainer dark style={styles.screen}>
      <StatusBar style="light" />
      <View style={styles.content}>
        <BackButton
          accessibilityLabel="Return home"
          dark
          onPress={() => router.back()}
        />
        <View style={styles.placeholder}>
          <Text style={styles.eyebrow}>ROOM SWEEP</Text>
          <Text style={styles.title}>Camera setup ready</Text>
          <Text style={styles.copy}>
            The recording interface is being connected next.
          </Text>
        </View>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: {
    flex: 1,
    paddingHorizontal: layout.horizontalPadding,
    paddingTop: spacing.xs,
  },
  copy: {
    color: colors.faint,
    fontSize: typography.size.body,
    lineHeight: typography.lineHeight.body,
    marginTop: spacing.sm,
    textAlign: 'center',
  },
  eyebrow: {
    color: colors.mint,
    fontSize: typography.size.caption,
    fontWeight: typography.weight.bold,
    letterSpacing: 1.5,
  },
  placeholder: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
  },
  screen: {
    backgroundColor: colors.camera,
  },
  title: {
    color: colors.white,
    fontSize: typography.size.heading,
    fontWeight: typography.weight.semibold,
    marginTop: spacing.sm,
  },
});
