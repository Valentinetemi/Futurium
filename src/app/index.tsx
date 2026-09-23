import { StyleSheet, Text, View } from 'react-native';

export default function HomeRoute() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Futurium</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    backgroundColor: '#050816',
    flex: 1,
    justifyContent: 'center',
  },
  title: {
    color: '#ffffff',
    fontSize: 40,
    fontWeight: '700',
  },
});
