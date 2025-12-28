// Storage Facade - Re-exports all storage-related functionality
// This file provides backward compatibility by aggregating focused modules

// Shop Status Management
import { resetShopStatuses as resetShopStatusesInternal } from './shopStatus';

export {
  getShopStatusMap,
  getShopStatus,
  setShopStatus,
  resetShopStatuses,
  type ShopStatus,
  type ShopStatusMap,
} from './shopStatus';

// User Preferences
export {
  getUserName,
  saveUserName,
  initUserName,
} from './userPreferences';

// Filter State
export {
  saveFilterState,
  getFilterState,
  type FilterState,
} from './filterState';

// Legacy storage keys (kept for reference)
export const STORAGE_KEYS = {
  STATUS_MAP: 'shop_status_map',
  USER_NAME: 'user_name',
  FILTER_STATE: 'passport_filter_state',
  // Legacy keys
  LEGACY_VISITED: 'visited_shops',
  LEGACY_FAVORITE: 'favorite_shops',
  LEGACY_DISLIKE: 'disliked_shops',
};

// Reset all data (composite operation)
export function resetAllData(): void {
  resetShopStatusesInternal();
  localStorage.removeItem(STORAGE_KEYS.FILTER_STATE);
  // Also clear legacy data
  localStorage.removeItem('visited_shops');
  localStorage.removeItem('favorite_shops');
  localStorage.removeItem('disliked_shops');
}
