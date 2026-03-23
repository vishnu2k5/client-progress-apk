import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';

const EXPO_PUSH_TOKEN_KEY = 'expoPushToken';
const DEBUG_FALLBACK_EXPO_TOKEN = Constants?.expoConfig?.extra?.debugFallbackExpoToken || null;

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

const getProjectId = () => {
  const fromExpoConfig = Constants?.expoConfig?.extra?.eas?.projectId;
  const fromEasConfig = Constants?.easConfig?.projectId;
  return fromExpoConfig || fromEasConfig || undefined;
};

export const getStoredExpoPushToken = async () => AsyncStorage.getItem(EXPO_PUSH_TOKEN_KEY);

export const getExpoPushToken = async () => {
  try {
    console.log('[getExpoPushToken] Checking notification permission...');
    const hasPermission = await ensureNotificationPermission();
    if (!hasPermission) {
      console.log('[getExpoPushToken] BLOCKED: notification permission not granted');
      return null;
    }
    console.log('[getExpoPushToken] ✅ Permission granted, fetching token...');

    const projectId = getProjectId();
    console.log('[getExpoPushToken] ProjectId:', projectId);
    
    const tokenResponse = projectId
      ? await Notifications.getExpoPushTokenAsync({ projectId })
      : await Notifications.getExpoPushTokenAsync();

    const expoPushToken = tokenResponse?.data || null;
    console.log('[getExpoPushToken] Token response:', {
      hasToken: !!expoPushToken,
      tokenPreview: expoPushToken ? `${expoPushToken.slice(0, 20)}...` : 'null',
    });

    if (expoPushToken) {
      await AsyncStorage.setItem(EXPO_PUSH_TOKEN_KEY, expoPushToken);
      console.log('[getExpoPushToken] ✅ Token stored in AsyncStorage');
      return expoPushToken;
    }

    console.log('[getExpoPushToken] NULL: no token returned from Expo');
    return null;
  } catch (error) {
    console.error('[getExpoPushToken] ERROR:', {
      message: error?.message,
      code: error?.code,
    });
    return null;
  }
};

export const getRegistrationTokenForBackend = async () => {
  const storedToken = await getStoredExpoPushToken();
  if (storedToken) return storedToken;

  const expoToken = await getExpoPushToken();
  if (expoToken) return expoToken;

  const debugToken = typeof DEBUG_FALLBACK_EXPO_TOKEN === 'string'
    ? DEBUG_FALLBACK_EXPO_TOKEN.trim()
    : '';

  if (debugToken) {
    console.log('Using debug fallback push token for backend registration');
    return debugToken;
  }

  return null;
};

export const clearStoredExpoPushToken = async () => {
  await AsyncStorage.removeItem(EXPO_PUSH_TOKEN_KEY);
};
