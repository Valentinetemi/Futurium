import type { PropsWithChildren } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';
import { StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors } from '@/constants/theme';

type ScreenContainerProps = PropsWithChildren<{
  dark?: boolean;
  style?: StyleProp<ViewStyle>;
}>;

export function ScreenContainer({
  children,
  dark = false,
  style,
}: ScreenContainerProps) {
  return (
    <SafeAreaView
      style={[styles.container, dark && styles.containerDark, style]}
    >
      {children}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.background,
    flex: 1,
  },
  containerDark: {
    backgroundColor: colors.camera,
  },
});
