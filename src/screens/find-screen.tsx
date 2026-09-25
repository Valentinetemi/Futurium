import { useFocusEffect, useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Keyboard,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';

import { Text } from '@/components/app-text';
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
import type { Sweep } from '@/database/sweep-model';
import { listSweeps } from '@/database/sweep-repository';
import { ProcessingApiError } from '@/lib/processing-api-core';
import { searchMemories } from '@/lib/search-api';
import type { SearchMatch, SearchResponse } from '@/types/search';
import { formatMomentTime, safeThumbnailUrl } from '@/utils/frame-thumbnail';
import { formatRoomName, formatSweepDate } from '@/utils/sweep-formatters';

type EnrichedMatch = SearchMatch & {
  sweep: Sweep;
};

function scoreLabel(similarity: number) {
  return `${Math.round(Math.max(0, Math.min(1, similarity)) * 100)}% similarity`;
}

function SearchResultCard({
  isPrimary,
  match,
  weak,
}: {
  isPrimary: boolean;
  match: EnrichedMatch;
  weak: boolean;
}) {
  const thumbnail = safeThumbnailUrl(match.thumbnailUrl);
  const moment = formatMomentTime(match.timestamp);
  const kind = weak
    ? 'Closest visual candidate'
    : isPrimary
      ? 'Strongest match'
      : 'Alternative match';

  return (
    <View
      accessibilityLabel={`${kind}, ${formatRoomName(match.sweep.roomName)}, saved ${formatSweepDate(match.sweep.createdAt)}, moment ${moment}, ${scoreLabel(match.similarity)}`}
      accessible
      style={[styles.resultCard, isPrimary && styles.primaryResult]}
    >
      {thumbnail ? (
        <Image
          accessibilityIgnoresInvertColors
          source={{ uri: thumbnail }}
          style={[styles.resultImage, isPrimary && styles.primaryImage]}
        />
      ) : (
        <View style={[styles.resultImage, styles.imageUnavailable]}>
          <Text style={styles.imageUnavailableText}>Preview unavailable</Text>
        </View>
      )}
      <View style={styles.resultCopy}>
        <Text style={styles.resultLabel}>{kind}</Text>
        <Text heading style={styles.resultRoom}>
          {formatRoomName(match.sweep.roomName)}
        </Text>
        <Text style={styles.resultMeta}>
          Saved {formatSweepDate(match.sweep.createdAt)}
        </Text>
        <Text style={styles.resultMeta}>
          Moment {moment} · {scoreLabel(match.similarity)}
        </Text>
      </View>
    </View>
  );
}

export function FindScreen() {
  const router = useRouter();
  const database = useSQLiteContext();
  const { width } = useWindowDimensions();
  const isCompact = width < layout.compactBreakpoint;
  const [query, setQuery] = useState('');
  const [readySweeps, setReadySweeps] = useState<Sweep[]>([]);
  const [isLoadingMemories, setIsLoadingMemories] = useState(true);
  const [isSearching, setIsSearching] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [response, setResponse] = useState<SearchResponse | null>(null);

  const sweepsById = useMemo(
    () => new Map(readySweeps.map((sweep) => [sweep.id, sweep])),
    [readySweeps],
  );
  const matches = useMemo(
    () =>
      (response?.matches ?? []).flatMap((match) => {
        const sweep = sweepsById.get(match.sweepId);
        return sweep ? [{ ...match, sweep }] : [];
      }),
    [response?.matches, sweepsById],
  );

  const refreshReadySweeps = useCallback(async () => {
    setIsLoadingMemories(true);
    setLoadError(null);
    try {
      const sweeps = await listSweeps(database);
      setReadySweeps(
        sweeps.filter(
          (sweep) => sweep.status === 'ready' && sweep.processingJobId,
        ),
      );
    } catch {
      setLoadError('Ready memories could not be loaded.');
    } finally {
      setIsLoadingMemories(false);
    }
  }, [database]);

  useFocusEffect(
    useCallback(() => {
      void refreshReadySweeps();
    }, [refreshReadySweeps]),
  );

  async function submitSearch() {
    Keyboard.dismiss();
    setSearchError(null);
    setResponse(null);
    setIsSearching(true);
    try {
      const result = await searchMemories(
        query,
        readySweeps.flatMap((sweep) =>
          sweep.processingJobId ? [sweep.processingJobId] : [],
        ),
      );
      setResponse(result);
    } catch (error) {
      setSearchError(
        error instanceof ProcessingApiError || error instanceof Error
          ? error.message
          : 'Search could not be completed. Please try again.',
      );
    } finally {
      setIsSearching(false);
    }
  }

  const canSearch =
    query.trim().length > 0 && readySweeps.length > 0 && !isSearching;

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
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.contentWidth}>
          <BackButton
            accessibilityLabel="Return home"
            onPress={() => router.back()}
          />

          <Text accessibilityRole="header" heading style={styles.title}>
            Find something
          </Text>
          <Text style={styles.subtitle}>
            Ask where an object was last seen in your prepared memories.
          </Text>

          <View style={styles.searchPanel}>
            <Text style={styles.inputLabel}>What are you looking for?</Text>
            <TextInput
              accessibilityLabel="Object search"
              autoCapitalize="sentences"
              maxLength={200}
              onChangeText={setQuery}
              onSubmitEditing={() => {
                if (canSearch) void submitSearch();
              }}
              placeholder="Where are my glasses?"
              placeholderTextColor={colors.textSecondary}
              returnKeyType="search"
              style={styles.input}
              value={query}
            />
            <PrimaryButton
              accessibilityHint="Searches frames from prepared memories"
              disabled={!canSearch}
              label={isSearching ? 'Searching…' : 'Search memories'}
              onPress={() => void submitSearch()}
              style={styles.searchButton}
            />
          </View>

          {isLoadingMemories ? (
            <View accessibilityLiveRegion="polite" style={styles.stateRow}>
              <ActivityIndicator color={colors.primary} />
              <Text style={styles.stateText}>Loading prepared memories…</Text>
            </View>
          ) : null}

          {!isLoadingMemories && loadError ? (
            <View accessibilityLiveRegion="polite" style={styles.notice}>
              <Text style={styles.errorText}>{loadError}</Text>
              <Pressable
                accessibilityRole="button"
                onPress={() => void refreshReadySweeps()}
                style={({ pressed }) => pressed && styles.pressed}
              >
                <Text style={styles.retryText}>Try again</Text>
              </Pressable>
            </View>
          ) : null}

          {!isLoadingMemories && !loadError && readySweeps.length === 0 ? (
            <View style={styles.notice}>
              <Text heading style={styles.noticeTitle}>
                No searchable memories yet
              </Text>
              <Text style={styles.noticeText}>
                Record a space, open the saved memory, and prepare it before
                searching.
              </Text>
            </View>
          ) : null}

          {searchError ? (
            <View accessibilityLiveRegion="polite" style={styles.notice}>
              <Text style={styles.errorText}>{searchError}</Text>
            </View>
          ) : null}

          {isSearching ? (
            <View accessibilityLiveRegion="polite" style={styles.stateRow}>
              <ActivityIndicator color={colors.primary} />
              <Text style={styles.stateText}>Looking across room moments…</Text>
            </View>
          ) : null}

          {response && !isSearching ? (
            <View accessibilityLiveRegion="polite" style={styles.results}>
              <Text
                accessibilityRole="header"
                heading
                style={styles.resultsTitle}
              >
                {response.confidentMatch
                  ? 'Best visual match'
                  : 'No confident match'}
              </Text>
              <Text style={styles.resultsIntro}>
                {response.confidentMatch
                  ? 'This is the closest moment from your prepared memories. It shows where the object may have been last seen.'
                  : 'Nothing was similar enough to identify confidently. Try a more specific description or review the closest visual candidates.'}
              </Text>

              {matches.map((match, index) => (
                <SearchResultCard
                  isPrimary={index === 0}
                  key={`${match.jobId}:${match.frameId}`}
                  match={match}
                  weak={!response.confidentMatch}
                />
              ))}

              {matches.length === 0 ? (
                <Text style={styles.noticeText}>
                  No indexed frames were available. Newly prepared memories will
                  become searchable after frame indexing finishes.
                </Text>
              ) : null}
            </View>
          ) : null}
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
  errorText: {
    color: colors.error,
    fontSize: typography.size.small,
    lineHeight: typography.lineHeight.small,
  },
  imageUnavailable: {
    alignItems: 'center',
    backgroundColor: colors.softBlue,
    justifyContent: 'center',
  },
  imageUnavailableText: {
    color: colors.textSecondary,
    fontSize: typography.size.caption,
  },
  input: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radii.md,
    borderWidth: 1,
    color: colors.text,
    fontSize: typography.size.body,
    lineHeight: typography.lineHeight.body,
    minHeight: 52,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  inputLabel: {
    color: colors.text,
    fontSize: typography.size.small,
    fontWeight: typography.weight.semibold,
    lineHeight: typography.lineHeight.small,
    marginBottom: spacing.xs,
  },
  notice: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radii.md,
    borderWidth: 1,
    marginTop: spacing.lg,
    padding: spacing.md,
  },
  noticeText: {
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
  pressed: {
    opacity: 0.7,
  },
  primaryImage: {
    aspectRatio: 4 / 3,
    height: undefined,
    width: '100%',
  },
  primaryResult: {
    padding: spacing.sm,
  },
  resultCard: {
    ...shadows.subtle,
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radii.lg,
    borderWidth: 1,
    marginTop: spacing.md,
    overflow: 'hidden',
  },
  resultCopy: {
    padding: spacing.md,
  },
  resultImage: {
    backgroundColor: colors.softBlue,
    height: 170,
    width: '100%',
  },
  resultLabel: {
    color: colors.primary,
    fontSize: typography.size.caption,
    fontWeight: typography.weight.semibold,
    lineHeight: typography.lineHeight.caption,
  },
  resultMeta: {
    color: colors.textSecondary,
    fontSize: typography.size.small,
    lineHeight: typography.lineHeight.small,
    marginTop: spacing.xxs,
  },
  resultRoom: {
    color: colors.text,
    fontSize: typography.size.title,
    fontWeight: typography.weight.semibold,
    lineHeight: typography.lineHeight.title,
    marginTop: spacing.xxs,
  },
  results: {
    marginTop: spacing.xl,
  },
  resultsIntro: {
    color: colors.textSecondary,
    fontSize: typography.size.body,
    lineHeight: typography.lineHeight.body,
    marginTop: spacing.xs,
  },
  resultsTitle: {
    color: colors.text,
    fontSize: typography.size.title,
    fontWeight: typography.weight.semibold,
    lineHeight: typography.lineHeight.title,
  },
  retryText: {
    color: colors.primary,
    fontSize: typography.size.small,
    fontWeight: typography.weight.semibold,
    marginTop: spacing.sm,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: spacing.xxl,
    paddingTop: spacing.xxs,
  },
  searchButton: {
    marginTop: spacing.sm,
  },
  searchPanel: {
    marginTop: spacing.lg,
  },
  stateRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.lg,
  },
  stateText: {
    color: colors.textSecondary,
    flex: 1,
    fontSize: typography.size.small,
    lineHeight: typography.lineHeight.small,
  },
  subtitle: {
    color: colors.textSecondary,
    fontSize: typography.size.body,
    lineHeight: typography.lineHeight.body,
    marginTop: spacing.xs,
  },
  title: {
    color: colors.text,
    fontSize: typography.size.heading,
    fontWeight: typography.weight.semibold,
    lineHeight: typography.lineHeight.heading,
    marginTop: spacing.xs,
  },
});
