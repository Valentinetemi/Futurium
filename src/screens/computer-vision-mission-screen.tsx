import { useRouter } from 'expo-router';
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
import { SpaceBackground } from '@/components/space-background';
import {
  colors,
  layout,
  radii,
  shadows,
  spacing,
  typography,
} from '@/constants/theme';
import { computerVisionMission } from '@/data/missions';

export function ComputerVisionMissionScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const [isLabPending, setIsLabPending] = useState(false);
  const isCompact = width < layout.compactBreakpoint;

  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
      return;
    }

    router.replace('/frontier-map');
  };

  return (
    <ScreenContainer style={styles.screen}>
      <SpaceBackground />
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
            accessibilityLabel="Return to the Frontier Map"
            label="FRONTIER MAP"
            onPress={handleBack}
          />

          <View style={styles.missionHeader}>
            <View style={styles.labelRow}>
              <View style={styles.missionLabel}>
                <Text style={styles.missionLabelText}>
                  {computerVisionMission.label}
                </Text>
              </View>
              <View style={styles.briefingStatus}>
                <View style={styles.statusDot} />
                <Text style={styles.briefingStatusText}>BRIEFING READY</Text>
              </View>
            </View>

            <Text
              accessibilityRole="header"
              style={[styles.title, isCompact && styles.titleCompact]}
            >
              {computerVisionMission.title}
            </Text>
            <Text style={styles.missionType}>
              COMPUTER VISION FIELD MISSION
            </Text>
          </View>

          <View
            style={[
              styles.briefingPanel,
              isCompact && styles.briefingPanelCompact,
            ]}
          >
            <View
              accessibilityElementsHidden
              importantForAccessibility="no-hide-descendants"
              style={[
                styles.sensorVisual,
                isCompact && styles.sensorVisualCompact,
              ]}
            >
              <View style={styles.sensorFrame}>
                <View style={[styles.targetCorner, styles.targetTopLeft]} />
                <View style={[styles.targetCorner, styles.targetTopRight]} />
                <View style={[styles.targetCorner, styles.targetBottomLeft]} />
                <View style={[styles.targetCorner, styles.targetBottomRight]} />
                <View style={styles.crate}>
                  <View style={styles.crateLine} />
                  <Text style={styles.crateMark}>+</Text>
                </View>
                <View style={styles.scanLine} />
              </View>
              <Text style={styles.sensorCaption}>
                ROBOT OPTICAL FEED / SIGNAL DEGRADED
              </Text>
            </View>

            <View style={styles.scenarioContent}>
              <Text style={styles.sectionLabel}>SCENARIO</Text>
              <Text style={styles.scenario}>
                {computerVisionMission.scenario}
              </Text>
            </View>
          </View>

          <View style={[styles.infoRow, isCompact && styles.infoRowCompact]}>
            <View
              style={[styles.infoPanel, isCompact && styles.infoPanelCompact]}
            >
              <Text style={styles.sectionLabel}>ESTIMATED DURATION</Text>
              <View style={styles.durationRow}>
                <Text style={styles.durationValue}>
                  {String(computerVisionMission.durationMinutes).padStart(
                    2,
                    '0',
                  )}
                </Text>
                <Text style={styles.durationUnit}>MINUTES</Text>
              </View>
            </View>

            <View
              style={[styles.skillsPanel, isCompact && styles.infoPanelCompact]}
            >
              <Text style={styles.sectionLabel}>SKILLS PREVIEW</Text>
              <View style={styles.skillList}>
                {computerVisionMission.skills.map((skill, index) => (
                  <View key={skill} style={styles.skillChip}>
                    <Text style={styles.skillNumber}>
                      {String(index + 1).padStart(2, '0')}
                    </Text>
                    <Text style={styles.skillText}>{skill}</Text>
                  </View>
                ))}
              </View>
            </View>
          </View>

          <View style={styles.actionArea}>
            {isLabPending ? (
              <View
                accessibilityLiveRegion="polite"
                style={styles.pendingNotice}
              >
                <View style={styles.pendingIcon}>
                  <View style={styles.pendingIconCore} />
                </View>
                <View style={styles.pendingCopy}>
                  <Text style={styles.pendingTitle}>
                    MISSION LABORATORY COMING NEXT
                  </Text>
                  <Text style={styles.pendingText}>
                    Your briefing is saved. Interactive diagnostics will open in
                    the next build.
                  </Text>
                </View>
              </View>
            ) : null}

            <PrimaryButton
              accessibilityHint="Shows the current availability of the mission laboratory"
              disabled={isLabPending}
              label={isLabPending ? 'Laboratory Coming Next' : 'Begin Mission'}
              onPress={() => setIsLabPending(true)}
              showArrow={!isLabPending}
              style={styles.beginButton}
            />
            <Text style={styles.actionNote}>
              NO ACCOUNT OR PERSONAL INFORMATION REQUIRED
            </Text>
          </View>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  actionArea: {
    alignItems: 'center',
    marginTop: spacing.xl,
  },
  actionNote: {
    color: colors.textMuted,
    fontSize: 8,
    fontWeight: typography.weight.semibold,
    letterSpacing: 1.2,
    marginTop: spacing.md,
    textAlign: 'center',
  },
  beginButton: {
    maxWidth: 360,
  },
  briefingPanel: {
    ...shadows.panel,
    backgroundColor: colors.backgroundElevated,
    borderColor: colors.borderStrong,
    borderRadius: radii.lg,
    borderWidth: 1,
    flexDirection: 'row',
    overflow: 'hidden',
    padding: spacing.lg,
  },
  briefingPanelCompact: {
    borderRadius: radii.md,
    flexDirection: 'column',
    padding: spacing.md,
  },
  briefingStatus: {
    alignItems: 'center',
    flexDirection: 'row',
    marginLeft: spacing.sm,
  },
  briefingStatusText: {
    color: colors.cyanSoft,
    fontSize: 8,
    fontWeight: typography.weight.bold,
    letterSpacing: 1.1,
  },
  contentWidth: {
    alignSelf: 'center',
    maxWidth: 760,
    width: '100%',
  },
  crate: {
    alignItems: 'center',
    backgroundColor: colors.violetGlow,
    borderColor: colors.violetSoft,
    borderRadius: radii.sm,
    borderWidth: 1,
    height: 62,
    justifyContent: 'center',
    width: 76,
  },
  crateLine: {
    backgroundColor: colors.violetSoft,
    height: StyleSheet.hairlineWidth,
    left: 0,
    opacity: 0.5,
    position: 'absolute',
    right: 0,
    top: 19,
  },
  crateMark: {
    color: colors.violetSoft,
    fontSize: 25,
    fontWeight: typography.weight.medium,
  },
  durationRow: {
    alignItems: 'baseline',
    flexDirection: 'row',
    marginTop: spacing.lg,
  },
  durationUnit: {
    color: colors.textSecondary,
    fontSize: 9,
    fontWeight: typography.weight.bold,
    letterSpacing: 1.3,
    marginLeft: spacing.xs,
  },
  durationValue: {
    color: colors.cyan,
    fontSize: 36,
    fontWeight: typography.weight.black,
    letterSpacing: -1.5,
    lineHeight: 40,
  },
  infoPanel: {
    backgroundColor: colors.backgroundDeep,
    borderColor: colors.border,
    borderRadius: radii.md,
    borderWidth: 1,
    marginRight: spacing.md,
    minWidth: 190,
    padding: spacing.lg,
  },
  infoPanelCompact: {
    marginBottom: spacing.md,
    marginRight: 0,
    width: '100%',
  },
  infoRow: {
    flexDirection: 'row',
    marginTop: spacing.md,
  },
  infoRowCompact: {
    flexDirection: 'column',
  },
  labelRow: {
    alignItems: 'center',
    flexDirection: 'row',
  },
  missionHeader: {
    marginBottom: spacing.xl,
    marginTop: spacing.lg,
  },
  missionLabel: {
    backgroundColor: colors.cyan,
    borderRadius: radii.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  missionLabelText: {
    color: colors.backgroundDeep,
    fontSize: 10,
    fontWeight: typography.weight.black,
    letterSpacing: 1.3,
  },
  missionType: {
    color: colors.textMuted,
    fontSize: 9,
    fontWeight: typography.weight.bold,
    letterSpacing: 1.7,
    marginTop: spacing.sm,
  },
  pendingCopy: {
    flex: 1,
  },
  pendingIcon: {
    alignItems: 'center',
    borderColor: colors.violet,
    borderRadius: radii.pill,
    borderWidth: 1,
    height: 38,
    justifyContent: 'center',
    marginRight: spacing.sm,
    width: 38,
  },
  pendingIconCore: {
    backgroundColor: colors.violetSoft,
    borderRadius: radii.pill,
    height: 8,
    shadowColor: colors.violet,
    shadowOpacity: 0.8,
    shadowRadius: 6,
    width: 8,
  },
  pendingNotice: {
    alignItems: 'center',
    backgroundColor: colors.violetGlow,
    borderColor: colors.violet,
    borderRadius: radii.md,
    borderWidth: 1,
    flexDirection: 'row',
    marginBottom: spacing.md,
    maxWidth: 560,
    padding: spacing.md,
    width: '100%',
  },
  pendingText: {
    color: colors.textSecondary,
    fontSize: 13,
    lineHeight: 19,
    marginTop: spacing.xxs,
  },
  pendingTitle: {
    color: colors.violetSoft,
    fontSize: 10,
    fontWeight: typography.weight.bold,
    letterSpacing: 1.1,
  },
  scanLine: {
    backgroundColor: colors.cyan,
    height: 1,
    left: spacing.sm,
    opacity: 0.42,
    position: 'absolute',
    right: spacing.sm,
    top: '42%',
  },
  scenario: {
    color: colors.textPrimary,
    fontSize: typography.size.body,
    lineHeight: 26,
    marginTop: spacing.sm,
  },
  scenarioContent: {
    flex: 1,
    justifyContent: 'center',
  },
  screen: {
    overflow: 'hidden',
  },
  scrollContent: {
    paddingBottom: spacing.xxl,
    paddingTop: spacing.xs,
  },
  sectionLabel: {
    color: colors.cyanSoft,
    fontSize: 9,
    fontWeight: typography.weight.bold,
    letterSpacing: 1.5,
  },
  sensorCaption: {
    color: colors.textMuted,
    fontSize: 7,
    fontWeight: typography.weight.medium,
    letterSpacing: 0.9,
    marginTop: spacing.xs,
    textAlign: 'center',
  },
  sensorFrame: {
    alignItems: 'center',
    backgroundColor: colors.backgroundDeep,
    borderColor: colors.border,
    borderRadius: radii.md,
    borderWidth: 1,
    height: 150,
    justifyContent: 'center',
    overflow: 'hidden',
    width: '100%',
  },
  sensorVisual: {
    marginRight: spacing.lg,
    width: 230,
  },
  sensorVisualCompact: {
    marginBottom: spacing.lg,
    marginRight: 0,
    width: '100%',
  },
  skillChip: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radii.sm,
    borderWidth: 1,
    flexDirection: 'row',
    marginBottom: spacing.xs,
    marginRight: spacing.xs,
    minHeight: 38,
    paddingHorizontal: spacing.sm,
  },
  skillList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: spacing.md,
  },
  skillNumber: {
    color: colors.cyan,
    fontSize: 8,
    fontWeight: typography.weight.bold,
    marginRight: spacing.xs,
  },
  skillText: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: typography.weight.semibold,
  },
  skillsPanel: {
    backgroundColor: colors.backgroundDeep,
    borderColor: colors.border,
    borderRadius: radii.md,
    borderWidth: 1,
    flex: 1,
    padding: spacing.lg,
  },
  statusDot: {
    backgroundColor: colors.cyan,
    borderRadius: radii.pill,
    height: 5,
    marginRight: spacing.xs,
    shadowColor: colors.cyan,
    shadowOpacity: 0.8,
    shadowRadius: 5,
    width: 5,
  },
  targetBottomLeft: {
    borderBottomWidth: 1,
    borderLeftWidth: 1,
    bottom: spacing.sm,
    left: spacing.sm,
  },
  targetBottomRight: {
    borderBottomWidth: 1,
    borderRightWidth: 1,
    bottom: spacing.sm,
    right: spacing.sm,
  },
  targetCorner: {
    borderColor: colors.cyan,
    height: 16,
    position: 'absolute',
    width: 16,
  },
  targetTopLeft: {
    borderLeftWidth: 1,
    borderTopWidth: 1,
    left: spacing.sm,
    top: spacing.sm,
  },
  targetTopRight: {
    borderRightWidth: 1,
    borderTopWidth: 1,
    right: spacing.sm,
    top: spacing.sm,
  },
  title: {
    color: colors.textPrimary,
    fontSize: 46,
    fontWeight: typography.weight.black,
    letterSpacing: -2,
    lineHeight: 52,
    marginTop: spacing.md,
    maxWidth: 680,
  },
  titleCompact: {
    fontSize: 36,
    letterSpacing: -1.5,
    lineHeight: 42,
  },
});
