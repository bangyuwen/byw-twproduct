import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const BASE_DIR = path.resolve(__dirname, '..');
const JSON_FILE = path.join(BASE_DIR, 'public', 'gluttony.json');

const HEADERS = {
    "User-Agent": "curl/7.54.0",
    "Accept": "*/*"
};

interface Place {
    place_id: string;
    name: string;
    category: string;
    description: string;
    url: string;
    lat: number;
    lng: number;
    county?: string;
    city?: string;
    visitorCount?: number;
    tags?: string[];
}

interface CoordsResult {
    lat: number;
    lng: number;
    description: string;
    title: string;
    url: string;
}

async function fetchGoogleData(inputUrl: string): Promise<CoordsResult> {
    try {
        let currentUrl = inputUrl;
        let response: Response | null = null;
        let text = "";

        // Manual redirect loop (max 5)
        for (let i = 0; i < 5; i++) {
            console.log(`Fetching ${currentUrl}...`);
            response = await fetch(currentUrl, { 
                headers: HEADERS,
                redirect: 'manual' // Don't follow automatically
            });
            
            if (response.status >= 300 && response.status < 400) {
                const location = response.headers.get('location');
                if (location) {
                    console.log(`Redirect (${response.status}) to: ${location}`);
                    currentUrl = location;
                    continue;
                }
            }
            
            // If 200, stop
            if (response.status === 200) {
                 break;
            }
            
            throw new Error(`Request failed with status ${response.status}`);
        }

        if (!response) throw new Error("No response");
        const finalUrl = currentUrl;
        text = await response.text();
        
        console.log(`Final URL: ${finalUrl}`);
        // await fs.writeFile('debug_add_url.html', text, 'utf-8'); // Comment out in prod

        // If we are still on the DeepLink page (short URL final), we might have failed to get the "desktop" redirect.
        // Google sometimes gives 200 for short link if UA suggests mobile.
        // But headers above used desktop Chrome UA.
        // Let's try to parse what we have.

        // Coords
        let lat = 0, lng = 0;
        const regex = /window\.APP_INITIALIZATION_STATE=\[\s*\[\s*\[\s*[^,]+,\s*([^,]+),\s*([^\]]+)/;
        const match = text.match(regex);
        if (match && match.length >= 3) {
            lng = parseFloat(match[1]);
            lat = parseFloat(match[2]);
        } else {
             // Fallback: try to extract from meta tags if APP_INITIALIZATION_STATE is missing
             // <meta property="og:image" content="https://maps.google.com/maps/api/staticmap?center=25.0270068%2C121.4983054&zoom=15...">
             const ogImage = text.match(/<meta\s+property="og:image"\s+content="([^"]+)"/);
             if (ogImage) {
                 const centerMatch = ogImage[1].match(/center=([-+]?\d+\.\d+)(?:%2C|,)([-+]?\d+\.\d+)/);
                 if (centerMatch) {
                     lat = parseFloat(centerMatch[1]);
                     lng = parseFloat(centerMatch[2]);
                     console.log("Extracted coords from og:image");
                 }
             }
        }

        // Description
        let description = "";
        const descMatch = text.match(/<meta\s+property="og:description"\s+content="([^"]+)"/);
        if (descMatch) description = descMatch[1];
        
        // Title (Name)
        let title = "";
        const titleMatch = text.match(/<meta\s+property="og:title"\s+content="([^"]+)"/);
        if (titleMatch) {
            let rawTitle = titleMatch[1];
            const parts = rawTitle.split('·').map(s => s.trim());
            title = parts[0]; 
        } else {
             // Fallback: <title>
             const titleTag = text.match(/<title>(.*?)<\/title>/);
             if (titleTag) {
                 title = titleTag[1].replace(" - Google Maps", "").trim();
             }
        }
        
        // Final Fallback: URL q param
        if ((!title || title === "Google Maps" || title === "Google 地圖") && finalUrl.includes("q=")) {
             try {
                const urlObj = new URL(finalUrl);
                const q = urlObj.searchParams.get("q");
                if (q) {
                    // q often contains Address + Name or Name + Address
                    // Example: "108臺北市萬華區西園路二段140巷18號骨力牛食堂+艋舺店一樓"
                    // Strategy: if we have "Name + Address", split by +.
                    // If just a string, it might be messy.
                    // But usually "address name".
                    // Let's take the whole thing as a fallback name if nothing else.
                    // Or improved extraction?
                    // User's example: "...骨力牛食堂+艋舺店一樓"
                    // If we split by '+' it might help.
                    title = q; 
                }
             } catch(e) {}
        }

        return { lat, lng, description, title, url: finalUrl };
    } catch (e) {
        console.error("Fetch failed:", e);
        return { lat: 0, lng: 0, description: "", title: "", url: inputUrl };
    }
}

