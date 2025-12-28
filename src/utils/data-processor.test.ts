import { describe, it, expect } from 'vitest';
import { DataProcessor } from './data-processor';
import type { Place } from '../types/place';

describe('DataProcessor', () => {
  const createMockPlace = (
    place_id: string,
    name: string,
    lat: number | string = 25.0,
    lng: number | string = 121.0
  ): Place => ({
    place_id,
    name,
    category: 'Food',
    description: `Description for ${name}`,
    url: `https://example.com/${place_id}`,
    lat,
    lng,
  });

  it('should deduplicate by place_id', () => {
    const processor = new DataProcessor();

    const place1 = createMockPlace('1', 'Shop A', 25.0, 121.0);
    const place1Dup = createMockPlace('1', 'Shop A', 25.1, 121.1);

    processor.addPlaces([place1], 'Source1');
    processor.addPlaces([place1Dup], 'Source2');

    const result = processor.getResult();
    expect(result.length).toBe(1);
    expect(result[0].place_id).toBe('1');
  });

  it('should deduplicate by coordinates (4 decimal precision)', () => {
    const processor = new DataProcessor();

    // Same coordinates within 11m precision
    const place1 = createMockPlace('1', 'Shop A', 25.033333, 121.566666);
    const place2 = createMockPlace('2', 'Shop B', 25.033334, 121.566667);

    processor.addPlaces([place1], 'Source1');
    processor.addPlaces([place2], 'Source2');

    const result = processor.getResult();
    // Should be deduplicated because coords round to same 4 decimal places
    expect(result.length).toBe(1);
  });

  it('should NOT deduplicate when coordinates differ significantly', () => {
    const processor = new DataProcessor();

    const place1 = createMockPlace('1', 'Shop A', 25.0, 121.0);
    const place2 = createMockPlace('2', 'Shop B', 25.1, 121.1);

    processor.addPlaces([place1], 'Source1');
    processor.addPlaces([place2], 'Source2');

    const result = processor.getResult();
    expect(result.length).toBe(2);
  });

  it('should aggregate source titles with middle dot', () => {
    const processor = new DataProcessor();

    const place1 = createMockPlace('1', 'Shop A');
    const place1Dup = createMockPlace('1', 'Shop A');

    processor.addPlaces([place1], 'Source1');
    processor.addPlaces([place1Dup], 'Source2');

    const result = processor.getResult();
    expect(result[0].source).toBe('Source1 · Source2');
  });

  it('should avoid duplicate source titles', () => {
    const processor = new DataProcessor();

    const place1 = createMockPlace('1', 'Shop A');
    const place1Dup = createMockPlace('1', 'Shop A');

    processor.addPlaces([place1], 'Source1');
    processor.addPlaces([place1Dup], 'Source1'); // Same source again

    const result = processor.getResult();
    // Should NOT be "Source1 · Source1"
    expect(result[0].source).toBe('Source1');
  });

  it('should merge properties on collision', () => {
    const processor = new DataProcessor();

    const place1 = createMockPlace('1', 'Shop A');
    place1.description = 'Original description';

    const place1Updated = createMockPlace('1', 'Shop A');
    place1Updated.description = 'Updated description';
    place1Updated.category = 'Coffee'; // New property

    processor.addPlaces([place1], 'Source1');
    processor.addPlaces([place1Updated], 'Source2');

    const result = processor.getResult();
    expect(result[0].description).toBe('Updated description');
    expect(result[0].category).toBe('Coffee');
  });

  it('should handle places without place_id (use name as key)', () => {
    const processor = new DataProcessor();

    const place1: Place = {
      place_id: '',
      name: 'Shop A',
      category: 'Food',
      description: 'Test',
      url: 'https://example.com',
      lat: 25.0,
      lng: 121.0,
    };

    const place1Dup: Place = {
      place_id: '',
      name: 'Shop A', // Same name
      category: 'Coffee',
      description: 'Test2',
      url: 'https://example.com',
      lat: 25.1,
      lng: 121.1,
    };

    processor.addPlaces([place1], 'Source1');
    processor.addPlaces([place1Dup], 'Source2');

    const result = processor.getResult();
    expect(result.length).toBe(1);
    expect(result[0].source).toBe('Source1 · Source2');
  });

  it('should handle places without coordinates', () => {
    const processor = new DataProcessor();

    const place1: Place = {
      place_id: '1',
      name: 'Shop A',
      category: 'Food',
      description: 'Test',
      url: 'https://example.com/1',
      lat: undefined as any,
      lng: undefined as any,
    };

    const place2: Place = {
      place_id: '2',
      name: 'Shop B',
      category: 'Food',
      description: 'Test',
      url: 'https://example.com/2',
      lat: undefined as any,
      lng: undefined as any,
    };

    processor.addPlaces([place1], 'Source1');
    processor.addPlaces([place2], 'Source2');

    const result = processor.getResult();
    expect(result.length).toBe(2);
  });

  it('should handle multiple sources for same place', () => {
    const processor = new DataProcessor();

    const place1 = createMockPlace('1', 'Shop A');

    processor.addPlaces([place1], 'Source1');
    processor.addPlaces([place1], 'Source2');
    processor.addPlaces([place1], 'Source3');

    const result = processor.getResult();
    expect(result.length).toBe(1);
    expect(result[0].source).toBe('Source1 · Source2 · Source3');
  });

  it('should handle empty places array', () => {
    const processor = new DataProcessor();

    processor.addPlaces([], 'Source1');

    const result = processor.getResult();
    expect(result.length).toBe(0);
  });

  it('should handle mixed unique and duplicate places', () => {
    const processor = new DataProcessor();

    const place1 = createMockPlace('1', 'Shop A', 25.0, 121.0);
    const place2 = createMockPlace('2', 'Shop B', 25.1, 121.1);
    const place3 = createMockPlace('3', 'Shop C', 25.2, 121.2);
    const place1Dup = createMockPlace('1', 'Shop A', 25.0, 121.0);

    processor.addPlaces([place1, place2], 'Source1');
    processor.addPlaces([place3, place1Dup], 'Source2');

    const result = processor.getResult();
    expect(result.length).toBe(3); // 3 unique places

    const shopA = result.find(p => p.place_id === '1');
    expect(shopA?.source).toBe('Source1 · Source2');

    const shopB = result.find(p => p.place_id === '2');
    expect(shopB?.source).toBe('Source1');

    const shopC = result.find(p => p.place_id === '3');
    expect(shopC?.source).toBe('Source2');
  });

  it('should preserve first source title in aggregate', () => {
    const processor = new DataProcessor();

    const place1 = createMockPlace('1', 'Shop A');

    processor.addPlaces([place1], 'Alpha');
    processor.addPlaces([place1], 'Beta');
    processor.addPlaces([place1], 'Gamma');

    const result = processor.getResult();
    const source = result[0].source!;

    expect(source.startsWith('Alpha')).toBe(true);
    expect(source).toContain('Beta');
    expect(source).toContain('Gamma');
  });

  it('should handle coordinate precision edge case', () => {
    const processor = new DataProcessor();

    // These should be considered different places (beyond 4 decimal precision)
    const place1 = createMockPlace('1', 'Shop A', 25.00001, 121.00001);
    const place2 = createMockPlace('2', 'Shop B', 25.00009, 121.00009);

    processor.addPlaces([place1], 'Source1');
    processor.addPlaces([place2], 'Source2');

    const result = processor.getResult();
    // At 4 decimal places: 25.0000 vs 25.0001 - different
    expect(result.length).toBe(2);
  });
});
