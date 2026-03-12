import { StatusBar } from 'expo-status-bar';
import { View, StyleSheet, useColorScheme } from 'react-native';
import AppNavigator from './src/navigation/AppNavigator';
import Toast from './src/components/Toast';
import { ThemeProvider } from './src/context/ThemeContext';

export default function App() {
  const colorScheme = useColorScheme();

  return (
    <ThemeProvider>
      <View style={styles.container}>
        <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
        <AppNavigator />
        <Toast />
      </View>
    </ThemeProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
