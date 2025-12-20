import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const BASE_DIR = path.resolve(__dirname, '..');
const JSON_FILE = path.join(BASE_DIR, 'public', 'island.json');

const HEADERS = {
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.5"
};

interface CoordsResult {
    lat: number;
    lng: number;
    description: string;
}

async function fetchGoogleCoords(url: string): Promise<CoordsResult> {
    try {
        const response = await fetch(url, { headers: HEADERS });
        if (!response.ok) return { lat: 0, lng: 0, description: "" };
        const text = await response.text();
        
        // Regex to capture the array
        const regex = /window\.APP_INITIALIZATION_STATE=\[\s*\[\s*\[\s*[^,]+,\s*([^,]+),\s*([^\]]+)/;
        const match = text.match(regex);
        
        let description = "";
        const descMatch = text.match(/<meta\s+property="og:description"\s+content="([^"]+)"/);
        if (descMatch) {
            description = descMatch[1];
        }

        if (match && match.length >= 3) {
            const lng = parseFloat(match[1]);
            const lat = parseFloat(match[2]);
            if (!isNaN(lat) && !isNaN(lng)) {
                return { lat, lng, description };
            }
        }
        
        return { lat: 0, lng: 0, description }; 
    } catch (e) {
        return { lat: 0, lng: 0, description: "" };
    }
}

async function reverseGeocode(lat: number, lng: number): Promise<{ city: string, county: string } | null> {
    try {
        const url = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`;
        const response = await fetch(url, { 
            headers: { "User-Agent": "GluttonyMap/1.0" } 
        });
        if (!response.ok) return null;
        const data = await response.json();
        
        const possibleCity = data.address?.city || data.address?.town || data.address?.village || "";
        const possibleCounty = data.address?.county || "";
        
        return { city: possibleCity, county: possibleCounty };
    } catch (e) {
        return null;
    }
}

async function sleep(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function main() {
    try {
        const content = await fs.readFile(JSON_FILE, 'utf-8');
        const data = JSON.parse(content);
        
        let updatedCount = 0;
        const places = data.places;

        console.log(`Processing ${places.length} places (Advanced Fetch)...`);
        
        for (let i = 0; i < places.length; i++) {
            const place = places[i];
            
            // Skip if both lat and description are present and city is known
            if (place.lat !== 0 && place.description && place.description !== "" && place.city !== "Unknown City") continue;
            
            console.log(`[${i+1}/${places.length}] Fetching ${place.name}...`);
            
            // 1. Fetch coords & description
            const result = await fetchGoogleCoords(place.url);
            let changed = false;

            if (result.lat !== 0) {
                // If we didn't have lat, or if we want to validte?
                // Don't overwrite existing valid lat with 0 (though result.lat!=0 checked above)
                if (Math.abs(place.lat - result.lat) > 0.0001) { // Only if different
                     place.lat = result.lat;
                     place.lng = result.lng;
                     changed = true;
                     console.log(`  Coords: ${result.lat}, ${result.lng}`);
                }

                // 2. Reverse Geocode ONLY if we are missing city or it is Unknown
                if (!place.city || place.city === "" || place.city === "Unknown City") {
                     await sleep(1000); 
                     const address = await reverseGeocode(result.lat, result.lng);
                     if (address) {
                         place.city = address.city;
                         place.county = address.county;
                         console.log(`  Address: ${place.city}, ${place.county}`);
                         changed = true;
                     }
                }
            } else {
                 console.log(`  No coords found.`);
            }

            if (result.description && (!place.description || place.description === "")) {
                place.description = result.description;
                console.log(`  Description: ${result.description}`);
                changed = true;
            }
            
            if (changed) updatedCount++;
            
            // Periodically save
            if (updatedCount > 0 && updatedCount % 5 === 0) {
                await fs.writeFile(JSON_FILE, JSON.stringify(data, null, 2), 'utf-8');
            }
            
            // Sleep
            await sleep(1000);
        }
        
        console.log(`Updated ${updatedCount} places.`);
        await fs.writeFile(JSON_FILE, JSON.stringify(data, null, 2), 'utf-8');
        console.log("Done.");
        
    } catch (error) {
        console.error("Error:", error);
    }
}

main();
