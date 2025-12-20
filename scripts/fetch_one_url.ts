import fs from 'node:fs/promises';
import path from 'node:path';

async function main() {
    // "過去珈琲" URL
    const url = 'https://www.google.com/maps/place/%E9%81%8E%E5%8E%BB%E7%8F%88%E7%90%B2/data=!4m2!3m1!1s0x346e63caafb53e7d:0xd2bd3d1ec134c314';
    
    console.log(`Fetching ${url}...`);
    const response = await fetch(url, {
        headers: {
            // Mimic a real browser
            "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
            "Accept-Language": "en-US,en;q=0.5"
        }
    });

    const text = await response.text();
    console.log(`Fetched ${text.length} bytes.`);
    
    await fs.writeFile('debug_google_full.html', text, 'utf-8');
    console.log("Saved to debug_google_full.html");

    // Look for coords patterns
    const matches = text.match(/[-+]?\d+\.\d{5,}/g);
    if (matches) {
        console.log("Found potential coords:", matches.slice(0, 10));
    }
}

main();
