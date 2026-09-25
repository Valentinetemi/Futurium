import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  View,
} from 'react-native';

import { Text } from '@/components/app-text';
import { BackButton } from '@/components/back-button';
import { PrimaryButton } from '@/components/primary-button';
import { ScreenContainer } from '@/components/screen-container';
import { colors, layout, radii, spacing, typography } from '@/constants/theme';
import { revenueCatMode, type RevenueCatMode } from '@/lib/revenuecat';

type PlanProps = {
  benefits: string[];
  highlighted?: boolean;
  name: string;
  note: string;
};

const modeCopy: Record<
  RevenueCatMode,
  { detail: string; title: string; tone: 'attention' | 'ready' }
> = {
  error: {
    detail:
      'RevenueCat could not start. Check the public SDK key, then restart Metro.',
    title: 'Plus preview is not set up',
    tone: 'attention',
  },
  'invalid-preview-key': {
    detail:
      'Expo Go needs a RevenueCat Test Store key that starts with test_ or rcb_.',
    title: 'Plus preview is not set up',
    tone: 'attention',
  },
  native: {
    detail:
      'The purchase SDK is running. Store products still need to be set up before anything can be bought.',
    title: 'Development build',
    tone: 'ready',
  },
  preview: {
    detail:
      'You are using Expo Go, so this is a preview. No purchase can be made and nothing will be charged.',
    title: 'Preview only',
    tone: 'ready',
  },
  unconfigured: {
    detail:
      'Add a RevenueCat Test Store key to .env, then restart Metro to try the preview.',
    title: 'Plus preview is not set up',
    tone: 'attention',
  },
};

function Plan({ benefits, highlighted = false, name, note }: PlanProps) {
  return (
    <View
      accessibilityLabel={`${name}. ${note}. ${benefits.join('. ')}.`}
      accessible
      style={[styles.plan, highlighted && styles.planHighlighted]}
    >
      <View style={styles.planHeader}>
        <Text style={styles.planName}>{name}</Text>
        <Text style={styles.planNote}>{note}</Text>
      </View>
      {benefits.map((benefit) => (
        <View key={benefit} style={styles.benefitRow}>
          <Text style={styles.benefitMark}>✓</Text>
          <Text style={styles.benefitText}>{benefit}</Text>
        </View>
      ))}
    </View>
  );
}

export function PlusScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isCompact = width < layout.compactBreakpoint;
  const [previewMessage, setPreviewMessage] = useState<string | null>(null);
  const currentModeCopy = modeCopy[revenueCatMode];

  function previewPlus() {
    if (revenueCatMode === 'preview') {
      setPreviewMessage(
        'Preview finished. No purchase was made and nothing was charged.',
      );
      return;
    }

    setPreviewMessage(
      'This shows how Plus will look. Set up Preview API Mode to try it in Expo Go.',
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
            accessibilityLabel="Return home"
            onPress={() => router.back()}
          />

          <View style={styles.header}>
            <Text accessibilityRole="header" heading style={styles.title}>
              Futurium Plus
            </Text>
            <Text style={styles.subtitle}>
              Room for every space you want to remember.
            </Text>
          </View>

          <Plan
            benefits={['One saved room', 'Seven days of memories']}
            name="Free"
            note="What you have now"
          />
          <Plan
            benefits={['Every room you want to save', 'Memories kept longer']}
            highlighted
            name="Plus"
            note="Coming later"
          />

          <View
            accessibilityLiveRegion="polite"
            style={[
              styles.notice,
              currentModeCopy.tone === 'attention' && styles.noticeAttention,
            ]}
          >
            <Text style={styles.noticeTitle}>{currentModeCopy.title}</Text>
            <Text style={styles.noticeBody}>{currentModeCopy.detail}</Text>
          </View>

          <PrimaryButton
            accessibilityHint="Shows the Plus preview. No purchase is made."
            label="Try the Plus preview"
            onPress={previewPlus}
          />

          {previewMessage ? (
            <Text accessibilityLiveRegion="polite" style={styles.previewNote}>
              {previewMessage}
            </Text>
          ) : null}

          <Text style={styles.disclaimer}>
            Real subscriptions need App Store or Google Play products and a
            development or store build of the app.
          </Text>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  benefitMark: {
    color: colors.primary,
    fontSize: typography.size.body,
    fontWeight: typography.weight.bold,
    lineHeight: typography.lineHeight.body,
    width: 24,
  },
  benefitRow: {
    flexDirection: 'row',
    marginTop: spacing.xs,
  },
  benefitText: {
    color: colors.text,
    flex: 1,
    fontSize: typography.size.body,
    lineHeight: typography.lineHeight.body,
  },
  contentWidth: {
    alignSelf: 'center',
    maxWidth: layout.maxContentWidth,
    width: '100%',
  },
  disclaimer: {
    color: colors.textSecondary,
    fontSize: typography.size.caption,
    lineHeight: typography.lineHeight.caption,
    marginTop: spacing.lg,
  },
  header: {
    marginBottom: spacing.lg,
    marginTop: spacing.xs,
  },
  notice: {
    borderLeftColor: colors.secondaryBlue,
    borderLeftWidth: 2,
    marginBottom: spacing.lg,
    marginTop: spacing.lg,
    paddingLeft: spacing.md,
    paddingVertical: spacing.xxs,
  },
  noticeAttention: {
    borderLeftColor: colors.accent,
  },
  noticeBody: {
    color: colors.textSecondary,
    fontSize: typography.size.small,
    lineHeight: typography.lineHeight.small,
    marginTop: spacing.xxs,
  },
  noticeTitle: {
    color: colors.text,
    fontSize: typography.size.body,
    fontWeight: typography.weight.semibold,
    lineHeight: typography.lineHeight.body,
  },
  plan: {
    borderTopColor: colors.border,
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingBottom: spacing.md,
    paddingTop: spacing.md,
  },
  planHeader: {
    alignItems: 'baseline',
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  planHighlighted: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radii.md,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: spacing.md,
  },
  planName: {
    color: colors.text,
    fontSize: typography.size.lead,
    fontWeight: typography.weight.semibold,
    lineHeight: typography.lineHeight.lead,
    marginRight: spacing.sm,
  },
  planNote: {
    color: colors.textSecondary,
    fontSize: typography.size.small,
  },
  previewNote: {
    color: colors.primary,
    fontSize: typography.size.body,
    fontWeight: typography.weight.medium,
    lineHeight: typography.lineHeight.body,
    marginTop: spacing.md,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: spacing.xl,
    paddingTop: spacing.xxs,
  },
  subtitle: {
    color: colors.textSecondary,
    fontSize: typography.size.body,
    lineHeight: typography.lineHeight.body,
    marginTop: spacing.xs,
    maxWidth: 520,
  },
  title: {
    color: colors.text,
    fontSize: typography.size.heading,
    fontWeight: typography.weight.semibold,
    lineHeight: typography.lineHeight.heading,
  },
});
