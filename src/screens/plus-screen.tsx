import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View } from 'react-native';

import { BackButton } from '@/components/back-button';
import { ScreenContainer } from '@/components/screen-container';
import { colors, layout, spacing, typography } from '@/constants/theme';

export function PlusScreen() {
  const router = useRouter();

  return (
    <ScreenContainer>
      <StatusBar style="dark" />
      <View style={styles.content}>
        <BackButton
          accessibilityLabel="Return home"
          onPress={() => router.back()}
        />
        <View style={styles.placeholder}>
          <Text style={styles.eyebrow}>FUTURIUM PLUS</Text>
          <Text style={styles.title}>More memory, when you need it.</Text>
          <Text style={styles.copy}>
            Plan details and the RevenueCat preview are being prepared.
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
    color: colors.muted,
    fontSize: typography.size.body,
    lineHeight: typography.lineHeight.body,
    marginTop: spacing.sm,
    maxWidth: 420,
    textAlign: 'center',
  },
  eyebrow: {
    color: colors.sage,
    fontSize: typography.size.caption,
    fontWeight: typography.weight.bold,
    letterSpacing: 1.5,
  },
  placeholder: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
  },
  title: {
    color: colors.ink,
    fontSize: typography.size.heading,
    fontWeight: typography.weight.semibold,
    lineHeight: typography.lineHeight.heading,
    marginTop: spacing.sm,
    textAlign: 'center',
  },
});
