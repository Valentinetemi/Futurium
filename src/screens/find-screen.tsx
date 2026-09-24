import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import {
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  View,
} from 'react-native';

import { Text } from '@/components/app-text';
import { BackButton } from '@/components/back-button';
import { ScreenContainer } from '@/components/screen-container';
import { colors, layout, spacing, typography } from '@/constants/theme';

const STEPS = [
  'Record a room.',
  'Prepare the memory.',
  'Ask for an object, and see where it was last seen.',
] as const;

export function FindScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isCompact = width < layout.compactBreakpoint;

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
      >
        <View style={styles.contentWidth}>
          <BackButton
            accessibilityLabel="Return home"
            onPress={() => router.back()}
          />

          <Text accessibilityRole="header" heading style={styles.title}>
            Find something
          </Text>
          <Text style={styles.subtitle}>
            Search is not available yet. This is how it will look.
          </Text>

          <View
            accessibilityLabel="Example, not a real result. Where are my reading glasses? Last seen in the living room, on the side table."
            accessible
            style={styles.example}
          >
            <Text style={styles.exampleLabel}>Example</Text>
            <Text style={styles.exampleQuestion}>
              Where are my reading glasses?
            </Text>
            <Text style={styles.exampleAnswer}>
              Last seen in the living room, on the side table.
            </Text>
          </View>

          <Text accessibilityRole="header" style={styles.stepsTitle}>
            How it will work
          </Text>
          {STEPS.map((step, index) => (
            <View key={step} style={styles.step}>
              <Text style={styles.stepNumber}>{index + 1}</Text>
              <Text style={styles.stepText}>{step}</Text>
            </View>
          ))}
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
  example: {
    borderLeftColor: colors.primary,
    borderLeftWidth: 2,
    marginBottom: spacing.xl,
    marginTop: spacing.lg,
    paddingLeft: spacing.md,
    paddingVertical: spacing.xxs,
  },
  exampleAnswer: {
    color: colors.text,
    fontSize: typography.size.body,
    lineHeight: typography.lineHeight.body,
    marginTop: spacing.xxs,
  },
  exampleLabel: {
    color: colors.textSecondary,
    fontSize: typography.size.caption,
    lineHeight: typography.lineHeight.caption,
  },
  exampleQuestion: {
    color: colors.primary,
    fontSize: typography.size.lead,
    fontWeight: typography.weight.semibold,
    lineHeight: typography.lineHeight.lead,
    marginTop: spacing.xxs,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: spacing.xl,
    paddingTop: spacing.xxs,
  },
  step: {
    flexDirection: 'row',
    marginTop: spacing.xs,
  },
  stepNumber: {
    color: colors.textSecondary,
    fontSize: typography.size.small,
    fontVariant: ['tabular-nums'],
    lineHeight: typography.lineHeight.small,
    width: 24,
  },
  stepText: {
    color: colors.textSecondary,
    flex: 1,
    fontSize: typography.size.small,
    lineHeight: typography.lineHeight.small,
  },
  stepsTitle: {
    color: colors.text,
    fontSize: typography.size.small,
    fontWeight: typography.weight.semibold,
    lineHeight: typography.lineHeight.small,
  },
  subtitle: {
    color: colors.textSecondary,
    fontSize: typography.size.body,
    lineHeight: typography.lineHeight.body,
    marginTop: spacing.xs,
  },
  title: {
    color: colors.text,
    fontSize: typography.size.heading,
    fontWeight: typography.weight.semibold,
    lineHeight: typography.lineHeight.heading,
    marginTop: spacing.xs,
  },
});
