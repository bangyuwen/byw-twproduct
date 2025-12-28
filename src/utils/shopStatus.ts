export type ShopStatus = 'want' | 'visited' | 'like' | 'dislike';
export type ShopStatusMap = Record<string, ShopStatus>;

const STORAGE_KEY = 'shop_status_map';

// Internal helper to migrate legacy data
function migrateLegacy(): ShopStatusMap {
  const map: ShopStatusMap = {};

  // Helper to safely read array
  const read = (key: string): string[] => {
    try {
      return JSON.parse(localStorage.getItem(key) || '[]');
    } catch {
      return [];
    }
  };

  const visited = read('visited_shops');
  const favorites = read('favorite_shops');
  const disliked = read('disliked_shops');

  // Priority: Like > Dislike > Visited
  // Process lower priority first so higher priority overwrites
  visited.forEach(id => (map[id] = 'visited'));
  disliked.forEach(id => (map[id] = 'dislike'));
  favorites.forEach(id => (map[id] = 'like'));

  // Save migrated data
  saveStatusMap(map);
  return map;
}

// Internal save function
function saveStatusMap(map: ShopStatusMap): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
}

// Get the full shop status map
export function getShopStatusMap(): ShopStatusMap {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) return JSON.parse(stored);
  } catch (e) {
    console.error('Failed to parse status map', e);
  }
  return migrateLegacy();
}

// Get status for a single shop
export function getShopStatus(id: string): ShopStatus | null {
  const map = getShopStatusMap();
  return map[id] || null;
}

// Set status for a single shop
export function setShopStatus(id: string, status: ShopStatus | null): void {
  const map = getShopStatusMap();
  if (!status) {
    delete map[id];
  } else {
    map[id] = status;
  }
  saveStatusMap(map);
}

// Reset all shop statuses
export function resetShopStatuses(): void {
  localStorage.removeItem(STORAGE_KEY);
}
