const STORAGE_KEY = 'user_name';
const DEFAULT_USER_NAME = '台灣囡仔';

// Get user name
export function getUserName(): string {
  return localStorage.getItem(STORAGE_KEY) || DEFAULT_USER_NAME;
}

// Save user name
export function saveUserName(name: string): void {
  localStorage.setItem(STORAGE_KEY, name);
}

// Initialize user name (only if not already set)
export function initUserName(): void {
  if (!localStorage.getItem(STORAGE_KEY)) {
    localStorage.setItem(STORAGE_KEY, DEFAULT_USER_NAME);
  }
}
