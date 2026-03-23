# Background Progress Notifications Setup (Backend)

This guide gives you a ready-to-implement backend plan so notifications work even when the app is closed.

It is designed for your current logic:
- Notify when a client has no progress update for 2 or more days
- Ignore delivered clients
- Support org-based separation

---

## 1) Install packages

```bash
npm install expo-server-sdk node-cron
```

If not already installed:

```bash
npm install mongoose express
```

---

## 2) Data models

Create these Mongo models.

### 2.1 NotificationDevice model

Path suggestion: `src/models/NotificationDevice.js`

```js
const mongoose = require('mongoose');

const NotificationDeviceSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    orgId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', required: true, index: true },
    platform: { type: String, enum: ['android', 'ios'], required: true },
    expoPushToken: { type: String, required: true, index: true },
    isActive: { type: Boolean, default: true },
    lastSeenAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

NotificationDeviceSchema.index({ userId: 1, expoPushToken: 1 }, { unique: true });

module.exports = mongoose.model('NotificationDevice', NotificationDeviceSchema);
```

### 2.2 NotificationLog model (for dedupe)

Path suggestion: `src/models/NotificationLog.js`

```js
const mongoose = require('mongoose');

const NotificationLogSchema = new mongoose.Schema(
  {
    orgId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', required: true, index: true },
    clientId: { type: mongoose.Schema.Types.ObjectId, ref: 'Client', required: true, index: true },
    type: { type: String, enum: ['stale_progress'], required: true },
    dedupeKey: { type: String, required: true, unique: true, index: true },
    sentAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

module.exports = mongoose.model('NotificationLog', NotificationLogSchema);
```

---

## 3) Register mobile devices API

Create controller:
Path suggestion: `src/controllers/notificationController.js`

```js
const { Expo } = require('expo-server-sdk');
const NotificationDevice = require('../models/NotificationDevice');

const expo = new Expo();

exports.registerDevice = async (req, res) => {
  try {
    const userId = req.user._id;
    const orgId = req.user.organization;
    const { platform, expoPushToken } = req.body;

    if (!platform || !expoPushToken) {
      return res.status(400).json({ message: 'platform and expoPushToken are required' });
    }

    if (!Expo.isExpoPushToken(expoPushToken)) {
      return res.status(400).json({ message: 'Invalid Expo push token' });
    }

    const device = await NotificationDevice.findOneAndUpdate(
      { userId, expoPushToken },
      {
        userId,
        orgId,
        platform,
        expoPushToken,
        isActive: true,
        lastSeenAt: new Date(),
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    return res.json({ message: 'Device registered', data: device });
  } catch (error) {
    return res.status(500).json({ message: 'Failed to register device', error: error.message });
  }
};

exports.unregisterDevice = async (req, res) => {
  try {
    const userId = req.user._id;
    const { expoPushToken } = req.body;

    if (!expoPushToken) {
      return res.status(400).json({ message: 'expoPushToken is required' });
    }

    await NotificationDevice.findOneAndUpdate(
      { userId, expoPushToken },
      { isActive: false, lastSeenAt: new Date() }
    );

    return res.json({ message: 'Device unregistered' });
  } catch (error) {
    return res.status(500).json({ message: 'Failed to unregister device', error: error.message });
  }
};

exports.testNotification = async (req, res) => {
  try {
    const userId = req.user._id;
    const devices = await NotificationDevice.find({ userId, isActive: true }).lean();

    if (!devices.length) {
      return res.status(404).json({ message: 'No active device found' });
    }

    const messages = devices
      .filter((d) => Expo.isExpoPushToken(d.expoPushToken))
      .map((d) => ({
        to: d.expoPushToken,
        sound: 'default',
        title: 'Test reminder',
        body: 'Background notification is working.',
        data: { type: 'test' },
      }));

    const chunks = expo.chunkPushNotifications(messages);
    for (const chunk of chunks) {
      await expo.sendPushNotificationsAsync(chunk);
    }

    return res.json({ message: 'Test notification sent', count: messages.length });
  } catch (error) {
    return res.status(500).json({ message: 'Failed to send test notification', error: error.message });
  }
};
```

Create routes:
Path suggestion: `src/routes/notifications.js`

```js
const express = require('express');
const router = express.Router();
const {
  registerDevice,
  unregisterDevice,
  testNotification,
} = require('../controllers/notificationController');
const auth = require('../middleware/auth');

router.post('/register-device', auth, registerDevice);
router.delete('/register-device', auth, unregisterDevice);
router.post('/test', auth, testNotification);

module.exports = router;
```

Mount route in server:

```js
app.use('/notifications', require('./routes/notifications'));
```

---

## 4) Cron job for stale progress reminders

Create service:
Path suggestion: `src/services/staleProgressCron.js`

