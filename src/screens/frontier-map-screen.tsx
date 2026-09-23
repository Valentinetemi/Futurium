import { useRouter } from 'expo-router';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';

import { ScreenContainer } from '@/components/screen-container';
import { SpaceBackground } from '@/components/space-background';
import { colors, layout, radii, spacing, typography } from '@/constants/theme';
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
          <Pressable
            accessibilityLabel="Return to Futurium launch screen"
            accessibilityRole="button"
            hitSlop={8}
            onPress={() => router.back()}
            style={({ pressed }) => [
              styles.backButton,
              pressed && styles.backButtonPressed,
            ]}
          >
            <Text style={styles.backArrow}>←</Text>
            <Text style={styles.backLabel}>EXIT LAB</Text>
          </Pressable>

          <View style={styles.header}>
            <Text style={styles.eyebrow}>FRONTIER MAP / ONLINE</Text>
            <Text style={styles.title}>Welcome to the Lab</Text>
            <Text style={styles.subtitle}>
              Experience the fields shaping tomorrow through short frontier
              simulations.
            </Text>
          </View>

          <View
            accessibilityLabel="Four frontier stations"
            style={styles.stationList}
          >
            {careerFields.map((station, index) => (
              <View key={station.id} style={styles.stationCard}>
                <View style={styles.stationTopRow}>
                  <Text style={styles.stationCode}>
                    {String(index + 1).padStart(2, '0')} / {station.code}
                  </Text>
                  <Text
                    style={[
                      styles.stationStatus,
                      station.status === 'available' &&
                        styles.stationStatusAvailable,
                    ]}
                  >
                    {station.status === 'available'
                      ? 'AVAILABLE'
                      : 'COMING SOON'}
                  </Text>
                </View>
                <Text style={styles.stationName}>{station.name}</Text>
                <Text style={styles.stationDescription}>
                  {station.description}
                </Text>
              </View>
            ))}
          </View>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  backArrow: {
    color: colors.cyan,
    fontSize: 19,
    lineHeight: 21,
    marginRight: spacing.xs,
  },
  backButton: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    flexDirection: 'row',
    minHeight: layout.minTouchTarget,
    paddingRight: spacing.md,
  },
  backButtonPressed: {
    opacity: 0.68,
  },
  backLabel: {
    color: colors.textSecondary,
    fontSize: 10,
    fontWeight: typography.weight.bold,
    letterSpacing: 1.5,
  },
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
  screen: {
    overflow: 'hidden',
  },
  scrollContent: {
    paddingBottom: spacing.xxl,
    paddingTop: spacing.xs,
  },
  stationCard: {
    backgroundColor: colors.backgroundElevated,
    borderColor: colors.border,
    borderRadius: radii.lg,
    borderWidth: 1,
    marginBottom: spacing.md,
    padding: spacing.lg,
  },
  stationCode: {
    color: colors.textMuted,
    fontSize: 10,
    fontWeight: typography.weight.bold,
    letterSpacing: 1.4,
  },
  stationDescription: {
    color: colors.textSecondary,
    fontSize: typography.size.body,
    lineHeight: typography.lineHeight.body,
    marginTop: spacing.xs,
  },
  stationList: {
    width: '100%',
  },
  stationName: {
    color: colors.textPrimary,
    fontSize: 23,
    fontWeight: typography.weight.bold,
    lineHeight: 29,
    marginTop: spacing.lg,
  },
  stationStatus: {
    color: colors.textMuted,
    fontSize: 9,
    fontWeight: typography.weight.bold,
    letterSpacing: 1.2,
  },
  stationStatusAvailable: {
    color: colors.cyan,
  },
  stationTopRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
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
});
