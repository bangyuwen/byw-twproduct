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
        let updatedCount = 0;
        
        for (const place of data.places) {
            let changed = false;
            
            // Fill City/County defaults if missing
            if (!place.city) {
                place.city = "Unknown City";
                changed = true;
            }
            // County is optional in some contexts, but let's ensure it's not undefined
            if (place.county === undefined) {
               // place.county = ""; // Or leave undefined?
            }

            // Fill Description if missing
            if (!place.description || place.description === "") {
                const loc = place.city !== "Unknown City" ? place.city : "Taiwan";
                // Simple template
                place.description = `${place.name} is a ${place.category} located in ${loc}.`;
                changed = true;
            }
            
            // Note: We don't touch lat/lng here. 0 is 0. 
            // We can't fake coordinates.

            if (changed) updatedCount++;
        }

        console.log(`Filled descriptions/fields for ${updatedCount} places.`);
        await fs.writeFile(ISLAND_FILE, JSON.stringify(data, null, 2), 'utf-8');
        console.log("Saved island.json.");

    } catch (error) {
        console.error("Error:", error);
    }
}

main();
