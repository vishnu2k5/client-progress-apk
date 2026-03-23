import { StatusBar } from 'expo-status-bar';
import { useEffect, useRef } from 'react';
import { View, StyleSheet, useColorScheme, AppState } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import AppNavigator from './src/navigation/AppNavigator';
import Toast from './src/components/Toast';
import { ThemeProvider } from './src/context/ThemeContext';
import { scheduleStaticDailyReminders } from './src/services/localNotifications';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export default function App() {
  const colorScheme = useColorScheme();
  const runningRef = useRef(false);

  useEffect(() => {
    const ensureRemindersForLoggedInUser = async () => {
      if (runningRef.current) return;
      runningRef.current = true;
      try {
        const token = await AsyncStorage.getItem('token');
        if (!token) return;
        await scheduleStaticDailyReminders();
      } catch {
      } finally {
        runningRef.current = false;
      }
    };

    ensureRemindersForLoggedInUser();

    const sub = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active') {
        ensureRemindersForLoggedInUser();
      }
    });

    return () => sub.remove();
  }, []);

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
