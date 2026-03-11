import { StatusBar } from 'expo-status-bar';
import { View, StyleSheet } from 'react-native';
import AppNavigator from './src/navigation/AppNavigator';
import Toast from './src/components/Toast';

export default function App() {
  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <AppNavigator />
      <Toast />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
