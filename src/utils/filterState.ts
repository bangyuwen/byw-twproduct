const STORAGE_KEY = 'passport_filter_state';

export interface FilterState {
  mode: string;
  selectedCategories: string[];
  locationFilter: string;
  searchQuery: string;
  visibleStatuses: string[];
}

// Save filter state
export function saveFilterState(state: FilterState): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

// Load filter state
export function getFilterState(): FilterState | null {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) return JSON.parse(stored);
  } catch (e) {
    console.error('Failed to parse filter state', e);
  }
  return null;
}
