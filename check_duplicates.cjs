const fs = require("fs");

const data = JSON.parse(
  fs.readFileSync("public/lists/taiwan-map.json", "utf8")
);
const places = data.places;

const seenPlaceIds = new Map();
const seenNames = new Map();
const duplicates = [];

places.forEach((place, index) => {
  if (place.place_id && seenPlaceIds.has(place.place_id)) {
    duplicates.push({
      type: "place_id",
      value: place.place_id,
      index: index,
      originalIndex: seenPlaceIds.get(place.place_id),
      name: place.name,
    });
  } else if (place.place_id) {
    seenPlaceIds.set(place.place_id, index);
  }

  if (place.name && seenNames.has(place.name)) {
    // Only count as duplicate name if place_id is different or missing (to avoid double counting exact same entry)
    if (!duplicates.find((d) => d.index === index && d.type === "place_id")) {
      duplicates.push({
        type: "name",
        value: place.name,
        index: index,
        originalIndex: seenNames.get(place.name),
        name: place.name,
      });
    }
  } else if (place.name) {
    seenNames.set(place.name, index);
  }
});

if (duplicates.length > 0) {
  console.log("Duplicates found:");
  console.log(JSON.stringify(duplicates, null, 2));
} else {
  console.log("No duplicates found.");
}
