/**
 * Centralized Feed Configuration
 */
export const FEED_CONFIG = {
  // Server-ranked page size — one Firebase-backed aggregation per page.
  // 100 filled several screens at once and made every "load more" heavy;
  // 20 matches the backend default and keeps prefetch cheap.
  BATCH_SIZE: 20,
  PREFETCH_THRESHOLD_PX: 600,
};

export const FEED_BATCH_SIZE = FEED_CONFIG.BATCH_SIZE;
export const FEED_PREFETCH_THRESHOLD_PX = FEED_CONFIG.PREFETCH_THRESHOLD_PX;

export default FEED_CONFIG;
