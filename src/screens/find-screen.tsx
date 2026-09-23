import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import {
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';

import { BackButton } from '@/components/back-button';
import { ScreenContainer } from '@/components/screen-container';
import { colors, layout, radii, spacing, typography } from '@/constants/theme';

export function FindScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isCompact = width < layout.compactBreakpoint;

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
      >
        <View style={styles.contentWidth}>
          <BackButton
            accessibilityLabel="Return home"
            onPress={() => router.back()}
          />

          <View style={styles.header}>
            <Text style={styles.eyebrow}>VISUAL SEARCH</Text>
            <Text accessibilityRole="header" style={styles.title}>
              Find something
            </Text>
            <Text style={styles.subtitle}>
              Ask where an object was last seen across your recorded spaces.
            </Text>
          </View>

          <View
            accessibilityLabel="Search is not available yet"
            style={styles.searchField}
          >
            <View style={styles.searchLens} />
            <Text style={styles.searchPlaceholder}>
              What are you looking for?
            </Text>
          </View>

          <View style={styles.placeholder}>
            <View style={styles.placeholderMark}>
              <View style={styles.placeholderDot} />
            </View>
            <Text style={styles.placeholderTitle}>Search is coming next</Text>
            <Text style={styles.placeholderCopy}>
              The future retrieval service will inspect saved sweep frames and
              return the most relevant view and location.
            </Text>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>
                PLACEHOLDER · NO AI CONNECTED
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  badge: {
    backgroundColor: colors.canvasMuted,
    borderRadius: radii.pill,
    marginTop: spacing.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  badgeText: {
    color: colors.muted,
    fontSize: 9,
    fontWeight: typography.weight.bold,
    letterSpacing: 1.1,
  },
  contentWidth: {
    alignSelf: 'center',
    maxWidth: layout.maxContentWidth,
    width: '100%',
  },
  eyebrow: {
    color: colors.sage,
    fontSize: typography.size.caption,
    fontWeight: typography.weight.bold,
    letterSpacing: 1.5,
  },
  header: {
    marginBottom: spacing.xl,
    marginTop: spacing.xl,
  },
  placeholder: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.line,
    borderRadius: radii.lg,
    borderWidth: 1,
    marginTop: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xxl,
  },
  placeholderCopy: {
    color: colors.muted,
    fontSize: typography.size.bodySmall,
    lineHeight: typography.lineHeight.bodySmall,
    marginTop: spacing.xs,
    maxWidth: 420,
    textAlign: 'center',
  },
  placeholderDot: {
    backgroundColor: colors.sage,
    borderRadius: radii.pill,
    height: 12,
    width: 12,
  },
  placeholderMark: {
    alignItems: 'center',
    backgroundColor: colors.sageSoft,
    borderRadius: radii.pill,
    height: 64,
    justifyContent: 'center',
    marginBottom: spacing.md,
    width: 64,
  },
  placeholderTitle: {
    color: colors.ink,
    fontSize: typography.size.bodyLarge,
    fontWeight: typography.weight.semibold,
    lineHeight: typography.lineHeight.bodyLarge,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: spacing.xl,
    paddingTop: spacing.xs,
  },
  searchField: {
    alignItems: 'center',
    backgroundColor: colors.canvasMuted,
    borderColor: colors.line,
    borderRadius: radii.md,
    borderWidth: 1,
    flexDirection: 'row',
    minHeight: 58,
    paddingHorizontal: spacing.md,
  },
  searchLens: {
    borderColor: colors.muted,
    borderRadius: radii.pill,
    borderWidth: 1.5,
    height: 17,
    marginRight: spacing.sm,
    width: 17,
  },
  searchPlaceholder: {
    color: colors.faint,
    fontSize: typography.size.body,
  },
  subtitle: {
    color: colors.inkSoft,
    fontSize: typography.size.bodyLarge,
    lineHeight: typography.lineHeight.bodyLarge,
    marginTop: spacing.sm,
    maxWidth: 520,
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
