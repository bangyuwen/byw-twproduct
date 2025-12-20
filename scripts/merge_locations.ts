
import fs from 'fs';
import path from 'path';

const VALID_DIVISIONS = new Set([
  // 6 Special Municipalities
  "臺北市", "新北市", "桃園市", "臺中市", "臺南市", "高雄市",
  // 3 Cities
  "基隆市", "新竹市", "嘉義市",
  // 13 Counties
  "新竹縣", "苗栗縣", "彰化縣", "南投縣", "雲林縣", "嘉義縣", 
  "屏東縣", "宜蘭縣", "花蓮縣", "臺東縣", "澎湖縣", "金門縣", "連江縣"
]);

const filePath = path.resolve(process.cwd(), 'public/island.json');

try {
  const rawData = fs.readFileSync(filePath, 'utf-8');
  const data = JSON.parse(rawData);

  console.log(`Original count: ${data.places.length}`);

  const filteredPlaces = data.places.filter((place: any) => {
    let targetDivision = "";

    // Check county first (usually where the top-level division is for non-municipalities)
    if (place.county && VALID_DIVISIONS.has(place.county)) {
      targetDivision = place.county;
    } 
    // Check city next (for municipalities or if county was empty/invalid)
    else if (place.city && VALID_DIVISIONS.has(place.city)) {
      targetDivision = place.city;
    }

    if (targetDivision) {
      place.city = targetDivision;
      place.county = ""; // Clear county to avoid confusion/duplication
      return true;
    }
    
    // Log dropped items for debugging (optional, can comment out if too noisy)
    // console.log(`Dropping: ${place.name} (${place.city}, ${place.county})`);
    return false;
  });

  data.places = filteredPlaces;
  data.count = filteredPlaces.length;

  console.log(`Filtered count: ${data.places.length}`);

  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
  console.log('Successfully updated public/island.json');

} catch (error) {
  console.error('Error processing file:', error);
}
