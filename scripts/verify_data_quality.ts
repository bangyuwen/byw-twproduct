import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const BASE_DIR = path.resolve(__dirname, '..');
const ISLAND_FILE = path.join(BASE_DIR, 'public', 'island.json');

async function main() {
    try {
        const content = await fs.readFile(ISLAND_FILE, 'utf-8');
        const data = JSON.parse(content);
        
        let zeroLat = 0;
        let zeroLng = 0;
        let emptyCity = 0;
        let defaultCategory = 0;
        let emptyDescription = 0;
        let total = data.places.length;
        
        for (const place of data.places) {
            if (place.lat === 0) zeroLat++;
            if (place.lng === 0) zeroLng++;
            if (!place.city || place.city === "" || place.city === "Unknown City") emptyCity++;
            if (place.category === "島國" || !place.category || place.category === "未分類") defaultCategory++;
            if (!place.description || place.description === "") emptyDescription++;
        }
        
        console.log(`Total Places: ${total}`);
        console.log(`Zero Lat: ${zeroLat} (${(zeroLat/total*100).toFixed(1)}%)`);
        console.log(`Zero Lng: ${zeroLng} (${(zeroLng/total*100).toFixed(1)}%)`);
        console.log(`Empty City: ${emptyCity} (${(emptyCity/total*100).toFixed(1)}%)`);
        console.log(`Default Category: ${defaultCategory} (${(defaultCategory/total*100).toFixed(1)}%)`);
        console.log(`Empty Description: ${emptyDescription} (${(emptyDescription/total*100).toFixed(1)}%)`);
        
    } catch (error) {
        console.error("Error:", error);
    }
}

main();
