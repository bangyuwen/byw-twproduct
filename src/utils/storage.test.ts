import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  getShopStatus,
  setShopStatus,
  getShopStatusMap,
  getUserName,
  saveUserName,
  initUserName,
  saveFilterState,
  getFilterState,
  resetAllData,
  type ShopStatus,
  type FilterState,
} from './storage';

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};

  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value;
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
})();

// Replace global localStorage
Object.defineProperty(globalThis, 'localStorage', {
  value: localStorageMock,
  writable: true,
});

describe('Shop Status Management', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('should set and get shop status', () => {
    setShopStatus('shop1', 'like');
    expect(getShopStatus('shop1')).toBe('like');
  });

  it('should return null for non-existent shop', () => {
    expect(getShopStatus('nonexistent')).toBeNull();
  });

  it('should delete status when set to null', () => {
    setShopStatus('shop1', 'like');
    expect(getShopStatus('shop1')).toBe('like');

    setShopStatus('shop1', null);
    expect(getShopStatus('shop1')).toBeNull();
  });

  it('should persist status to localStorage', () => {
    setShopStatus('shop1', 'visited');
    setShopStatus('shop2', 'want');

    const map = getShopStatusMap();
    expect(map['shop1']).toBe('visited');
    expect(map['shop2']).toBe('want');
  });

  it('should handle multiple status types', () => {
    const statuses: ShopStatus[] = ['want', 'visited', 'like', 'dislike'];

    statuses.forEach((status, idx) => {
      setShopStatus(`shop${idx}`, status);
    });

    statuses.forEach((status, idx) => {
      expect(getShopStatus(`shop${idx}`)).toBe(status);
    });
  });

  it('should overwrite existing status', () => {
    setShopStatus('shop1', 'want');
    expect(getShopStatus('shop1')).toBe('want');

    setShopStatus('shop1', 'visited');
    expect(getShopStatus('shop1')).toBe('visited');
  });
});

describe('Legacy Migration', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('should migrate visited_shops array to status map', () => {
    localStorage.setItem('visited_shops', JSON.stringify(['shop1', 'shop2']));

    const map = getShopStatusMap();
    expect(map['shop1']).toBe('visited');
    expect(map['shop2']).toBe('visited');
  });

  it('should migrate favorite_shops with like status', () => {
    localStorage.setItem('favorite_shops', JSON.stringify(['shop1']));

    const map = getShopStatusMap();
    expect(map['shop1']).toBe('like');
  });

  it('should migrate disliked_shops with dislike status', () => {
    localStorage.setItem('disliked_shops', JSON.stringify(['shop1']));

    const map = getShopStatusMap();
    expect(map['shop1']).toBe('dislike');
  });

  it('should prioritize like > dislike > visited', () => {
    // Set shop1 in all three legacy stores
    localStorage.setItem('visited_shops', JSON.stringify(['shop1']));
    localStorage.setItem('disliked_shops', JSON.stringify(['shop1']));
    localStorage.setItem('favorite_shops', JSON.stringify(['shop1']));

    const map = getShopStatusMap();
    // Like should win (highest priority)
    expect(map['shop1']).toBe('like');
  });

  it('should handle empty legacy data', () => {
    localStorage.setItem('visited_shops', JSON.stringify([]));

    const map = getShopStatusMap();
    expect(Object.keys(map).length).toBe(0);
  });

  it('should handle corrupted legacy data gracefully', () => {
    localStorage.setItem('visited_shops', 'invalid json');

    const map = getShopStatusMap();
    expect(Object.keys(map).length).toBe(0);
  });

  it('should only migrate once then use status map', () => {
    localStorage.setItem('visited_shops', JSON.stringify(['shop1']));

    // First call migrates
    const map1 = getShopStatusMap();
    expect(map1['shop1']).toBe('visited');

    // Modify legacy data
    localStorage.setItem('visited_shops', JSON.stringify(['shop1', 'shop2']));

    // Second call should use cached status map, not re-migrate
    const map2 = getShopStatusMap();
    expect(map2['shop2']).toBeUndefined(); // shop2 not in migrated map
  });
});

describe('Filter State Persistence', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('should save filter state to localStorage', () => {
    const state: FilterState = {
      mode: 'all',
      selectedCategories: ['Food', 'Coffee'],
      locationFilter: 'Taipei',
      searchQuery: 'test',
      visibleStatuses: ['visited', 'like'],
    };

    saveFilterState(state);

    const saved = localStorage.getItem('passport_filter_state');
    expect(saved).not.toBeNull();
    expect(JSON.parse(saved!)).toEqual(state);
  });

  it('should load saved filter state', () => {
    const state: FilterState = {
      mode: 'recommend',
      selectedCategories: ['Food'],
      locationFilter: 'all',
      searchQuery: '',
      visibleStatuses: ['want', 'none'],
    };

    saveFilterState(state);
    const loaded = getFilterState();

    expect(loaded).toEqual(state);
  });

  it('should return null for missing filter state', () => {
    expect(getFilterState()).toBeNull();
  });

  it('should handle corrupted filter state JSON', () => {
    localStorage.setItem('passport_filter_state', 'invalid json');

    expect(getFilterState()).toBeNull();
  });

  it('should preserve all filter properties', () => {
    const state: FilterState = {
      mode: 'visited',
      selectedCategories: ['Food', 'Coffee', 'Dessert'],
      locationFilter: 'Kaohsiung',
      searchQuery: 'coffee shop',
      visibleStatuses: ['visited', 'like', 'dislike'],
    };

    saveFilterState(state);
    const loaded = getFilterState();

    expect(loaded?.mode).toBe(state.mode);
    expect(loaded?.selectedCategories).toEqual(state.selectedCategories);
    expect(loaded?.locationFilter).toBe(state.locationFilter);
    expect(loaded?.searchQuery).toBe(state.searchQuery);
    expect(loaded?.visibleStatuses).toEqual(state.visibleStatuses);
  });
});

describe('User Name Management', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('should initialize with default name', () => {
    initUserName();
    expect(getUserName()).toBe('台灣囡仔');
  });

  it('should save and retrieve user name', () => {
    saveUserName('測試使用者');
    expect(getUserName()).toBe('測試使用者');
  });

  it('should not overwrite existing name on init', () => {
    saveUserName('Custom Name');
    initUserName();
    expect(getUserName()).toBe('Custom Name');
  });

  it('should return default when no name saved', () => {
    expect(getUserName()).toBe('台灣囡仔');
  });
});

describe('Reset All Data', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('should clear all storage data', () => {
    // Set up various data
    setShopStatus('shop1', 'like');
    saveFilterState({
      mode: 'all',
      selectedCategories: [],
      locationFilter: 'all',
      searchQuery: '',
      visibleStatuses: [],
    });
    saveUserName('Test User');

    // Reset
    resetAllData();

    // Check status map is cleared
    const map = getShopStatusMap();
    expect(Object.keys(map).length).toBe(0);

    // Check filter state is cleared
    expect(getFilterState()).toBeNull();

    // Note: User name is NOT cleared by resetAllData
    // This is intentional design - name persists across resets
  });

  it('should clear legacy data as well', () => {
    localStorage.setItem('visited_shops', JSON.stringify(['shop1']));
    localStorage.setItem('favorite_shops', JSON.stringify(['shop2']));
    localStorage.setItem('disliked_shops', JSON.stringify(['shop3']));

    resetAllData();

    expect(localStorage.getItem('visited_shops')).toBeNull();
    expect(localStorage.getItem('favorite_shops')).toBeNull();
    expect(localStorage.getItem('disliked_shops')).toBeNull();
  });
});
