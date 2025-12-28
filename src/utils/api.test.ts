import { describe, it, expect, beforeEach, vi } from 'vitest';
import { fetchAllShops } from './api';
import type { PlaceData } from '../types/place';

// Mock fetch globally
const mockFetch = vi.fn();
globalThis.fetch = mockFetch as any;

describe('fetchAllShops', () => {
  beforeEach(() => {
    mockFetch.mockClear();
    vi.clearAllMocks();
  });

  const createMockPlace = (id: string, name: string, category: string, lat = '25.0', lng = '121.0') => ({
    place_id: id,
    name,
    category,
    description: `Description for ${name}`,
    url: `https://example.com/${id}`,
    lat: lat as any,
    lng: lng as any,
  });

  const createMockResponse = (data: PlaceData, ok = true, statusText = 'OK') => ({
    ok,
    statusText,
    json: async () => data,
  });

  it('should fetch and merge all data sources', async () => {
    const gluttonyData: PlaceData = {
      title: '饕餮名單',
      places: [createMockPlace('1', 'Shop A', 'Food', '25.0', '121.0')],
    };

    const islandData: PlaceData = {
      title: '島國',
      places: [createMockPlace('2', 'Shop B', 'Coffee', '25.1', '121.1')],
    };

    const supportData: PlaceData = {
      title: '支持',
      places: [createMockPlace('3', 'Shop C', 'Dessert', '25.2', '121.2')],
    };

    const babyData: PlaceData = {
      title: '寶寶',
      places: [createMockPlace('4', 'Shop D', 'Food', '25.3', '121.3')],
    };

    mockFetch.mockResolvedValueOnce(createMockResponse(gluttonyData));
    mockFetch.mockResolvedValueOnce(createMockResponse(islandData));
    mockFetch.mockResolvedValueOnce(createMockResponse(supportData));
    mockFetch.mockResolvedValueOnce(createMockResponse(babyData));

    const result = await fetchAllShops();

    expect(result.title).toBe('饕餮名單');
    expect(result.places.length).toBe(4);
    expect(result.places.map(p => p.place_id)).toContain('1');
    expect(result.places.map(p => p.place_id)).toContain('2');
    expect(result.places.map(p => p.place_id)).toContain('3');
    expect(result.places.map(p => p.place_id)).toContain('4');
  });

  it('should throw error when gluttony data fails', async () => {
    mockFetch.mockResolvedValueOnce(createMockResponse({} as PlaceData, false, 'Not Found'));

    await expect(fetchAllShops()).rejects.toThrow('Failed to fetch gluttony data: Not Found');
  });

  it('should handle missing island data gracefully', async () => {
    const gluttonyData: PlaceData = {
      title: '饕餮名單',
      places: [createMockPlace('1', 'Shop A', 'Food')],
    };

    mockFetch.mockResolvedValueOnce(createMockResponse(gluttonyData));
    mockFetch.mockResolvedValueOnce(createMockResponse({} as PlaceData, false, 'Not Found'));
    mockFetch.mockResolvedValueOnce(createMockResponse({ title: '支持', places: [] }));
    mockFetch.mockResolvedValueOnce(createMockResponse({ title: '寶寶', places: [] }));

    const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    const result = await fetchAllShops();

    expect(result.places.length).toBe(1);
    expect(result.places[0].place_id).toBe('1');
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Failed to fetch island data'));

    consoleSpy.mockRestore();
  });

  it('should handle multiple optional sources failing', async () => {
    const gluttonyData: PlaceData = {
      title: '饕餮名單',
      places: [createMockPlace('1', 'Shop A', 'Food')],
    };

    mockFetch.mockResolvedValueOnce(createMockResponse(gluttonyData));
    mockFetch.mockResolvedValueOnce(createMockResponse({} as PlaceData, false, 'Island Error'));
    mockFetch.mockResolvedValueOnce(createMockResponse({} as PlaceData, false, 'Support Error'));
    mockFetch.mockResolvedValueOnce(createMockResponse({} as PlaceData, false, 'Baby Error'));

    const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    const result = await fetchAllShops();

    expect(result.places.length).toBe(1);
    expect(consoleSpy).toHaveBeenCalledTimes(3);

    consoleSpy.mockRestore();
  });

  it('should deduplicate places across sources', async () => {
    const duplicatePlace = createMockPlace('1', 'Duplicate Shop', 'Food');

    const gluttonyData: PlaceData = {
      title: '饕餮名單',
      places: [duplicatePlace],
    };

    const islandData: PlaceData = {
      title: '島國',
      places: [duplicatePlace], // Same place_id
    };

    mockFetch.mockResolvedValueOnce(createMockResponse(gluttonyData));
    mockFetch.mockResolvedValueOnce(createMockResponse(islandData));
    mockFetch.mockResolvedValueOnce(createMockResponse({ title: '支持', places: [] }));
    mockFetch.mockResolvedValueOnce(createMockResponse({ title: '寶寶', places: [] }));

    const result = await fetchAllShops();

    // Should only have 1 place, not 2 (deduplicated)
    expect(result.places.length).toBe(1);
    expect(result.places[0].place_id).toBe('1');
  });

  it('should aggregate source titles for duplicates', async () => {
    const duplicatePlace = createMockPlace('1', 'Duplicate Shop', 'Food');

    const gluttonyData: PlaceData = {
      title: '饕餮名單',
      places: [duplicatePlace],
    };

    const islandData: PlaceData = {
      title: '島國',
      places: [duplicatePlace],
    };

    mockFetch.mockResolvedValueOnce(createMockResponse(gluttonyData));
    mockFetch.mockResolvedValueOnce(createMockResponse(islandData));
    mockFetch.mockResolvedValueOnce(createMockResponse({ title: '支持', places: [] }));
    mockFetch.mockResolvedValueOnce(createMockResponse({ title: '寶寶', places: [] }));

    const result = await fetchAllShops();

    expect(result.places[0].source).toContain('饕餮名單');
    expect(result.places[0].source).toContain('島國');
    expect(result.places[0].source).toContain(' · ');
  });

  it('should use correct fetch URLs', async () => {
    const mockData: PlaceData = { title: 'Test', places: [] };

    mockFetch.mockResolvedValue(createMockResponse(mockData));

    await fetchAllShops();

    expect(mockFetch).toHaveBeenCalledWith('/byw-mit/lists/gluttony.json');
    expect(mockFetch).toHaveBeenCalledWith('/byw-mit/lists/island.json');
    expect(mockFetch).toHaveBeenCalledWith('/byw-mit/lists/support.json');
    expect(mockFetch).toHaveBeenCalledWith('/byw-mit/lists/baby.json');
    expect(mockFetch).toHaveBeenCalledTimes(4);
  });

  it('should handle empty places arrays', async () => {
    const emptyData: PlaceData = {
      title: '饕餮名單',
      places: [],
    };

    mockFetch.mockResolvedValue(createMockResponse(emptyData));

    const result = await fetchAllShops();

    expect(result.places.length).toBe(0);
    expect(result.title).toBe('饕餮名單');
  });
});