// ... reverseGeocode ...
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

async function main() {
    // ... args parsing ...
    const args = process.argv.slice(2);
    if (args.length < 1) {
        console.log("Usage: npx tsx scripts/add_from_url.ts <url> [category]");
        process.exit(1);
    }
    
    const url = args[0];
    const category = args[1] || "美食"; // Default to food

    const data = await fetchGoogleData(url);
    
    if (data.lat === 0 || data.lng === 0) {
        console.error("Failed to extract coordinates.");
        return;
    }

    // Clean up title if it's the q param mess
    // Example: "108臺北市萬華區西園路二段140巷18號骨力牛食堂 艋舺店一樓"
    // Heuristic: If it starts with a number and contains "號", it might start with address.
    if (data.title && data.title.includes("號")) {
        const parts = data.title.split("號");
        if (parts.length > 1) {
             let potentialName = parts[parts.length-1].trim(); 
             // Split by '+' or space if present to remove branch names or extra info if it looks like "Name+Branch"
             // Decode URI component just in case
             try { potentialName = decodeURIComponent(potentialName); } catch (e) {}
             
             // Split by +
             if (potentialName.includes('+')) {
                 potentialName = potentialName.split('+')[0].trim();
             }
             // Split by space? (Maybe risky if name has space, but "骨力牛食堂 艋舺店" might be split)
             // Let's stick to + for now as seen in q param "骨力牛食堂+艋舺店"
             
             if (potentialName) data.title = potentialName.replace(/^[\s+]+/, "");
        }
    }

    console.log(`Found: ${data.title}`);
    console.log(`Coords: ${data.lat}, ${data.lng}`);
    
    // Reverse Geocode
    const address = await reverseGeocode(data.lat, data.lng);
    const city = address?.city || "Unknown City";
    const county = address?.county || "";
    console.log(`Location: ${city}, ${county}`);

    // Create Place object
    const place_id = `new_${Date.now().toString(36)}`;
    
    const newPlace: Place = {
        place_id: place_id,
        name: data.title || "Unknown Shop",
        category: category,
        description: data.description || "美味的店家",
        url: data.url,
        lat: data.lat,
        lng: data.lng,
        county: county,
        city: city,
        tags: [],
        visitorCount: 0
    };

    // Read JSON
    const content = await fs.readFile(JSON_FILE, 'utf-8');
    const json = JSON.parse(content);
    
    // Cleanup bad entry (empty Name) from previous run
    if (json.places.length > 0) {
        const last = json.places[json.places.length - 1];
        if (last.name === "" && last.url.includes(newPlace.url)) { // Match by URL if possible or just empty name
             console.log("Removing previous partial entry...");
             json.places.pop();
        }
    }

    // Check duplicates
    const exists = json.places.find((p: Place) => p.name === newPlace.name || p.url === newPlace.url);
    if (exists) {
        console.log(`Place already exists: ${exists.name}`);
        return;
    }

    json.places.push(newPlace);
    
    await fs.writeFile(JSON_FILE, JSON.stringify(json, null, 2), 'utf-8');
    console.log(`Successfully added ${newPlace.name} to gluttony.json`);
}

main();
