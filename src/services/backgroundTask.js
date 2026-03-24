import * as BackgroundFetch from 'expo-background-fetch';
import * as TaskManager from 'expo-task-manager';
import { scheduleStaticDailyReminders } from './localNotifications';

export const BACKGROUND_NOTIFICATION_TASK = 'background-notification-refresh';

// ─── IMPORTANT ───────────────────────────────────────────────────────────────
// TaskManager.defineTask MUST be called at the TOP LEVEL of a file,
// outside any React component or function. It runs when the JS bundle
// first loads — even when the app is woken up in the background.
// If you put this inside a component, the background wakeup won't find it.
// ─────────────────────────────────────────────────────────────────────────────
TaskManager.defineTask(BACKGROUND_NOTIFICATION_TASK, async () => {
  try {
    const result = await scheduleStaticDailyReminders();
    console.log('[BackgroundTask] Notification refresh result:', result);
    return result.ok
      ? BackgroundFetch.BackgroundFetchResult.NewData
      : BackgroundFetch.BackgroundFetchResult.NoData;
  } catch (error) {
    console.error('[BackgroundTask] Failed:', error?.message);
    return BackgroundFetch.BackgroundFetchResult.Failed;
  }
});

/**
 * Call this once when the app starts (in AppNavigator useEffect).
 * It registers the background task with the OS so it runs periodically
 * even when the app is closed or after the phone reboots.
 */
export const registerBackgroundNotificationTask = async () => {
  try {
    // Check if already registered — don't register twice
    const isRegistered = await TaskManager.isTaskRegisteredAsync(BACKGROUND_NOTIFICATION_TASK);
    if (isRegistered) {
      console.log('[BackgroundTask] Already registered, skipping');
      return;
    }

    await BackgroundFetch.registerTaskAsync(BACKGROUND_NOTIFICATION_TASK, {
      minimumInterval: 60 * 60,  // Run at most every 1 hour (OS may run less often)
      stopOnTerminate: false,     // Android: keep running after app is swiped away
      startOnBoot: true,          // Android: reschedule after phone reboot
    });

    console.log('[BackgroundTask] Registered successfully');
  } catch (error) {
    // This is non-fatal — daily notifications still work if the app is opened once a day
    console.log('[BackgroundTask] Registration failed (non-fatal):', error?.message);
  }
};

/**
 * Call this on logout to clean up the background task.
 */
export const unregisterBackgroundNotificationTask = async () => {
  try {
    const isRegistered = await TaskManager.isTaskRegisteredAsync(BACKGROUND_NOTIFICATION_TASK);
    if (isRegistered) {
      await BackgroundFetch.unregisterTaskAsync(BACKGROUND_NOTIFICATION_TASK);
      console.log('[BackgroundTask] Unregistered');
    }
  } catch (error) {
    console.log('[BackgroundTask] Unregister failed:', error?.message);
  }
};