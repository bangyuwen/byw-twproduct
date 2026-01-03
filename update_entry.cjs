const fs = require("fs");
const path = require("path");

const metaPath = path.join(process.cwd(), "public/lists/taiwan-map-meta.json");
const finalPath = path.join(process.cwd(), "public/lists/taiwan-map.json");

const updateData = {
  name: "玉春花拌飯館",
  url: "https://www.google.com/maps/place/%E7%8E%89%E6%98%A5%E8%8A%B1%E6%8B%8C%E9%A3%AF%E9%A4%A8/@22.6411676,120.3057019,17z/data=!3m1!4b1!4m6!3m5!1s0x346e04f1b938c18b:0x73887c094151fcea!8m2!3d22.6411676!4d120.3057019!16s%2Fg%2F11g8c8m0yx?entry=ttu&g_ep=EgoyMDI1MTIwOS4wIKXMDSoASAFQAw%3D%3D",
  place_id: "0x346e04f1b938c18b:0x73887c094151fcea",
  lat: 22.6411676,
  lng: 120.3057019,
  popular_product: "辣蘿蔔, 油封嫩雞, 油封嫩雞腿加洋蔥豬五花拌飯, 塔香牛肉拌飯",
};

try {
  let metaData = JSON.parse(fs.readFileSync(metaPath, "utf8"));
  let finalData = JSON.parse(fs.readFileSync(finalPath, "utf8"));

  // 1. Update in Meta (Optional, since we remove it, but good for record if we didn't remove)
  // Find index in meta
  const metaIndex = metaData.places.findIndex(
    (p) => p.name === updateData.name
  );
  if (metaIndex !== -1) {
    // Merge updates
    metaData.places[metaIndex] = {
      ...metaData.places[metaIndex],
      ...updateData,
    };
    console.log(`Updated ${updateData.name} in meta.`);

    // 2. Move to Final
    // Check if exists in final
    const finalIndex = finalData.places.findIndex(
      (p) =>
        p.name === updateData.name ||
        (updateData.place_id && p.place_id === updateData.place_id)
    );

    if (finalIndex !== -1) {
      // Update existing
      finalData.places[finalIndex] = {
        ...finalData.places[finalIndex],
        ...updateData,
      };
      console.log(`Updated existing entry in final list.`);
    } else {
      // Add new
      finalData.places.push(metaData.places[metaIndex]);
      console.log(`Added new entry to final list.`);
    }

    // 3. Remove from Meta
    metaData.places.splice(metaIndex, 1);
    console.log(`Removed from meta.`);

    fs.writeFileSync(metaPath, JSON.stringify(metaData, null, 2));
    fs.writeFileSync(finalPath, JSON.stringify(finalData, null, 2));
    console.log("Files updated successfully.");
  } else {
    console.log(`Item ${updateData.name} not found in meta.`);
  }
} catch (error) {
  console.error("Error updating files:", error);
}
