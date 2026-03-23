import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';

const LOCAL_REMINDER_IDS_KEY = 'localReminderNotificationIdsV1';
const DAILY_REMINDER_HOURS = [9, 11, 13, 15, 17];
const STATIC_REMINDER_TYPE = 'static_progress_reminder';

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
  if (Platform.OS === 'web') return false;

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

const getStoredReminderIds = async () => {
  try {
    const raw = await AsyncStorage.getItem(LOCAL_REMINDER_IDS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const setStoredReminderIds = async (ids) => {
  await AsyncStorage.setItem(LOCAL_REMINDER_IDS_KEY, JSON.stringify(ids));
};

const getCurrentScheduledIds = async () => {
  try {
    const scheduled = await Notifications.getAllScheduledNotificationsAsync();
    return new Set(scheduled.map((item) => item.identifier));
  } catch {
    return new Set();
  }
};

export const clearStaticDailyReminders = async () => {
  const ids = await getStoredReminderIds();
  for (const id of ids) {
    try {
      await Notifications.cancelScheduledNotificationAsync(id);
    } catch {
    }
  }
  await AsyncStorage.removeItem(LOCAL_REMINDER_IDS_KEY);
};

export const scheduleStaticDailyReminders = async () => {
  if (Platform.OS === 'web') {
    return { ok: false, reason: 'web-not-supported' };
  }

  const hasPermission = await ensureNotificationPermission();
  if (!hasPermission) {
    return { ok: false, reason: 'permission-not-granted' };
  }

  const existingIds = await getStoredReminderIds();
  if (existingIds.length === DAILY_REMINDER_HOURS.length) {
    const scheduledIdSet = await getCurrentScheduledIds();
    const allPresent = existingIds.every((id) => scheduledIdSet.has(id));
    if (allPresent) {
      return { ok: true, scheduledCount: existingIds.length, skipped: true };
    }
  }

  if (existingIds.length) {
    await clearStaticDailyReminders();
  }

  const scheduledIds = [];
  try {
    for (const hour of DAILY_REMINDER_HOURS) {
      const id = await Notifications.scheduleNotificationAsync({
        content: {
          title: 'Progress reminder',
          body: 'Please update your client progress today.',
          sound: true,
          data: { type: STATIC_REMINDER_TYPE, hour },
        },
        trigger: {
          hour,
          minute: 0,
          repeats: true,
          channelId: Platform.OS === 'android' ? 'progress-reminders' : undefined,
        },
      });
      scheduledIds.push(id);
    }
  } catch (error) {
    await clearStaticDailyReminders();
    return { ok: false, reason: 'schedule-failed', error: error?.message || 'unknown' };
  }

  await setStoredReminderIds(scheduledIds);
  return { ok: true, scheduledCount: scheduledIds.length, skipped: false };
};
