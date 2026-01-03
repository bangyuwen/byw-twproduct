---
description: Update a place entry in taiwan-map.json using Google Maps data
---

# Update Place from Google Maps

Use the browser agent to search Google Maps and update place data.

## Steps

1. **Read the place name** from `public/lists/taiwan-map-meta.json` that needs updating, following the rules in [Example](#example-url-parsing)

2. **Search on Google Maps**
   - Navigate to `https://www.google.com/maps`
   - Search for the place name (include city if available, e.g., "悠遊美甲工作室 永和")
   - Click on the correct result

3. **Extract data from the page**
   - **URL**: Copy the current page URL
   - **place_id**: Extract from URL - look for `0x....:0x....` pattern in the URL
   - **name**: Get the place name heading
   - **lat, lng**: Extract from URL - look for `@25.0420353,121.5676011` pattern after the place name
   - **popular_product**: Look for "Popular dishes" or "People often mention" section

4. **Update `public/lists/taiwan-map.json` and cleanup**
   - Construct the new entry with all gathered data (`url`, `place_id`, `name`, `lat`, `lng`, `popular_product`) + original data (`description`, `category`, `city`).
   - **Append** the new entry to the `places` array in `public/lists/taiwan-map.json`
   - **Remove** the original entry from `public/lists/taiwan-map-meta.json`

5. **Deduplicate**
   - Ensure `place_id` is unique in `public/lists/taiwan-map.json`.
   - If duplicates exist, keep the latest entry.

## Example URL Parsing

Given URL:

```txt
https://www.google.com/maps/place/ANNIES+HAIR/@25.0420353,121.5676011,17z/data=!4m7!3m6!1s0x3442ab0cea992d17:0xcf3d27cd00c82992
```

Extract:

- `lat`: `25.0420353`
- `lng`: `121.5676011`
- `place_id`: `0x3442ab0cea992d17:0xcf3d27cd00c82992`

## Tips

### JavaScript Search (for browser automation)

```javascript
document.getElementById('searchboxinput').value = 'place name + city';
document.querySelector("button[aria-label='Search']").click();
```

### Finding Popular Products

- **Food places**: Check **Menu tab** → "Highlights" section, or **Reviews tab** → food tags at top
- **Non-food places**: Check **About** section or reviews for commonly mentioned services
