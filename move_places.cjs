const fs = require("fs");
const path = require("path");

const rawPath = path.join(process.cwd(), "public/lists/taiwan-map-raw.json");
const metaPath = path.join(process.cwd(), "public/lists/taiwan-map-meta.json");

try {
  let rawData = JSON.parse(fs.readFileSync(rawPath, "utf8"));
  let metaData = { places: [] };

  if (fs.existsSync(metaPath)) {
    metaData = JSON.parse(fs.readFileSync(metaPath, "utf8"));
  }

  // Move 10 items
  const itemsToMove = rawData.places.splice(0, 10);
  metaData.places.push(...itemsToMove);

  fs.writeFileSync(rawPath, JSON.stringify(rawData, null, 2));
  fs.writeFileSync(metaPath, JSON.stringify(metaData, null, 2));

  console.log(`Moved ${itemsToMove.length} items from raw to meta.`);
} catch (error) {
  console.error("Error moving items:", error);
}
