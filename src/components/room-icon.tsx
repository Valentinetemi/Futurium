import { StyleSheet, View } from 'react-native';

import { colors, radii } from '@/constants/theme';

type RoomIconProps = {
  size?: number;
};

// A plain room outline with a doorway: used where no retained frame exists.
export function RoomIcon({ size = 64 }: RoomIconProps) {
  const roomWidth = Math.round(size * 0.44);
  const roomHeight = Math.round(size * 0.36);

  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[styles.tile, { height: size, width: size }]}
    >
      <View style={[styles.room, { height: roomHeight, width: roomWidth }]}>
        <View
          style={[
            styles.door,
            {
              height: Math.round(roomHeight * 0.55),
              width: Math.round(roomWidth * 0.28),
            },
          ]}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  door: {
    borderColor: colors.secondaryBlue,
    borderLeftWidth: 1.5,
    borderRightWidth: 1.5,
    borderTopWidth: 1.5,
  },
  room: {
    alignItems: 'center',
    borderColor: colors.secondaryBlue,
    borderWidth: 1.5,
    justifyContent: 'flex-end',
  },
  tile: {
    alignItems: 'center',
    backgroundColor: colors.softBlue,
    borderRadius: radii.sm,
    justifyContent: 'center',
  },
});
