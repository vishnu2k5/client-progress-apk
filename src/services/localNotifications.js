import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';

const LAST_STALE_NOTIFICATION_KEY = 'lastStaleNotificationAt';
const STALE_NOTIFICATION_COOLDOWN_MS = 6 * 60 * 60 * 1000; // 6 hours

const ensureAndroidChannel = async () => {
  if (Platform.OS !== 'android') return;

  await Notifications.setNotificationChannelAsync('progress-reminders', {
    name: 'Progress Reminders',
    importance: Notifications.AndroidImportance.HIGH,
    vibrationPattern: [0, 250, 150, 250],
    lightColor: '#ff4d4f',
  });
};

export const ensureNotificationPermission = async () => {
  const settings = await Notifications.getPermissionsAsync();
  let status = settings.status;

  if (status !== 'granted') {
    const requested = await Notifications.requestPermissionsAsync();
    status = requested.status;
  }

  if (status !== 'granted') return false;

  await ensureAndroidChannel();
  return true;
};

const canSendStaleNotification = async () => {
  const last = await AsyncStorage.getItem(LAST_STALE_NOTIFICATION_KEY);
  if (!last) return true;

  const lastTs = Number(last);
  if (Number.isNaN(lastTs)) return true;

  return Date.now() - lastTs > STALE_NOTIFICATION_COOLDOWN_MS;
};

export const notifyStaleProgress = async (staleCount) => {
  if (!staleCount || staleCount < 1) return;

  const allowed = await canSendStaleNotification();
  if (!allowed) return;

  const hasPermission = await ensureNotificationPermission();
  if (!hasPermission) return;

  await Notifications.scheduleNotificationAsync({
    content: {
      title: 'Progress reminder',
      body: `${staleCount} client${staleCount > 1 ? 's' : ''} need progress update`,
      sound: true,
      priority: Notifications.AndroidNotificationPriority.HIGH,
    },
    trigger: null,
  });

  await AsyncStorage.setItem(LAST_STALE_NOTIFICATION_KEY, String(Date.now()));
};
