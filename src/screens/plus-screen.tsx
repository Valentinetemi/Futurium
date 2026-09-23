import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';

import { BackButton } from '@/components/back-button';
import { PrimaryButton } from '@/components/primary-button';
import { ScreenContainer } from '@/components/screen-container';
import {
  colors,
  layout,
  radii,
  shadows,
  spacing,
  typography,
} from '@/constants/theme';
import { revenueCatMode, type RevenueCatMode } from '@/lib/revenuecat';

type PlanCardProps = {
  benefits: string[];
  featured?: boolean;
  label: string;
  name: string;
};

const modeCopy: Record<
  RevenueCatMode,
  { detail: string; label: string; tone: 'attention' | 'ready' }
> = {
  error: {
    detail:
      'RevenueCat could not initialize. Check the public SDK key and restart Metro.',
    label: 'SETUP ERROR',
    tone: 'attention',
  },
  'invalid-preview-key': {
    detail:
      'Expo Go needs a RevenueCat Test Store key beginning with test_ or rcb_.',
    label: 'PREVIEW KEY NEEDED',
    tone: 'attention',
  },
  native: {
    detail:
      'Running with the native SDK. Store products still need dashboard configuration.',
    label: 'DEVELOPMENT BUILD',
    tone: 'ready',
  },
  preview: {
    detail:
      'RevenueCat Preview API Mode is active. Expo Go will not make a real store purchase.',
    label: 'EXPO GO · PREVIEW MODE',
    tone: 'ready',
  },
  unconfigured: {
    detail:
      'Add the public RevenueCat Test Store key to .env, then restart Metro.',
    label: 'KEY NOT CONFIGURED',
    tone: 'attention',
  },
};

