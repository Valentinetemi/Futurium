import { useFocusEffect, useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  View,
} from 'react-native';

import { Text } from '@/components/app-text';
import { PrimaryButton } from '@/components/primary-button';
import { SavedMemoryCard } from '@/components/saved-memory-card';
import { ScreenContainer } from '@/components/screen-container';
import { colors, layout, radii, spacing, typography } from '@/constants/theme';
import type { Sweep } from '@/database/sweep-model';
import { listSweeps } from '@/database/sweep-repository';
import { formatSweepDay } from '@/utils/sweep-formatters';

type MemoryDay = {
  label: string;
  sweeps: Sweep[];
};

function groupByDay(sweeps: Sweep[]) {
  const days: MemoryDay[] = [];

  for (const sweep of sweeps) {
    const label = formatSweepDay(sweep.createdAt);
    const currentDay = days[days.length - 1];

    if (currentDay?.label === label) {
      currentDay.sweeps.push(sweep);
    } else {
      days.push({ label, sweeps: [sweep] });
    }
  }

  return days;
}

export function HomeScreen() {
  const router = useRouter();
  const database = useSQLiteContext();
  const [sweeps, setSweeps] = useState<Sweep[]>([]);
  const [isLoadingSweeps, setIsLoadingSweeps] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const { width } = useWindowDimensions();
  const isCompact = width < layout.compactBreakpoint;
  const memoryDays = useMemo(() => groupByDay(sweeps), [sweeps]);

  const refreshSweeps = useCallback(async () => {
    setIsLoadingSweeps(true);
    setLoadError(null);

    try {
      setSweeps(await listSweeps(database));
    } catch {
      setLoadError('Your memories could not be loaded.');
    } finally {
      setIsLoadingSweeps(false);
    }
  }, [database]);

  useFocusEffect(
    useCallback(() => {
      void refreshSweeps();
    }, [refreshSweeps]),
  );

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
          <View style={styles.topBar}>
            <Text heading style={styles.wordmark}>
              Futurium
            </Text>

            <Pressable
              accessibilityHint="Shows the free and Plus plans"
              accessibilityLabel="Futurium Plus"
              accessibilityRole="button"
              hitSlop={8}
              onPress={() => router.push('/plus')}
              style={({ pressed }) => [
                styles.plusButton,
                pressed && styles.pressed,
              ]}
            >
              <View style={styles.plusDot} />
              <Text
                maxFontSizeMultiplier={typography.maxScale.control}
                style={styles.plusLabel}
              >
                Plus
              </Text>
            </Pressable>
          </View>

          <Text accessibilityRole="header" heading style={styles.headline}>
            Record a room,{'\n'}look back later.
          </Text>

          <PrimaryButton
            accessibilityHint="Opens the camera to record a room"
            label="Record a space"
            onPress={() => router.push('/capture')}
          />

          <Pressable
            accessibilityHint="Search is not available yet. Opens a short explanation."
            accessibilityLabel="Find something. Coming soon."
            accessibilityRole="button"
            onPress={() => router.push('/find')}
            style={({ pressed }) => [
              styles.findAction,
              pressed && styles.pressed,
            ]}
          >
            <Text
              maxFontSizeMultiplier={typography.maxScale.control}
              style={styles.findActionText}
            >
              Find something
            </Text>
            <Text
              maxFontSizeMultiplier={typography.maxScale.control}
              style={styles.findActionNote}
            >
              Coming soon
            </Text>
          </Pressable>

          <View style={styles.memoriesHeader}>
            <Text
              accessibilityRole="header"
              heading
              style={styles.sectionTitle}
            >
              Recent memories
            </Text>
            {!isLoadingSweeps && !loadError && sweeps.length > 0 ? (
              <Text style={styles.sectionCount}>
                {sweeps.length} {sweeps.length === 1 ? 'memory' : 'memories'}
              </Text>
            ) : null}
          </View>

          {isLoadingSweeps ? (
            <View accessibilityLiveRegion="polite" style={styles.quietState}>
              <ActivityIndicator color={colors.primary} />
              <Text style={styles.quietText}>Loading your memories…</Text>
            </View>
          ) : null}

          {!isLoadingSweeps && loadError ? (
            <View accessibilityLiveRegion="polite" style={styles.message}>
              <Text style={styles.errorTitle}>{loadError}</Text>
              <Pressable
                accessibilityLabel="Try loading memories again"
                accessibilityRole="button"
                onPress={() => void refreshSweeps()}
                style={({ pressed }) => [
                  styles.textButton,
                  pressed && styles.pressed,
                ]}
              >
                <Text style={styles.textButtonLabel}>Try again</Text>
              </Pressable>
            </View>
          ) : null}

          {!isLoadingSweeps && !loadError && sweeps.length === 0 ? (
            <View style={styles.message}>
              <Text style={styles.emptyTitle}>No memories yet</Text>
              <Text style={styles.emptyCopy}>
                Rooms you record will appear here, newest first.
              </Text>
            </View>
          ) : null}

          {!isLoadingSweeps && !loadError
            ? memoryDays.map((day) => (
                <View key={day.label} style={styles.day}>
                  <Text accessibilityRole="header" style={styles.dayLabel}>
                    {day.label}
                  </Text>
                  {day.sweeps.map((sweep, index) => (
                    <SavedMemoryCard
                      isFirst={index === 0}
                      isLast={index === day.sweeps.length - 1}
                      key={sweep.id}
                      onPress={() =>
                        router.push({
                          params: { id: String(sweep.id) },
                          pathname: '/memories/[id]',
                        })
                      }
                      sweep={sweep}
                    />
                  ))}
                </View>
              ))
            : null}

          <Text style={styles.privacyText}>
            Videos stay on this phone unless you choose to prepare one.
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
  day: {
    marginTop: spacing.md,
  },
  dayLabel: {
    color: colors.text,
    fontSize: typography.size.small,
    fontWeight: typography.weight.semibold,
    lineHeight: typography.lineHeight.small,
    marginBottom: spacing.xxs,
  },
  emptyCopy: {
    color: colors.textSecondary,
    fontSize: typography.size.body,
    lineHeight: typography.lineHeight.body,
    marginTop: spacing.xxs,
  },
  emptyTitle: {
    color: colors.text,
    fontSize: typography.size.body,
    fontWeight: typography.weight.semibold,
    lineHeight: typography.lineHeight.body,
  },
  errorTitle: {
    color: colors.error,
    fontSize: typography.size.body,
    fontWeight: typography.weight.semibold,
    lineHeight: typography.lineHeight.body,
  },
  findAction: {
    alignContent: 'center',
    alignItems: 'center',
    borderColor: colors.border,
    borderRadius: radii.md,
    borderWidth: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    marginTop: spacing.sm,
    minHeight: layout.buttonHeight,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  findActionNote: {
    color: colors.textSecondary,
    fontSize: typography.size.small,
    marginLeft: spacing.xs,
  },
  findActionText: {
    color: colors.textSecondary,
    fontSize: typography.size.body,
    fontWeight: typography.weight.medium,
  },
  headline: {
    color: colors.text,
    fontSize: typography.size.heading,
    fontWeight: typography.weight.semibold,
    letterSpacing: -0.3,
    lineHeight: typography.lineHeight.heading,
    marginBottom: spacing.lg,
    marginTop: spacing.md,
  },
  memoriesHeader: {
    alignItems: 'baseline',
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginTop: spacing.xl,
  },
  message: {
    marginTop: spacing.sm,
  },
  plusButton: {
    alignItems: 'center',
    flexDirection: 'row',
    minHeight: layout.minTouchTarget,
    paddingLeft: spacing.sm,
  },
  plusDot: {
    backgroundColor: colors.accent,
    borderRadius: radii.pill,
    height: 7,
    marginRight: spacing.xs,
    width: 7,
  },
  plusLabel: {
    color: colors.primary,
    fontSize: typography.size.small,
    fontWeight: typography.weight.semibold,
  },
  pressed: {
    opacity: 0.6,
  },
  privacyText: {
    color: colors.textSecondary,
    fontSize: typography.size.caption,
    lineHeight: typography.lineHeight.caption,
    marginTop: spacing.xl,
  },
  quietState: {
    alignItems: 'center',
    flexDirection: 'row',
    marginTop: spacing.sm,
    minHeight: layout.minTouchTarget,
  },
  quietText: {
    color: colors.textSecondary,
    fontSize: typography.size.body,
    marginLeft: spacing.sm,
  },
  scrollContent: {
    paddingBottom: spacing.xl,
    paddingTop: spacing.xxs,
  },
  sectionCount: {
    color: colors.textSecondary,
    fontSize: typography.size.small,
  },
  sectionTitle: {
    color: colors.text,
    fontSize: typography.size.title,
    fontWeight: typography.weight.semibold,
    lineHeight: typography.lineHeight.title,
    marginRight: spacing.sm,
  },
  textButton: {
    alignSelf: 'flex-start',
    justifyContent: 'center',
    marginTop: spacing.xxs,
    minHeight: layout.minTouchTarget,
  },
  textButtonLabel: {
    color: colors.primary,
    fontSize: typography.size.body,
    fontWeight: typography.weight.semibold,
  },
  topBar: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    minHeight: 52,
  },
  wordmark: {
    color: colors.primary,
    fontSize: typography.size.lead,
    fontWeight: typography.weight.bold,
    letterSpacing: -0.2,
  },
});
