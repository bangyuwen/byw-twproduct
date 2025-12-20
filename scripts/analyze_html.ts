import fs from 'node:fs/promises';

async function main() {
    const text = await fs.readFile('debug_google_full.html', 'utf-8');
    const target = "23.1194153";
    const index = text.indexOf(target);
    
    if (index !== -1) {
        console.log(`Found at index ${index}`);
        const snippet = text.substring(index - 100, index + 100);
        console.log("Snippet:", snippet);
        
        // Try to identify the pattern
        // Often it's window.APP_INITIALIZATION_STATE = [... [lat, lng] ...]
        // or just plain [... 23.1194153, 120.3591128 ...]
    } else {
        console.log("Not found in file (maybe encoding issue?)");
    }
}

main();
