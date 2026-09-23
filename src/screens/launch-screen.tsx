import { StyleSheet, Text, View } from 'react-native';

import { ScreenContainer } from '@/components/screen-container';
import { launchCopy } from '@/constants/copy';

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
    color: '#a9b4d0',
    fontSize: 18,
    marginTop: 16,
    textAlign: 'center',
  },
  title: {
    color: '#ffffff',
    fontSize: 40,
    fontWeight: '700',
  },
});
