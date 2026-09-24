import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import {
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';

import { BackButton } from '@/components/back-button';
import { ScreenContainer } from '@/components/screen-container';
import { colors, layout, radii, spacing, typography } from '@/constants/theme';

const STEPS = [
  {
    body: 'A short, slow video of the room.',
    title: 'Record a room',
  },
  {
    body: 'Futurium keeps the clearest moments from the video.',
    title: 'Prepare the memory',
  },
  {
    body: 'Type an object, like “glasses”. Futurium will show the moment and room where it was last seen.',
    title: 'Ask for something',
  },
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

          <View style={styles.header}>
            <Text accessibilityRole="header" style={styles.title}>
              Find something
            </Text>
            <Text style={styles.subtitle}>
              Searching isn’t available yet. When it is, you’ll be able to ask
              where something was last seen.
            </Text>
          </View>

          <View
            accessibilityLabel="Example only. Where are my reading glasses? Last seen in the living room, on the side table."
            accessible
            style={styles.example}
          >
            <Text style={styles.exampleLabel}>Example, not a real result</Text>
            <Text style={styles.exampleQuestion}>
              “Where are my reading glasses?”
            </Text>
            <Text style={styles.exampleAnswer}>
              Last seen in the <Text style={styles.strong}>Living room</Text>,
              on the side table.
            </Text>
          </View>

          <Text accessibilityRole="header" style={styles.sectionTitle}>
            How it will work
          </Text>
          {STEPS.map((step, index) => (
            <View key={step.title} style={styles.step}>
              <Text style={styles.stepNumber}>{index + 1}</Text>
              <View style={styles.stepCopy}>
                <Text style={styles.stepTitle}>{step.title}</Text>
                <Text style={styles.stepBody}>{step.body}</Text>
              </View>
            </View>
          ))}

          <Text style={styles.note}>
            For now, you can record rooms and prepare memories. Search will use
            those memories when it is added.
          </Text>
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
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderLeftColor: colors.memoryBlue,
    borderLeftWidth: 4,
    borderRadius: radii.sm,
    borderWidth: 1,
    marginBottom: spacing.xl,
    padding: spacing.lg,
  },
  exampleAnswer: {
    color: colors.text,
    fontSize: typography.size.body,
    lineHeight: typography.lineHeight.body,
    marginTop: spacing.sm,
  },
  exampleLabel: {
    color: colors.textSecondary,
    fontSize: typography.size.caption,
    lineHeight: typography.lineHeight.caption,
  },
  exampleQuestion: {
    color: colors.memoryBlue,
    fontSize: typography.size.bodyLarge,
    fontWeight: typography.weight.semibold,
    lineHeight: typography.lineHeight.bodyLarge,
    marginTop: spacing.xs,
  },
  header: {
    marginBottom: spacing.xl,
    marginTop: spacing.md,
  },
  note: {
    borderTopColor: colors.border,
    borderTopWidth: 1,
    color: colors.textSecondary,
    fontSize: typography.size.small,
    lineHeight: typography.lineHeight.small,
    marginTop: spacing.lg,
    paddingTop: spacing.lg,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: spacing.xxl,
    paddingTop: spacing.xs,
  },
  sectionTitle: {
    color: colors.text,
    fontSize: typography.size.title,
    fontWeight: typography.weight.semibold,
    lineHeight: typography.lineHeight.title,
    marginBottom: spacing.xs,
  },
  step: {
    flexDirection: 'row',
    paddingVertical: spacing.sm,
  },
  stepBody: {
    color: colors.textSecondary,
    fontSize: typography.size.body,
    lineHeight: typography.lineHeight.body,
    marginTop: 2,
  },
  stepCopy: {
    flex: 1,
  },
  stepNumber: {
    color: colors.primary,
    fontSize: typography.size.bodyLarge,
    fontVariant: ['tabular-nums'],
    fontWeight: typography.weight.bold,
    lineHeight: typography.lineHeight.bodyLarge,
    width: 32,
  },
  stepTitle: {
    color: colors.text,
    fontSize: typography.size.body,
    fontWeight: typography.weight.semibold,
    lineHeight: typography.lineHeight.body,
  },
  strong: {
    fontWeight: typography.weight.semibold,
  },
  subtitle: {
    color: colors.textSecondary,
    fontSize: typography.size.body,
    lineHeight: typography.lineHeight.body,
    marginTop: spacing.sm,
    maxWidth: 520,
  },
  title: {
    color: colors.text,
    fontSize: typography.size.heading,
    fontWeight: typography.weight.semibold,
    lineHeight: typography.lineHeight.heading,
  },
});
