/**
 * Calculate last update date for a client from progress data
 * @param {Object} progressData - The progress data object
 * @returns {Object} { lastUpdateDate: Date|null, daysAgo: number, isOverdue: boolean }
 */
export const getLastUpdateInfo = (progressData) => {
  if (!progressData) {
    return { lastUpdateDate: null, daysAgo: Infinity, isOverdue: true };
  }

  // Get all stage update timestamps, excluding 'delivered' and 'clientId'
  const timestamps = [];
  const stages = ['Lead', 'firstContact', 'followUp', 'RFQ', 'quote', 'quoteFollowUp', 'order'];

  stages.forEach((stage) => {
    const stageData = progressData[stage];
    if (stageData && stageData.updatedAt) {
      timestamps.push(new Date(stageData.updatedAt).getTime());
    }
  });

  if (timestamps.length === 0) {
    return { lastUpdateDate: null, daysAgo: Infinity, isOverdue: true };
  }

  const lastTimestamp = Math.max(...timestamps);
  const lastUpdateDate = new Date(lastTimestamp);
  const now = new Date();
  const diffMs = now.getTime() - lastUpdateDate.getTime();
  const daysAgo = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  return {
    lastUpdateDate,
    daysAgo,
    isOverdue: daysAgo >= 2, // Alert if 2+ days without update
  };
};

/**
 * Format days ago into human-readable string
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
 * Get notification badge style info
 * @param {boolean} isOverdue
 * @returns {Object} { color, bgColor, text }
 */
export const getNotificationStyle = (isOverdue) => {
  if (isOverdue) {
    return {
      color: '#e74c3c', // Red
      bgColor: '#fadbd8', // Light red
      text: 'Needs update',
    };
  }
  return {
    color: '#27ae60', // Green
    bgColor: '#d5f4e6', // Light green
    text: 'Updated',
  };
};
