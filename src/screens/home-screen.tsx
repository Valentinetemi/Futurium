import { useFocusEffect, useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';

import { HomeActionCard } from '@/components/home-action-card';
import { MemoryMark } from '@/components/memory-mark';
import { SavedMemoryCard } from '@/components/saved-memory-card';
import { ScreenContainer } from '@/components/screen-container';
import { colors, layout, radii, spacing, typography } from '@/constants/theme';
import type { Sweep } from '@/database/sweep-model';
import { listSweeps } from '@/database/sweep-repository';

export function HomeScreen() {
  const router = useRouter();
  const database = useSQLiteContext();
  const [sweeps, setSweeps] = useState<Sweep[]>([]);
  const [isLoadingSweeps, setIsLoadingSweeps] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const { width } = useWindowDimensions();
  const isCompact = width < layout.compactBreakpoint;

  const refreshSweeps = useCallback(async () => {
    setIsLoadingSweeps(true);
    setLoadError(null);

    try {
      setSweeps(await listSweeps(database));
    } catch {
      setLoadError('Saved memories could not be loaded. Please try again.');
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
            <View style={styles.brand}>
              <MemoryMark />
              <View style={styles.brandCopy}>
                <Text style={styles.productName}>Futurium</Text>
                <Text style={styles.productType}>VISUAL MEMORY</Text>
              </View>
            </View>

            <Pressable
              accessibilityHint="View free and Plus plan details"
              accessibilityLabel="Futurium Plus"
              accessibilityRole="button"
              onPress={() => router.push('/plus')}
              style={({ pressed }) => [
                styles.plusButton,
                pressed && styles.pressed,
              ]}
            >
              <View style={styles.plusDot} />
              <Text style={styles.plusLabel}>PLUS</Text>
            </Pressable>
          </View>

          <View style={styles.hero}>
            <Text style={styles.eyebrow}>A MEMORY FOR YOUR SPACES</Text>
            <Text
              accessibilityRole="header"
              style={[styles.headline, isCompact && styles.headlineCompact]}
            >
              Sweep now.{`\n`}Ask later.
            </Text>
            <Text style={styles.intro}>
              Record a room once. Keep a visual memory of the space for later.
            </Text>
          </View>

          <View accessibilityLabel="Memory actions" style={styles.actions}>
            <HomeActionCard
              description="Capture one smooth, 30-second view of a room."
              kind="record"
              onPress={() => router.push('/capture')}
              title="Record a space"
            />
            <HomeActionCard
              description="Ask where an object was last seen."
              kind="find"
              onPress={() => router.push('/find')}
              title="Find something"
            />
          </View>

          <View style={styles.recentHeader}>
            <Text style={styles.sectionTitle}>Recent memories</Text>
            <Text style={styles.sectionCount}>
              {sweeps.length} {sweeps.length === 1 ? 'SPACE' : 'SPACES'}
            </Text>
          </View>

          {isLoadingSweeps ? (
            <View accessibilityLiveRegion="polite" style={styles.loadingState}>
              <ActivityIndicator color={colors.sage} />
              <Text style={styles.loadingText}>Loading saved memories…</Text>
            </View>
          ) : null}

          {!isLoadingSweeps && loadError ? (
            <View accessibilityLiveRegion="polite" style={styles.errorState}>
              <Text style={styles.errorTitle}>Memories unavailable</Text>
              <Text style={styles.errorCopy}>{loadError}</Text>
              <Pressable
                accessibilityLabel="Retry loading saved memories"
                accessibilityRole="button"
                onPress={() => void refreshSweeps()}
                style={({ pressed }) => [
                  styles.retryButton,
                  pressed && styles.pressed,
                ]}
              >
                <Text style={styles.retryText}>Try again</Text>
              </Pressable>
            </View>
          ) : null}

          {!isLoadingSweeps && !loadError
            ? sweeps.map((sweep) => (
                <SavedMemoryCard
                  key={sweep.id}
                  onPress={() =>
                    router.push({
                      params: { id: String(sweep.id) },
                      pathname: '/memories/[id]',
                    })
                  }
                  sweep={sweep}
                />
              ))
            : null}

          {!isLoadingSweeps && !loadError && sweeps.length === 0 ? (
            <View style={styles.emptyState}>
              <View style={styles.emptyIcon}>
                <View style={styles.emptyFrame} />
                <View style={styles.emptyFrameOffset} />
              </View>
              <Text style={styles.emptyTitle}>No spaces saved yet</Text>
              <Text style={styles.emptyCopy}>
                Your saved room sweeps will appear here as saved memories.
              </Text>
            </View>
          ) : null}

          <View style={styles.privacyNote}>
            <View style={styles.privacyDot} />
            <Text style={styles.privacyText}>
              Sweeps stay on this device in this prototype.
            </Text>
          </View>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  actions: {
    marginBottom: spacing.xl,
  },
  brand: {
    alignItems: 'center',
    flexDirection: 'row',
  },
  brandCopy: {
    marginLeft: spacing.sm,
  },
  contentWidth: {
    alignSelf: 'center',
    maxWidth: layout.maxContentWidth,
    width: '100%',
  },
  emptyCopy: {
    color: colors.muted,
    fontSize: typography.size.bodySmall,
    lineHeight: typography.lineHeight.bodySmall,
    marginTop: spacing.xs,
    maxWidth: 320,
    textAlign: 'center',
  },
  emptyFrame: {
    borderColor: colors.sage,
    borderRadius: radii.sm,
    borderWidth: 1.5,
    height: 31,
    left: 7,
    position: 'absolute',
    top: 7,
    width: 38,
  },
  emptyFrameOffset: {
    borderColor: colors.mint,
    borderRadius: radii.sm,
    borderWidth: 1.5,
    bottom: 7,
    height: 31,
    position: 'absolute',
    right: 7,
    width: 38,
  },
  emptyIcon: {
    backgroundColor: colors.sageSoft,
    borderRadius: radii.lg,
    height: 62,
    marginBottom: spacing.md,
    width: 62,
  },
  emptyState: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.line,
    borderRadius: radii.lg,
    borderStyle: 'dashed',
    borderWidth: 1,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xl,
  },
  emptyTitle: {
    color: colors.ink,
    fontSize: typography.size.body,
    fontWeight: typography.weight.semibold,
  },
  errorCopy: {
    color: colors.muted,
    fontSize: typography.size.bodySmall,
    lineHeight: typography.lineHeight.bodySmall,
    marginTop: spacing.xs,
    textAlign: 'center',
  },
  errorState: {
    alignItems: 'center',
    backgroundColor: colors.dangerSoft,
    borderRadius: radii.lg,
    padding: spacing.lg,
  },
  errorTitle: {
    color: colors.danger,
    fontSize: typography.size.body,
    fontWeight: typography.weight.semibold,
  },
  eyebrow: {
    color: colors.sage,
    fontSize: typography.size.caption,
    fontWeight: typography.weight.bold,
    letterSpacing: 1.6,
    lineHeight: typography.lineHeight.caption,
  },
  headline: {
    color: colors.ink,
    fontSize: typography.size.display,
    fontWeight: typography.weight.semibold,
    letterSpacing: -2.2,
    lineHeight: typography.lineHeight.display,
    marginTop: spacing.sm,
  },
  headlineCompact: {
    fontSize: 42,
    lineHeight: 47,
  },
  hero: {
    marginBottom: spacing.xl,
    marginTop: spacing.xxl,
  },
  intro: {
    color: colors.inkSoft,
    fontSize: typography.size.bodyLarge,
    lineHeight: typography.lineHeight.bodyLarge,
    marginTop: spacing.md,
    maxWidth: 540,
  },
  loadingState: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.line,
    borderRadius: radii.lg,
    borderWidth: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    minHeight: 96,
    padding: spacing.lg,
  },
  loadingText: {
    color: colors.muted,
    fontSize: typography.size.bodySmall,
    marginLeft: spacing.sm,
  },
  plusButton: {
    alignItems: 'center',
    backgroundColor: colors.sageSoft,
    borderRadius: radii.pill,
    flexDirection: 'row',
    minHeight: layout.minTouchTarget,
    paddingHorizontal: spacing.md,
  },
  plusDot: {
    backgroundColor: colors.sage,
    borderRadius: radii.pill,
    height: 6,
    marginRight: spacing.xs,
    width: 6,
  },
  plusLabel: {
    color: colors.sageDark,
    fontSize: 10,
    fontWeight: typography.weight.bold,
    letterSpacing: 1.2,
  },
  pressed: {
    opacity: 0.64,
  },
  privacyDot: {
    backgroundColor: colors.sage,
    borderRadius: radii.pill,
    height: 5,
    marginRight: spacing.xs,
    width: 5,
  },
  privacyNote: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: spacing.lg,
  },
  privacyText: {
    color: colors.muted,
    fontSize: 11,
    lineHeight: 16,
  },
  productName: {
    color: colors.ink,
    fontSize: typography.size.body,
    fontWeight: typography.weight.bold,
    letterSpacing: -0.2,
  },
  productType: {
    color: colors.muted,
    fontSize: 8,
    fontWeight: typography.weight.semibold,
    letterSpacing: 1.3,
    marginTop: 1,
  },
  recentHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  retryButton: {
    backgroundColor: colors.surface,
    borderRadius: radii.pill,
    marginTop: spacing.md,
    minHeight: layout.minTouchTarget,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  retryText: {
    color: colors.danger,
    fontSize: typography.size.bodySmall,
    fontWeight: typography.weight.semibold,
  },
  scrollContent: {
    paddingBottom: spacing.xl,
    paddingTop: spacing.xs,
  },
  sectionCount: {
    color: colors.faint,
    fontSize: 9,
    fontWeight: typography.weight.bold,
    letterSpacing: 1.2,
  },
  sectionTitle: {
    color: colors.ink,
    fontSize: typography.size.body,
    fontWeight: typography.weight.semibold,
  },
  topBar: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    minHeight: 56,
  },
});
