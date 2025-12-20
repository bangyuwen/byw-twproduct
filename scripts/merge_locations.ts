import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const BASE_DIR = path.resolve(__dirname, '..');
const ISLAND_FILE = path.join(BASE_DIR, 'public', 'island.json');
const GLUTTONY_FILE = path.join(BASE_DIR, 'public', 'gluttony.json');

async function main() {
    try {
        console.log(`Reading files...`);
        const islandContent = await fs.readFile(ISLAND_FILE, 'utf-8');
        const gluttonyContent = await fs.readFile(GLUTTONY_FILE, 'utf-8');
        
        const islandData = JSON.parse(islandContent);
        const gluttonyData = JSON.parse(gluttonyContent);

        // Create a map of gluttony places by place_id or name
        const gluttonyMap = new Map();
        gluttonyData.places.forEach((p: any) => {
            if (p.place_id) gluttonyMap.set(p.place_id, p);
            if (p.name) gluttonyMap.set(p.name, p); // Fallback to name
        });

        console.log(`Found ${islandData.places.length} island places and ${gluttonyData.places.length} gluttony places.`);

        let updatedCount = 0;
        for (const place of islandData.places) {
            // Find match
            let match = gluttonyMap.get(place.place_id) || gluttonyMap.get(place.name);

            if (match) {
                let changed = false;
                // Update missing/empty fields
                if ((!place.lat || place.lat === 0) && match.lat) {
                    place.lat = match.lat;
                    changed = true;
                }
                if ((!place.lng || place.lng === 0) && match.lng) {
                    place.lng = match.lng;
                    changed = true;
                }
                if ((!place.city || place.city === "") && match.city) {
                    place.city = match.city;
                    changed = true;
                }
                if ((!place.county || place.county === "") && match.county) {
                    place.county = match.county;
                    changed = true;
                }
                // Update category if it's default
                if ((!place.category || place.category === "島國") && match.category) {
                    place.category = match.category;
                    changed = true;
                }
                // Update description if empty
                if ((!place.description || place.description === "") && match.description) {
                    place.description = match.description;
                    changed = true;
                }
                // Update image if missing
                if (!place.image_url && match.image_url) {
                    place.image_url = match.image_url;
                    changed = true;
                }
                // Optional: update description if empty? No, user wanted it removed/regenerated.
                if (changed) updatedCount++;
            }
        }

        console.log(`Merged data for ${updatedCount} places.`);
        
        await fs.writeFile(ISLAND_FILE, JSON.stringify(islandData, null, 2), 'utf-8');
        console.log("Saved island.json.");

    } catch (error) {
        console.error("Error:", error);
    }
}

main();
