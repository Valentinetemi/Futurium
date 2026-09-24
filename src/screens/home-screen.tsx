import { useFocusEffect, useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';

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
            <Text style={styles.wordmark}>Futurium</Text>

            <Pressable
              accessibilityHint="Shows the free and Plus plans"
              accessibilityLabel="Futurium Plus"
              accessibilityRole="button"
              hitSlop={4}
              onPress={() => router.push('/plus')}
              style={({ pressed }) => [
                styles.plusButton,
                pressed && styles.pressed,
              ]}
            >
              <Text style={styles.plusLabel}>Plus</Text>
            </Pressable>
          </View>

          <View style={styles.intro}>
            <Text
              accessibilityRole="header"
              style={[styles.headline, isCompact && styles.headlineCompact]}
            >
              Record a room.{'\n'}Look back later.
            </Text>
            <Text style={styles.introCopy}>
              Each memory is a short video of a room, kept on this phone.
            </Text>
          </View>

          <PrimaryButton
            accessibilityHint="Opens the camera to record a room"
            label="Record a space"
            onPress={() => router.push('/capture')}
          />

          <Pressable
            accessibilityHint="Shows what finding objects will do. Not available yet."
            accessibilityRole="button"
            onPress={() => router.push('/find')}
            style={({ pressed }) => [
              styles.findLink,
              pressed && styles.pressed,
            ]}
          >
            <Text style={styles.findLinkText}>Find something</Text>
            <Text style={styles.findLinkNote}>Coming soon</Text>
          </Pressable>

          <View style={styles.memoriesHeader}>
            <Text accessibilityRole="header" style={styles.sectionTitle}>
              Memories
            </Text>
            {!isLoadingSweeps && !loadError && sweeps.length > 0 ? (
              <Text style={styles.sectionCount}>
                {sweeps.length} {sweeps.length === 1 ? 'room' : 'rooms'}
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
              <Text style={styles.emptyTitle}>No memories yet.</Text>
              <Text style={styles.emptyCopy}>
                When you record a room, it will appear here.
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
            Videos stay on this phone unless you choose to prepare one for
            finding.
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
    marginTop: spacing.lg,
  },
  dayLabel: {
    color: colors.memoryBlue,
    fontSize: typography.size.small,
    fontWeight: typography.weight.semibold,
    lineHeight: typography.lineHeight.small,
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
  findLink: {
    alignItems: 'center',
    alignSelf: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: spacing.sm,
    minHeight: layout.minTouchTarget,
    paddingHorizontal: spacing.md,
  },
  findLinkNote: {
    color: colors.textSecondary,
    fontSize: typography.size.small,
    marginLeft: spacing.xs,
  },
  findLinkText: {
    color: colors.primary,
    fontSize: typography.size.body,
    fontWeight: typography.weight.semibold,
  },
  headline: {
    color: colors.text,
    fontSize: typography.size.display,
    fontWeight: typography.weight.semibold,
    letterSpacing: -0.6,
    lineHeight: typography.lineHeight.display,
  },
  headlineCompact: {
    fontSize: typography.size.heading,
    lineHeight: typography.lineHeight.heading,
  },
  intro: {
    marginBottom: spacing.xl,
    marginTop: spacing.xl,
  },
  introCopy: {
    color: colors.textSecondary,
    fontSize: typography.size.body,
    lineHeight: typography.lineHeight.body,
    marginTop: spacing.sm,
    maxWidth: 480,
  },
  memoriesHeader: {
    alignItems: 'baseline',
    borderTopColor: colors.border,
    borderTopWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.xl,
    paddingTop: spacing.lg,
  },
  message: {
    marginTop: spacing.md,
  },
  plusButton: {
    alignItems: 'center',
    borderColor: colors.border,
    borderRadius: radii.md,
    borderWidth: 1,
    justifyContent: 'center',
    minHeight: layout.minTouchTarget,
    minWidth: 72,
    paddingHorizontal: spacing.md,
  },
  plusLabel: {
    color: colors.text,
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
    marginTop: spacing.md,
    minHeight: layout.minTouchTarget,
  },
  quietText: {
    color: colors.textSecondary,
    fontSize: typography.size.body,
    marginLeft: spacing.sm,
  },
  scrollContent: {
    paddingBottom: spacing.xxl,
    paddingTop: spacing.xs,
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
  },
  textButton: {
    alignSelf: 'flex-start',
    justifyContent: 'center',
    marginTop: spacing.xs,
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
    minHeight: 56,
  },
  wordmark: {
    color: colors.primary,
    fontSize: typography.size.bodyLarge,
    fontWeight: typography.weight.bold,
    letterSpacing: -0.2,
  },
});
