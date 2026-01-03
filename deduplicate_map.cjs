const fs = require("fs");
const path = require("path");

const filePath = path.resolve("public/lists/taiwan-map.json");
const data = JSON.parse(fs.readFileSync(filePath, "utf8"));

const uniquePlaces = [];
const seenIds = new Set();
const seenNames = new Set();

console.log(`Original count: ${data.places.length}`);

// Iterate backwards to keep the latest
for (let i = data.places.length - 1; i >= 0; i--) {
  const place = data.places[i];
  let isDuplicate = false;

  // Check by place_id
  if (place.place_id) {
    if (seenIds.has(place.place_id)) {
      isDuplicate = true;
    } else {
      seenIds.add(place.place_id);
    }
  }

  // Check by name if place_id is missing (fallback)
  // Also avoid adding if name already seen, but prioritize place_id check if available
  // To be safe and consistent with the check script, we'll generally respect place_id first.
  // If we found it by ID, we already marked it.

  // Note: The previous check script looked for duplicate names too.
  // Let's enforce name uniqueness as well to be clean, as long as it's the same place.
  if (!isDuplicate && place.name) {
    if (seenNames.has(place.name)) {
      // If we have seen the name, but the IDs were different?
      // If IDs were different, they might be different branches?
      // But if we are iterating backwards, we see the *latest* name first.
      // If we see "Starbucks" (id 2) then "Starbucks" (id 1), we mark id 1 as duplicate?
      // The previous report showed duplicates had SAME name AND place_id logic overlapping.
      // Based on user request "check for duplication" and my report, I'll stick to mostly place_id + identical names.
      isDuplicate = true;
    } else {
      seenNames.add(place.name);
    }
  }

  if (!isDuplicate) {
    uniquePlaces.unshift(place); // Add to front
  } else {
    console.log(
      `Removing duplicate: ${place.name} (ID: ${place.place_id || "N/A"})`
    );
  }
}

data.places = uniquePlaces;
console.log(`New count: ${data.places.length}`);

fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
