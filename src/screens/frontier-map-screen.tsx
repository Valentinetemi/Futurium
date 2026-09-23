import { useRouter } from 'expo-router';
import {
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';

import { BackButton } from '@/components/back-button';
import { FrontierStationCard } from '@/components/frontier-station-card';
import { ScreenContainer } from '@/components/screen-container';
import { SpaceBackground } from '@/components/space-background';
import { colors, layout, spacing, typography } from '@/constants/theme';
import { careerFields } from '@/data/career-fields';

export function FrontierMapScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isCompact = width < layout.compactBreakpoint;

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
            accessibilityLabel="Return to Futurium launch screen"
            label="EXIT LAB"
            onPress={() => router.back()}
          />

          <View style={styles.header}>
            <Text style={styles.eyebrow}>FRONTIER MAP / ONLINE</Text>
            <Text style={[styles.title, isCompact && styles.titleCompact]}>
              Welcome to the Lab
            </Text>
            <Text style={styles.subtitle}>
              Experience the fields shaping tomorrow through short frontier
              simulations.
            </Text>
          </View>

          <View style={styles.mapHeader}>
            <View>
              <Text style={styles.mapLabel}>LAB NETWORK</Text>
              <Text style={styles.mapMeta}>04 FRONTIER STATIONS</Text>
            </View>
            <View style={styles.mapSignal}>
              <View style={styles.mapSignalDot} />
              <Text style={styles.mapSignalText}>CONNECTED</Text>
            </View>
          </View>

          <View
            accessibilityLabel="Four frontier stations"
            style={styles.stationList}
          >
            {careerFields.map((station, index) => (
              <FrontierStationCard
                compact={isCompact}
                index={index}
                key={station.id}
                onPress={
                  station.id === 'computer-vision'
                    ? () => router.push('/missions/computer-vision')
                    : undefined
                }
                station={station}
              />
            ))}
          </View>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  contentWidth: {
    alignSelf: 'center',
    maxWidth: 720,
    width: '100%',
  },
  eyebrow: {
    color: colors.cyan,
    fontSize: typography.size.eyebrow,
    fontWeight: typography.weight.bold,
    letterSpacing: typography.tracking.eyebrow,
    lineHeight: typography.lineHeight.eyebrow,
  },
  header: {
    marginBottom: spacing.xl,
    marginTop: spacing.lg,
  },
  mapHeader: {
    alignItems: 'center',
    borderBottomColor: colors.border,
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
    paddingBottom: spacing.md,
  },
  mapLabel: {
    color: colors.textPrimary,
    fontSize: 11,
    fontWeight: typography.weight.bold,
    letterSpacing: 1.5,
  },
  mapMeta: {
    color: colors.textMuted,
    fontSize: 8,
    fontWeight: typography.weight.medium,
    letterSpacing: 1.2,
    marginTop: spacing.xxs,
  },
  mapSignal: {
    alignItems: 'center',
    flexDirection: 'row',
  },
  mapSignalDot: {
    backgroundColor: colors.cyan,
    borderRadius: 999,
    height: 5,
    marginRight: spacing.xs,
    shadowColor: colors.cyan,
    shadowOpacity: 0.8,
    shadowRadius: 5,
    width: 5,
  },
  mapSignalText: {
    color: colors.cyanSoft,
    fontSize: 8,
    fontWeight: typography.weight.bold,
    letterSpacing: 1.2,
  },
  screen: {
    overflow: 'hidden',
  },
  scrollContent: {
    paddingBottom: spacing.xxl,
    paddingTop: spacing.xs,
  },
  stationList: {
    width: '100%',
  },
  subtitle: {
    color: colors.textSecondary,
    fontSize: typography.size.bodyLarge,
    lineHeight: typography.lineHeight.bodyLarge,
    marginTop: spacing.md,
    maxWidth: 560,
  },
  title: {
    color: colors.textPrimary,
    fontSize: 42,
    fontWeight: typography.weight.black,
    letterSpacing: -1.7,
    lineHeight: 48,
    marginTop: spacing.sm,
  },
  titleCompact: {
    fontSize: 36,
    letterSpacing: -1.3,
    lineHeight: 42,
  },
});
