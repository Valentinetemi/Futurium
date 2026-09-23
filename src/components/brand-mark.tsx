import { StyleSheet, View } from 'react-native';

import { colors, radii } from '@/constants/theme';

export function BrandMark() {
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={styles.mark}
    >
      <View style={styles.orbit} />
      <View style={styles.orbitNode} />
      <View style={styles.core} />
    </View>
  );
}

const styles = StyleSheet.create({
  core: {
    backgroundColor: colors.cyan,
    borderRadius: radii.pill,
    height: 7,
    shadowColor: colors.cyan,
    shadowOpacity: 0.8,
    shadowRadius: 7,
    width: 7,
  },
  mark: {
    alignItems: 'center',
    borderColor: colors.borderStrong,
    borderRadius: radii.pill,
    borderWidth: 1,
    height: 34,
    justifyContent: 'center',
    width: 34,
  },
  orbit: {
    borderColor: colors.violet,
    borderRadius: radii.pill,
    borderWidth: StyleSheet.hairlineWidth,
    height: 13,
    position: 'absolute',
    transform: [{ rotate: '-24deg' }],
    width: 24,
  },
  orbitNode: {
    backgroundColor: colors.violetSoft,
    borderRadius: radii.pill,
    height: 3,
    position: 'absolute',
    right: 5,
    top: 11,
    width: 3,
  },
});