function PlanCard({ benefits, featured = false, label, name }: PlanCardProps) {
  return (
    <View
      accessibilityLabel={`${name} plan. ${benefits.join('. ')}`}
      style={[styles.planCard, featured && styles.planCardFeatured]}
    >
      <View style={styles.planHeader}>
        <View>
          <Text
            style={[styles.planLabel, featured && styles.planLabelFeatured]}
          >
            {label}
          </Text>
          <Text style={[styles.planName, featured && styles.planNameFeatured]}>
            {name}
          </Text>
        </View>
        {featured ? (
          <View style={styles.recommendedBadge}>
            <Text style={styles.recommendedText}>MORE MEMORY</Text>
          </View>
        ) : null}
      </View>

      <View style={styles.benefitList}>
        {benefits.map((benefit) => (
          <View key={benefit} style={styles.benefitRow}>
            <View style={[styles.check, featured && styles.checkFeatured]}>
              <Text
                style={[styles.checkText, featured && styles.checkTextFeatured]}
              >
                ✓
              </Text>
            </View>
            <Text
              style={[
                styles.benefitText,
                featured && styles.benefitTextFeatured,
              ]}
            >
              {benefit}
            </Text>
          </View>
        ))}
      </View>
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
        'Preview complete. No real purchase or charge was made in Expo Go.',
      );
      return;
    }

    setPreviewMessage(
      'The Plus interface is ready. Configure Preview API Mode to simulate RevenueCat behavior in Expo Go.',
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
            <Text style={styles.eyebrow}>FUTURIUM PLUS</Text>
            <Text accessibilityRole="header" style={styles.title}>
              Keep more of what matters.
            </Text>
            <Text style={styles.subtitle}>
              Start with one space, then expand your visual memory when you need
              it.
            </Text>
          </View>

          <PlanCard
            benefits={['One saved space', 'Seven days of history']}
            label="INCLUDED"
            name="Free"
          />
          <PlanCard
            benefits={['Unlimited saved spaces', 'Extended history']}
            featured
            label="UPGRADE"
            name="Plus"
          />

          <View
            accessibilityLiveRegion="polite"
            style={[
              styles.modeCard,
              currentModeCopy.tone === 'ready' && styles.modeCardReady,
            ]}
          >
            <View
              style={[
                styles.modeDot,
                currentModeCopy.tone === 'ready' && styles.modeDotReady,
              ]}
            />
            <View style={styles.modeCopy}>
              <Text style={styles.modeLabel}>{currentModeCopy.label}</Text>
              <Text style={styles.modeDetail}>{currentModeCopy.detail}</Text>
            </View>
          </View>

          <PrimaryButton
            accessibilityHint="Demonstrate the Plus selection without making a real purchase"
            label="Preview Plus"
            onPress={previewPlus}
          />

          {previewMessage ? (
            <Text accessibilityLiveRegion="polite" style={styles.previewNote}>
              {previewMessage}
            </Text>
          ) : null}

          <Text style={styles.disclaimer}>
            Preview only. Real subscriptions require configured App Store or
            Play Store products and a development or production build.
          </Text>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  benefitList: {
    marginTop: spacing.lg,
  },
  benefitRow: {
    alignItems: 'center',
    flexDirection: 'row',
    marginTop: spacing.sm,
  },
  benefitText: {
    color: colors.inkSoft,
    flex: 1,
    fontSize: typography.size.body,
    lineHeight: typography.lineHeight.body,
  },
  benefitTextFeatured: {
    color: colors.sageSoft,
  },
  check: {
    alignItems: 'center',
    backgroundColor: colors.sageSoft,
    borderRadius: radii.pill,
    height: 24,
    justifyContent: 'center',
    marginRight: spacing.sm,
    width: 24,
  },
  checkFeatured: {
    backgroundColor: 'rgba(255,255,255,0.14)',
  },
  checkText: {
    color: colors.sageDark,
    fontSize: 12,
    fontWeight: typography.weight.bold,
  },
  checkTextFeatured: {
    color: colors.white,
  },
  contentWidth: {
    alignSelf: 'center',
    maxWidth: layout.maxContentWidth,
    width: '100%',
  },
  disclaimer: {
    color: colors.muted,
    fontSize: typography.size.caption,
    lineHeight: typography.lineHeight.caption,
    marginTop: spacing.md,
    paddingHorizontal: spacing.sm,
    textAlign: 'center',
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
  modeCard: {
    alignItems: 'flex-start',
    backgroundColor: colors.sand,
    borderRadius: radii.md,
    flexDirection: 'row',
    marginBottom: spacing.md,
    marginTop: spacing.sm,
    padding: spacing.md,
  },
  modeCardReady: {
    backgroundColor: colors.sageSoft,
  },
  modeCopy: {
    flex: 1,
  },
  modeDetail: {
    color: colors.inkSoft,
    fontSize: typography.size.bodySmall,
    lineHeight: typography.lineHeight.bodySmall,
    marginTop: spacing.xxs,
  },
  modeDot: {
    backgroundColor: '#B17A45',
    borderRadius: radii.pill,
    height: 8,
    marginRight: spacing.sm,
    marginTop: 5,
    width: 8,
  },
  modeDotReady: {
    backgroundColor: colors.sage,
  },
  modeLabel: {
    color: colors.ink,
    fontSize: 10,
    fontWeight: typography.weight.bold,
    letterSpacing: 1.1,
    lineHeight: 15,
  },
  planCard: {
    ...shadows.card,
    backgroundColor: colors.surface,
    borderColor: colors.line,
    borderRadius: radii.lg,
    borderWidth: 1,
    marginBottom: spacing.md,
    padding: spacing.lg,
  },
  planCardFeatured: {
    backgroundColor: colors.sageDark,
    borderColor: colors.sageDark,
  },
  planHeader: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  planLabel: {
    color: colors.sage,
    fontSize: 10,
    fontWeight: typography.weight.bold,
    letterSpacing: 1.2,
  },
  planLabelFeatured: {
    color: colors.mint,
  },
  planName: {
    color: colors.ink,
    fontSize: 27,
    fontWeight: typography.weight.semibold,
    letterSpacing: -0.7,
    lineHeight: 34,
    marginTop: spacing.xxs,
  },
  planNameFeatured: {
    color: colors.white,
  },
  previewNote: {
    color: colors.sageDark,
    fontSize: typography.size.bodySmall,
    lineHeight: typography.lineHeight.bodySmall,
    marginTop: spacing.md,
    textAlign: 'center',
  },
  recommendedBadge: {
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: radii.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  recommendedText: {
    color: colors.mint,
    fontSize: 9,
    fontWeight: typography.weight.bold,
    letterSpacing: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: spacing.xl,
    paddingTop: spacing.xs,
  },
  subtitle: {
    color: colors.inkSoft,
    fontSize: typography.size.bodyLarge,
    lineHeight: typography.lineHeight.bodyLarge,
    marginTop: spacing.sm,
    maxWidth: 540,
  },
  title: {
    color: colors.ink,
    fontSize: typography.size.heading,
    fontWeight: typography.weight.semibold,
    letterSpacing: -1,
    lineHeight: typography.lineHeight.heading,
    marginTop: spacing.sm,
  },
});
