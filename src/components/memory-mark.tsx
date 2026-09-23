import { StyleSheet, View } from 'react-native';

import { colors, radii } from '@/constants/theme';

type MemoryMarkProps = {
  inverted?: boolean;
  size?: number;
};

export function MemoryMark({ inverted = false, size = 42 }: MemoryMarkProps) {
  const frameSize = Math.round(size * 0.52);

  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[
        styles.container,
        { borderRadius: size * 0.3, height: size, width: size },
        inverted && styles.containerInverted,
      ]}
    >
      <View
        style={[
          styles.frame,
          {
            borderRadius: frameSize * 0.3,
            height: frameSize,
            width: frameSize,
          },
          inverted && styles.frameInverted,
        ]}
      >
        <View
          style={[styles.memoryDot, inverted && styles.memoryDotInverted]}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    backgroundColor: colors.sageDark,
    justifyContent: 'center',
  },
  containerInverted: {
    backgroundColor: colors.white,
  },
  frame: {
    alignItems: 'center',
    borderColor: colors.mint,
    borderWidth: 1.5,
    justifyContent: 'center',
  },
  frameInverted: {
    borderColor: colors.sage,
  },
  memoryDot: {
    backgroundColor: colors.mint,
    borderRadius: radii.pill,
    height: 5,
    width: 5,
  },
  memoryDotInverted: {
    backgroundColor: colors.sageDark,
  },
});