```js
const cron = require('node-cron');
const { Expo } = require('expo-server-sdk');
const NotificationDevice = require('../models/NotificationDevice');
const NotificationLog = require('../models/NotificationLog');
const Progress = require('../models/Progress');
const Client = require('../models/Client');

const expo = new Expo();
const MIN_DAYS_FOR_REMINDER = 2;

const stages = ['Lead', 'firstContact', 'followUp', 'RFQ', 'quote', 'quoteFollowUp', 'order'];

function toTs(value) {
  if (!value) return null;
  const d = new Date(value);
  const ts = d.getTime();
  return Number.isNaN(ts) ? null : ts;
}

function fromStageDate(value) {
  if (!value || typeof value !== 'string') return null;
  const normalized = value.replace(/\//g, '-');
  return toTs(normalized);
}

function getLastUpdateInfo(progressData) {
  const timestamps = [];

  for (const stage of stages) {
    const stageData = progressData?.[stage];
    if (!stageData) continue;

    const updatedAtTs = toTs(stageData.updatedAt);
    const dateTs = fromStageDate(stageData.date);

    if (updatedAtTs) timestamps.push(updatedAtTs);
    if (dateTs) timestamps.push(dateTs);
  }

  const docUpdatedAtTs = toTs(progressData?.updatedAt);
  const docCreatedAtTs = toTs(progressData?.createdAt);
  if (docUpdatedAtTs) timestamps.push(docUpdatedAtTs);
  if (docCreatedAtTs) timestamps.push(docCreatedAtTs);

  if (!timestamps.length) return { daysAgo: Infinity, isOverdue: true };

  const lastTs = Math.max(...timestamps);
  const daysAgo = Math.max(0, Math.floor((Date.now() - lastTs) / (1000 * 60 * 60 * 24)));

  return {
    daysAgo,
    isOverdue: daysAgo >= MIN_DAYS_FOR_REMINDER,
  };
}

function dayKeyUTC(date = new Date()) {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, '0');
  const d = String(date.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

async function sendStaleProgressNotifications() {
  const progresses = await Progress.find({ delivered: { $ne: true } })
    .populate('clientId', 'clientName organization')
    .lean();

  const groupedByOrg = new Map();

  for (const p of progresses) {
    const orgId = p?.clientId?.organization?.toString();
    const clientId = p?.clientId?._id?.toString();
    if (!orgId || !clientId) continue;

    const { isOverdue, daysAgo } = getLastUpdateInfo(p);
    if (!isOverdue) continue;

    if (!groupedByOrg.has(orgId)) groupedByOrg.set(orgId, []);
    groupedByOrg.get(orgId).push({
      clientId,
      clientName: p.clientId.clientName,
      daysAgo,
    });
  }

  for (const [orgId, staleClients] of groupedByOrg.entries()) {
    const activeDevices = await NotificationDevice.find({ orgId, isActive: true }).lean();
    if (!activeDevices.length) continue;

    for (const client of staleClients) {
      const dedupeKey = `${orgId}:${client.clientId}:stale_progress:${dayKeyUTC()}`;
      const alreadySent = await NotificationLog.findOne({ dedupeKey }).lean();
      if (alreadySent) continue;

      const messages = activeDevices
        .filter((d) => Expo.isExpoPushToken(d.expoPushToken))
        .map((d) => ({
          to: d.expoPushToken,
          sound: 'default',
          title: 'Progress reminder',
          body: `${client.clientName} has not been updated for ${client.daysAgo} day(s).`,
          data: {
            type: 'stale_progress',
            clientId: client.clientId,
          },
        }));

      if (!messages.length) continue;

      const chunks = expo.chunkPushNotifications(messages);
      const tickets = [];
      for (const chunk of chunks) {
        const ticketChunk = await expo.sendPushNotificationsAsync(chunk);
        tickets.push(...ticketChunk);
      }

      // Optional: if ticket has DeviceNotRegistered, mark that token inactive.
      await NotificationLog.create({
        orgId,
        clientId: client.clientId,
        type: 'stale_progress',
        dedupeKey,
        sentAt: new Date(),
      });

      // You can store tickets for deeper troubleshooting if needed.
      void tickets;
    }
  }
}

function startStaleProgressCron() {
  // Every hour
  cron.schedule('0 * * * *', async () => {
    try {
      await sendStaleProgressNotifications();
      console.log('[stale-progress-cron] run completed');
    } catch (err) {
      console.error('[stale-progress-cron] run failed', err);
    }
  });
}

module.exports = { startStaleProgressCron, sendStaleProgressNotifications };
```

Start cron from server bootstrap:

```js
const { startStaleProgressCron } = require('./services/staleProgressCron');

startStaleProgressCron();
```

---

## 5) Frontend payload to register token

You already have frontend notification permissions and local notifications.
Add one API call after obtaining Expo token:

```js
await api.post('/notifications/register-device', {
  platform: Platform.OS,
  expoPushToken,
});
```

On logout:

```js
await api.delete('/notifications/register-device', {
  data: { expoPushToken },
});
```

---

## 6) Security and org isolation checklist

- Always use authenticated user org from `req.user.organization`.
- Never accept `orgId` directly from request body.
- Notifications are sent only to active devices with matching `orgId`.
- Exclude delivered clients in the query (`delivered != true`).
- Use dedupe key so one client is not spammed repeatedly in the same day.

---

## 7) Quick test flow

1. Login mobile app and register device token.
2. Mark one client progress old enough (or manually edit DB date to > 2 days).
3. Run manual job once:

```js
await sendStaleProgressNotifications();
```

4. Verify push arrives while app is closed.
5. Verify no push for delivered clients.
6. Verify same client is not sent repeatedly in the same day.

---

## 8) Optional next improvements

- Add user preferences (`enabled`, `quietHours`, custom `staleDays`).
- Group multiple stale clients into one org-level message per run.
- Store Expo receipt IDs and process receipts to deactivate bad tokens.
- Add a dedicated worker process for cron in production hosting.

---

## 9) Common pitfalls

- Running cron only in API process that scales to zero.
- Not deduping notifications (causes spam).
- Sending to invalid Expo tokens without cleanup.
- Trusting orgId from client payload.

---

This file is intentionally practical so you can copy pieces directly and implement immediately.
