import { useRouter } from 'expo-router';
import { StyleSheet, Text, useWindowDimensions, View } from 'react-native';

import { BrandMark } from '@/components/brand-mark';
import { PrimaryButton } from '@/components/primary-button';
import { ScreenContainer } from '@/components/screen-container';
import { SpaceBackground } from '@/components/space-background';
import { launchCopy } from '@/constants/copy';
import { colors, layout, spacing, typography } from '@/constants/theme';

export function LaunchScreen() {
  const router = useRouter();
  const { height, width } = useWindowDimensions();
  const isCompact = width < layout.compactBreakpoint;
  const isShort = height < 700;

  return (
    <ScreenContainer style={styles.screen}>
      <SpaceBackground />

      <View
        style={[
          styles.frame,
          {
            paddingHorizontal: isCompact
              ? layout.horizontalPaddingCompact
              : layout.horizontalPadding,
          },
        ]}
      >
        <View style={styles.topBar}>
          <View style={styles.brandLockup}>
            <BrandMark />
            <Text style={styles.brandCode}>FTRM / 01</Text>
          </View>
          <View style={styles.modeChip}>
            <View style={styles.modeDot} />
            <Text style={styles.modeLabel}>DISCOVERY MODE</Text>
          </View>
        </View>

        <View style={[styles.content, isShort && styles.contentShort]}>
          <View style={styles.eyebrowRow}>
            <View style={styles.eyebrowLine} />
            <Text style={styles.eyebrow}>{launchCopy.eyebrow}</Text>
          </View>

          <Text
            adjustsFontSizeToFit
            minimumFontScale={0.86}
            numberOfLines={1}
            style={[styles.title, isCompact && styles.titleCompact]}
          >
            {launchCopy.title}
          </Text>
          <Text style={[styles.tagline, isCompact && styles.taglineCompact]}>
            {launchCopy.tagline}
          </Text>

          <View style={[styles.actionArea, isShort && styles.actionAreaShort]}>
            <PrimaryButton
              label={launchCopy.action}
              onPress={() => router.push('/frontier-map')}
            />
            <Text style={styles.actionNote}>
              SHORT SIMULATIONS · REAL CAREER PATHS
            </Text>
          </View>
        </View>

        <View style={styles.footer}>
          <View style={styles.systemStatus}>
            <View style={styles.statusDot} />
            <Text style={styles.footerText}>SIMULATION SYSTEMS READY</Text>
          </View>
          <Text style={styles.footerText}>IOS / ANDROID</Text>
        </View>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  actionArea: {
    marginTop: spacing.xl,
    maxWidth: 320,
    width: '100%',
  },
  actionAreaShort: {
    marginTop: spacing.lg,
  },
  actionNote: {
    color: colors.textMuted,
    fontSize: 9,
    fontWeight: typography.weight.semibold,
    letterSpacing: 1.5,
    marginTop: spacing.md,
    textAlign: 'center',
  },
  brandCode: {
    color: colors.textSecondary,
    fontSize: 10,
    fontWeight: typography.weight.bold,
    letterSpacing: 1.6,
    marginLeft: spacing.sm,
  },
  brandLockup: {
    alignItems: 'center',
    flexDirection: 'row',
  },
  content: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    paddingBottom: spacing.lg,
    paddingTop: spacing.lg,
    width: '100%',
  },
  contentShort: {
    paddingBottom: spacing.sm,
    paddingTop: spacing.sm,
  },
  eyebrow: {
    color: colors.cyanSoft,
    fontSize: typography.size.eyebrow,
    fontWeight: typography.weight.bold,
    letterSpacing: typography.tracking.eyebrow,
    lineHeight: typography.lineHeight.eyebrow,
  },
  eyebrowLine: {
    backgroundColor: colors.cyan,
    height: 1,
    marginRight: spacing.sm,
    opacity: 0.8,
    width: 24,
  },
  eyebrowRow: {
    alignItems: 'center',
    flexDirection: 'row',
    marginBottom: spacing.sm,
  },
  footer: {
    alignItems: 'center',
    borderTopColor: colors.border,
    borderTopWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    justifyContent: 'space-between',
    minHeight: 44,
    width: '100%',
  },
  footerText: {
    color: colors.textMuted,
    fontSize: 8,
    fontWeight: typography.weight.semibold,
    letterSpacing: 1.25,
  },
  frame: {
    alignSelf: 'center',
    flex: 1,
    maxWidth: 920,
    width: '100%',
  },
  modeChip: {
    alignItems: 'center',
    borderColor: colors.border,
    borderRadius: 999,
    borderWidth: 1,
    flexDirection: 'row',
    paddingHorizontal: spacing.sm,
    paddingVertical: 7,
  },
  modeDot: {
    backgroundColor: colors.cyan,
    borderRadius: 999,
    height: 5,
    marginRight: spacing.xs,
    width: 5,
  },
  modeLabel: {
    color: colors.textSecondary,
    fontSize: 8,
    fontWeight: typography.weight.bold,
    letterSpacing: 1.1,
  },
  screen: {
    overflow: 'hidden',
  },
  statusDot: {
    backgroundColor: colors.cyan,
    borderRadius: 999,
    height: 5,
    marginRight: spacing.xs,
    shadowColor: colors.cyan,
    shadowOpacity: 0.9,
    shadowRadius: 5,
    width: 5,
  },
  systemStatus: {
    alignItems: 'center',
    flexDirection: 'row',
  },
  tagline: {
    color: colors.textSecondary,
    fontSize: typography.size.bodyLarge,
    lineHeight: typography.lineHeight.bodyLarge,
    marginTop: spacing.md,
    maxWidth: 410,
    textAlign: 'center',
  },
  taglineCompact: {
    fontSize: 17,
    lineHeight: 25,
    maxWidth: 320,
  },
  title: {
    color: colors.textPrimary,
    fontSize: 68,
    fontWeight: typography.weight.black,
    letterSpacing: -3.2,
    lineHeight: 76,
    textAlign: 'center',
    textShadowColor: colors.whiteGlow,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 16,
  },
  titleCompact: {
    fontSize: 54,
    letterSpacing: -2.4,
    lineHeight: 62,
  },
  topBar: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    minHeight: 54,
    width: '100%',
  },
});
