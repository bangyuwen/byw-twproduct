#!/usr/bin/env node

/**
 * Refresh data from Google Sheets
 *
 * Usage: npm run refresh-data
 *
 * Fetches all configured sheet tabs and saves them as JSON files.
 * Uses Google Sheets API v4.
 *
 * Required environment variables (in .env file):
 * - SPREADSHEET_ID: Google Sheets document ID
 * - GOOGLE_API_KEY: Google API key with Sheets API enabled
 */

import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT_DIR = join(__dirname, '..');
const DATA_DIR = join(ROOT_DIR, 'src/data');

// Load .env file
try {
  const envFile = readFileSync(join(ROOT_DIR, '.env'), 'utf-8');
  for (const line of envFile.split('\n')) {
    const [key, ...valueParts] = line.split('=');
    if (key && valueParts.length) {
      process.env[key.trim()] = valueParts.join('=').trim();
    }
  }
} catch {
  // .env file not found, rely on environment variables
}

const SPREADSHEET_ID = process.env.SPREADSHEET_ID;
const API_KEY = process.env.GOOGLE_API_KEY;

if (!SPREADSHEET_ID || !API_KEY) {
  console.error('Error: Missing required environment variables');
  console.error('Please create a .env file with:');
  console.error('  SPREADSHEET_ID=your_spreadsheet_id');
  console.error('  GOOGLE_API_KEY=your_api_key');
  process.exit(1);
}

// Sheet tabs to fetch
// sheetName: tab name in Google Sheets
// outputName: English filename for output JSON
const SHEETS = [
  { sheetName: 'MIT產品', outputName: 'products' },
  { sheetName: '友善店家', outputName: 'stores' },
  { sheetName: 'Art / 攝影師', outputName: 'artists' },
  { sheetName: 'Ent / 歌手', outputName: 'singers' },
  { sheetName: 'Ent / 演員', outputName: 'actors' },
  { sheetName: 'Misc / 台派綜合', outputName: 'misc' },
];

/**
 * Fetch sheet data using Google Sheets API v4
 */
async function fetchSheetData(sheetName) {
  const encodedSheet = encodeURIComponent(sheetName);
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${encodedSheet}?key=${API_KEY}`;

  const response = await fetch(url);

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to fetch sheet "${sheetName}": ${response.status} - ${error}`);
  }

  const data = await response.json();
  return data.values || [];
}

/**
 * Convert sheet values array to objects using first row as headers
 */
function valuesToObjects(values) {
  if (values.length < 2) return [];

  const headers = values[0];
  return values.slice(1).map(row => {
    const obj = {};
    headers.forEach((header, i) => {
      obj[header] = row[i] || '';
    });
    return obj;
  });
}

/**
 * Clean URL - ensure proper format
 */
function cleanUrl(url) {
  if (!url || url === '請自己上網找' || url === '請自己找' || url.includes('Self-search')) {
    return null;
  }
  url = url.trim();
  if (url && !url.startsWith('http')) {
    if (url.match(/\.(com|tw|net|org|co)/)) {
      return `https://${url}`;
    }
  }
  return url || null;
}

/**
 * Transform row data to consistent format
 */
function transformRow(row) {
  const result = {};

  // Map Chinese column names to English keys
  const mapping = {
    '類別': 'category',
    '項目': 'item',
    '品牌': 'brand',
    '連結': 'website',
    '推薦理由': 'reason',
    '備註': 'notes',
    '名稱': 'name',
    '產業': 'industry',
    '說明': 'description',
    '網站': 'website',
    '頻道': 'channel',
    '推薦人': 'recommender',
  };

  for (const [zhKey, enKey] of Object.entries(mapping)) {
    if (row[zhKey]) {
      let value = row[zhKey];
      if (enKey === 'website' || enKey === 'channel') {
        value = cleanUrl(value);
      }
      // Convert recommender to is_recommender boolean (don't store the name)
      if (enKey === 'recommender') {
        result.is_recommender = true;
        continue;
      }
      if (value && value !== '請自己上網找') {
        result[enKey] = value;
      }
    }
  }

  // Generate name if not present but brand/item exist
  if (!result.name && (result.brand || result.item)) {
    result.name = `${result.brand || ''} ${result.item || ''}`.trim();
  }

  return result;
}

/**
 * Transform sheet data
 */
function transformSheet(rows) {
  return rows
    .map(transformRow)
    .filter(row => Object.keys(row).length > 0);
}

/**
 * Save data to JSON file
 */
function saveJSON(filename, data) {
  const filepath = join(DATA_DIR, filename);
  writeFileSync(filepath, JSON.stringify(data, null, 2) + '\n', 'utf-8');
  console.log(`  Saved ${data.length} items to ${filename}`);
}

/**
 * Main function
 */
async function main() {
  console.log('Refreshing data from Google Sheets...\n');

  for (const sheet of SHEETS) {
    const filename = `${sheet.outputName}.json`;
    console.log(`Processing: ${sheet.sheetName} → ${filename}`);

    try {
      const values = await fetchSheetData(sheet.sheetName);
      const rows = valuesToObjects(values);
      const data = transformSheet(rows);
      saveJSON(filename, data);
    } catch (error) {
      console.error(`  Error: ${error.message}`);
      // Save empty array on error
      saveJSON(filename, []);
    }
    console.log();
  }

  console.log('Done!');
}

main().catch(console.error);
