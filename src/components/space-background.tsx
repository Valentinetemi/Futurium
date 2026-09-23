import type { DimensionValue } from 'react-native';
import { StyleSheet, useWindowDimensions, View } from 'react-native';

import { colors, radii } from '@/constants/theme';

type Star = {
  color?: string;
  left: DimensionValue;
  opacity: number;
  size: number;
  top: DimensionValue;
};

const stars = [
  { top: '7%', left: '12%', size: 2, opacity: 0.72 },
  { top: '12%', left: '74%', size: 1, opacity: 0.55 },
  { top: '19%', left: '90%', size: 2, opacity: 0.8, color: colors.violetSoft },
  { top: '23%', left: '25%', size: 1, opacity: 0.46 },
  { top: '31%', left: '7%', size: 1, opacity: 0.6, color: colors.cyanSoft },
  { top: '36%', left: '67%', size: 2, opacity: 0.45 },
  { top: '43%', left: '84%', size: 1, opacity: 0.7 },
  { top: '49%', left: '18%', size: 2, opacity: 0.4, color: colors.violetSoft },
  { top: '58%', left: '95%', size: 1, opacity: 0.54 },
  { top: '63%', left: '10%', size: 1, opacity: 0.62 },
  { top: '71%', left: '79%', size: 2, opacity: 0.42, color: colors.cyanSoft },
  { top: '79%', left: '29%', size: 1, opacity: 0.38 },
  { top: '87%', left: '61%', size: 1, opacity: 0.6 },
  { top: '92%', left: '92%', size: 2, opacity: 0.46, color: colors.violetSoft },
] satisfies readonly Star[];

const gridLines = ['12%', '31%', '50%', '69%', '88%'] as const;

export function SpaceBackground() {
  const { height, width } = useWindowDimensions();
  const orbitSize = Math.min(Math.max(width * 1.08, 370), 720);
  const nebulaSize = Math.min(Math.max(width * 1.2, 440), 820);
  const horizonWidth = Math.min(Math.max(width * 1.75, 620), 1180);
  const horizonHeight = horizonWidth * 0.32;

  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      pointerEvents="none"
      style={styles.background}
    >
      <View
        style={[
          styles.nebula,
          styles.nebulaViolet,
          {
            borderRadius: nebulaSize / 2,
            height: nebulaSize,
            left: -nebulaSize * 0.5,
            top: -nebulaSize * 0.48,
            width: nebulaSize,
          },
        ]}
      />
      <View
        style={[
          styles.nebula,
          styles.nebulaCyan,
          {
            borderRadius: nebulaSize * 0.34,
            height: nebulaSize * 0.68,
            right: -nebulaSize * 0.45,
            top: height * 0.3,
            width: nebulaSize * 0.68,
          },
        ]}
      />

      {stars.map((star, index) => (
        <View
          key={`${String(star.top)}-${String(star.left)}`}
          style={[
            styles.star,
            {
              backgroundColor: star.color ?? colors.textPrimary,
              height: star.size,
              left: star.left,
              opacity: star.opacity,
              top: star.top,
              width: star.size,
            },
            index % 4 === 0 && styles.starGlow,
          ]}
        />
      ))}

      <View
        style={[
          styles.orbit,
          {
            borderRadius: orbitSize / 2,
            height: orbitSize,
            right: -orbitSize * 0.56,
            top: height * 0.1,
            transform: [{ rotate: '-13deg' }],
            width: orbitSize,
          },
        ]}
      />
      <View
        style={[
          styles.orbit,
          styles.orbitInner,
          {
            borderRadius: orbitSize * 0.37,
            height: orbitSize * 0.74,
            right: -orbitSize * 0.4,
            top: height * 0.19,
            transform: [{ rotate: '18deg' }],
            width: orbitSize * 0.74,
          },
        ]}
      />

      <View style={styles.grid}>
        {gridLines.map((left) => (
          <View key={left} style={[styles.gridVertical, { left }]} />
        ))}
        <View style={[styles.gridHorizontal, { top: '18%' }]} />
        <View style={[styles.gridHorizontal, { top: '48%' }]} />
        <View style={[styles.gridHorizontal, { top: '78%' }]} />
      </View>

      <View
        style={[
          styles.horizon,
          {
            borderRadius: horizonWidth / 2,
            bottom: -horizonHeight * 0.72,
            height: horizonHeight,
            left: (width - horizonWidth) / 2,
            width: horizonWidth,
          },
        ]}
      />
      <View style={styles.scanLine} />
    </View>
  );
}

const styles = StyleSheet.create({
  background: {
    backgroundColor: colors.background,
    bottom: 0,
    left: 0,
    overflow: 'hidden',
    position: 'absolute',
    right: 0,
    top: 0,
  },
  grid: {
    bottom: 0,
    height: '29%',
    left: 0,
    opacity: 0.25,
    position: 'absolute',
    right: 0,
  },
  gridHorizontal: {
    backgroundColor: colors.border,
    height: StyleSheet.hairlineWidth,
    left: 0,
    position: 'absolute',
    right: 0,
  },
  gridVertical: {
    backgroundColor: colors.border,
    bottom: 0,
    position: 'absolute',
    top: 0,
    width: StyleSheet.hairlineWidth,
  },
  horizon: {
    backgroundColor: colors.cyanGlow,
    borderColor: colors.borderStrong,
    borderWidth: 1,
    position: 'absolute',
    shadowColor: colors.cyan,
    shadowOpacity: 0.2,
    shadowRadius: 26,
  },
  nebula: {
    position: 'absolute',
  },
  nebulaCyan: {
    backgroundColor: colors.cyanGlow,
    opacity: 0.27,
  },
  nebulaViolet: {
    backgroundColor: colors.violetGlow,
    opacity: 0.38,
  },
  orbit: {
    borderColor: colors.border,
    borderWidth: StyleSheet.hairlineWidth,
    position: 'absolute',
  },
  orbitInner: {
    borderColor: 'rgba(168, 132, 255, 0.2)',
  },
  scanLine: {
    backgroundColor: colors.border,
    height: StyleSheet.hairlineWidth,
    left: 0,
    opacity: 0.4,
    position: 'absolute',
    right: 0,
    top: '52%',
  },
  star: {
    borderRadius: radii.pill,
    position: 'absolute',
  },
  starGlow: {
    shadowColor: colors.cyan,
    shadowOpacity: 0.7,
    shadowRadius: 5,
  },
});
