// import { STORAGE_KEYS as OLD_KEYS } from './storage'; // Unused

export type ShopStatus = 'want' | 'visited' | 'like' | 'dislike';
export type ShopStatusMap = Record<string, ShopStatus>;

export const STORAGE_KEYS = {
    STATUS_MAP: 'shop_status_map',
    USER_NAME: 'user_name',
    FILTER_STATE: 'passport_filter_state',
    // Legacy keys kept for reference or one-time read
    LEGACY_VISITED: 'visited_shops',
    LEGACY_FAVORITE: 'favorite_shops',
    LEGACY_DISLIKE: 'disliked_shops'
};

const DEFAULT_USER_NAME = '台灣囡仔';

// Internal helper to get map
export function getShopStatusMap(): ShopStatusMap {
    try {
        const stored = localStorage.getItem(STORAGE_KEYS.STATUS_MAP);
        if (stored) return JSON.parse(stored);
    } catch (e) {
        console.error('Failed to parse status map', e);
    }
    return migrateLegacy();
}

function getStatusMap(): ShopStatusMap {
    return getShopStatusMap();
}

function saveStatusMap(map: ShopStatusMap) {
    localStorage.setItem(STORAGE_KEYS.STATUS_MAP, JSON.stringify(map));
}

function migrateLegacy(): ShopStatusMap {
    const map: ShopStatusMap = {};
    
    // Helper to safely read array
    const read = (key: string): string[] => {
        try {
            return JSON.parse(localStorage.getItem(key) || '[]');
        } catch { return []; }
    };

    const visited = read('visited_shops');
    const favorites = read('favorite_shops');
    const disliked = read('disliked_shops');

    // Priority: Like > Dislike > Visited
    // We process lower priority first so higher priority overwrites
    visited.forEach(id => map[id] = 'visited');
    disliked.forEach(id => map[id] = 'dislike');
    favorites.forEach(id => map[id] = 'like'); 
    
    // 'want' didn't exist

    // Save migrated
    saveStatusMap(map);
    return map;
}

export function getShopStatus(id: string): ShopStatus | null {
    const map = getStatusMap();
    return map[id] || null;
}

export function setShopStatus(id: string, status: ShopStatus | null) {
    const map = getStatusMap();
    if (!status) {
        delete map[id];
    } else {
        map[id] = status;
    }
    saveStatusMap(map);
}

// Adapters for backward compatibility
export function getVisitedShops(): string[] {
    const map = getStatusMap();
    // Visited includes: visited, like, dislike
    return Object.entries(map)
        .filter(([_, status]) => status === 'visited' || status === 'like' || status === 'dislike')
        .map(([id]) => id);
}

export function getFavoriteShops(): string[] {
    const map = getStatusMap();
    return Object.entries(map)
        .filter(([_, status]) => status === 'like')
        .map(([id]) => id);
}

export function getDislikedShops(): string[] {
    const map = getStatusMap();
    return Object.entries(map)
        .filter(([_, status]) => status === 'dislike')
        .map(([id]) => id);
}

// Write adapters (redirect to new logic)
export function addVisitedShop(id: string): string[] {
    // If upgrading from 'none' or 'want' to 'visited'. 
    // If already 'like' or 'dislike', do we downgrade? 
    // Classic "toggle" behavior usually just adds. 
    // But since this function is deprecated for UI use, we can just ensure it is AT LEAST 'visited'.
    const current = getShopStatus(id);
    if (current !== 'like' && current !== 'dislike') {
        setShopStatus(id, 'visited');
    }
    return getVisitedShops();
}

export function removeVisitedShop(id: string): string[] {
    setShopStatus(id, null);
    return getVisitedShops();
}

export function toggleFavoriteShop(id: string): string[] {
    const current = getShopStatus(id);
    if (current === 'like') {
        // Revert to visited if it was liked? Or just remove like?
        // Usually un-liking keeps it visited if it was visited. 
        // But in strict 5-stage, if I am 'like' and I toggle 'like' off, what do I become?
        // 'visited' seems safe default for "Un-like". 
        // Or if I was never visited?
        // Let's assume toggle off -> 'visited'.
        setShopStatus(id, 'visited');
    } else {
        setShopStatus(id, 'like');
    }
    return getFavoriteShops();
}

export function toggleDislikedShop(id: string): string[] {
    const current = getShopStatus(id);
    if (current === 'dislike') {
        setShopStatus(id, 'visited');
    } else {
        setShopStatus(id, 'dislike');
    }
    return getDislikedShops();
}

// User Name functions (Unchanged)
export function getUserName(): string {
    return localStorage.getItem(STORAGE_KEYS.USER_NAME) || DEFAULT_USER_NAME;
}

export function saveUserName(name: string): void {
    localStorage.setItem(STORAGE_KEYS.USER_NAME, name);
}

export function initUserName(): void {
    if (!localStorage.getItem(STORAGE_KEYS.USER_NAME)) {
        localStorage.setItem(STORAGE_KEYS.USER_NAME, DEFAULT_USER_NAME);
    }
}

export function resetAllData(): void {
    localStorage.removeItem(STORAGE_KEYS.STATUS_MAP);
    localStorage.removeItem(STORAGE_KEYS.FILTER_STATE);
    // Also clear legacy to be sure
    localStorage.removeItem('visited_shops');
    localStorage.removeItem('favorite_shops');
    localStorage.removeItem('disliked_shops');
}

// Filter State Interface
export interface FilterState {
    mode: string;
    selectedCategories: string[];
    locationFilter: string;
    searchQuery: string;
    visibleStatuses: string[];
}

// Save filter state
export function saveFilterState(state: FilterState): void {
    localStorage.setItem(STORAGE_KEYS.FILTER_STATE, JSON.stringify(state));
}

// Load filter state
export function getFilterState(): FilterState | null {
    try {
        const stored = localStorage.getItem(STORAGE_KEYS.FILTER_STATE);
        if (stored) return JSON.parse(stored);
    } catch (e) {
        console.error('Failed to parse filter state', e);
    }
    return null;
}
