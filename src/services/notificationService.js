/**
 * Calculate last update date for a client from progress data.
 * @param {Object} progressData
 * @returns {{ lastUpdateDate: Date|null, daysAgo: number, isOverdue: boolean }}
 */
const MIN_DAYS_FOR_REMINDER = 2;

export const getLastUpdateInfo = (progressData) => {
  if (!progressData) {
    return { lastUpdateDate: null, daysAgo: Infinity, isOverdue: true };
  }

  const toTimestamp = (value) => {
    if (!value) return null;
    const date = new Date(value);
    const ts = date.getTime();
    return Number.isNaN(ts) ? null : ts;
  };

  const fromStageDate = (value) => {
    if (!value || typeof value !== 'string') return null;
    // Supports YYYY/MM/DD and YYYY-MM-DD formats
    const normalized = value.replace(/\//g, '-');
    return toTimestamp(normalized);
  };

  const timestamps = [];
  const stages = ['Lead', 'firstContact', 'followUp', 'RFQ', 'quote', 'quoteFollowUp', 'order'];

  stages.forEach((stage) => {
    const stageData = progressData[stage];
    if (!stageData) return;
    const stageUpdatedAtTs = toTimestamp(stageData.updatedAt);
    const stageDateTs = fromStageDate(stageData.date);
    if (stageUpdatedAtTs) timestamps.push(stageUpdatedAtTs);
    if (stageDateTs) timestamps.push(stageDateTs);
  });

  const docUpdatedAtTs = toTimestamp(progressData.updatedAt);
  const docCreatedAtTs = toTimestamp(progressData.createdAt);
  if (docUpdatedAtTs) timestamps.push(docUpdatedAtTs);
  if (docCreatedAtTs) timestamps.push(docCreatedAtTs);

  if (timestamps.length === 0) {
    return { lastUpdateDate: null, daysAgo: Infinity, isOverdue: true };
  }

  const lastTimestamp = Math.max(...timestamps);
  const lastUpdateDate = new Date(lastTimestamp);
  const now = new Date();
  const diffMs = now.getTime() - lastUpdateDate.getTime();
  const daysAgo = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));

  return {
    lastUpdateDate,
    daysAgo,
    isOverdue: daysAgo >= MIN_DAYS_FOR_REMINDER,
  };
};

/**
 * Format days ago into human-readable string.
 * @param {number} daysAgo
 * @returns {string}
 */
export const formatDaysAgo = (daysAgo) => {
  if (daysAgo === Infinity) return 'Never updated';
  if (daysAgo === 0) return 'Updated today';
  if (daysAgo === 1) return 'Updated yesterday';
  if (daysAgo < 7) return `Updated ${daysAgo} days ago`;
  const weeks = Math.floor(daysAgo / 7);
  return `Updated ${weeks} week${weeks > 1 ? 's' : ''} ago`;
};

/**
 * Get the overdue badge style.
 * FIX #11: Removed dead code — the green "Updated" style was computed but
 * never rendered anywhere (badge only shows when showReminder is true).
 * @param {boolean} isOverdue
 * @returns {{ color: string, bgColor: string, text: string }}
 */
export const getNotificationStyle = (isOverdue) => {
  if (isOverdue) {
    return {
      color: '#e74c3c',
      bgColor: '#fadbd8',
      text: 'Needs update',
    };
  }
  // Kept for API compatibility — returned but not visually rendered
  return {
    color: '#27ae60',
    bgColor: '#d5f4e6',
    text: 'Updated',
  };
};