import { StyleSheet, Text, View } from 'react-native';

import { ScreenContainer } from '@/components/screen-container';
import { launchCopy } from '@/constants/copy';
import { colors, spacing, typography } from '@/constants/theme';

export function LaunchScreen() {
  return (
    <ScreenContainer>
      <View style={styles.content}>
        <Text style={styles.title}>{launchCopy.title}</Text>
        <Text style={styles.tagline}>{launchCopy.tagline}</Text>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
  },
  tagline: {
    color: colors.textSecondary,
    fontSize: typography.size.bodyLarge,
    lineHeight: typography.lineHeight.bodyLarge,
    marginTop: spacing.md,
    textAlign: 'center',
  },
  title: {
    color: colors.textPrimary,
    fontSize: typography.size.title,
    fontWeight: typography.weight.bold,
    letterSpacing: typography.tracking.title,
    lineHeight: typography.lineHeight.title,
  },
});
