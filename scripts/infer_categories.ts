import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const BASE_DIR = path.resolve(__dirname, '..');
const ISLAND_FILE = path.join(BASE_DIR, 'public', 'island.json');

const CATEGORY_RULES = [
    { keys: ['咖啡', 'Cafe', 'COFFEE', 'cafe', 'coffee', 'Roaster', '珈琲'], category: '咖啡廳' },
    { keys: ['茶', 'Tea', 'tea', '飲料', '手搖', '飲'], category: '飲料店' },
    { keys: ['書', 'Book', 'book', '閱讀'], category: '書店' },
    { keys: ['酒', 'Bar', 'bar', 'Bistro', 'bistro', '餐酒館', '居酒屋'], category: '酒吧' },
    { keys: ['食', '餐', '飯', '麵', '廚房', 'Kitchen', 'kitchen', '食堂', '料理', '早午餐', 'Brunch', 'brunch', 'Pizza', '披薩', '漢堡', 'Burger', 'burger', '火鍋', '燒肉', '小吃', '點心', '蛋糕', 'Cake', 'cake', '甜點', 'Dessert', 'dessert', '冰', 'Ice', 'ice', '豆花'], category: '美食' },
    { keys: ['醫', '診所', '藥局'], category: '醫療' },
    { keys: ['宿', 'Hotel', 'hotel', '民宿', '旅店'], category: '住宿' },
    { keys: ['藝', 'Art', 'art', '設計', 'Design', 'design', '工作室', 'Studio', 'studio', '花', 'Flower', 'flower', '照', 'Photo', 'photo', '攝影'], category: '藝文/工作室' },
    { keys: ['寵物', 'Pet', 'pet', '貓', '狗'], category: '寵物' },
    { keys: ['髮', 'Hair', 'hair', '美甲', 'Nail', 'nail', '美容', 'SPA', 'spa'], category: '美容' },
    { keys: ['服飾', '衣', '鞋', '包', '店'], category: '購物' }
];

async function main() {
    try {
        const content = await fs.readFile(ISLAND_FILE, 'utf-8');
        const data = JSON.parse(content);

        let updatedCount = 0;
        for (const place of data.places) {
            // Only update if currently default, empty, or '未分類'
            if (place.category === '島國' || !place.category || place.category === '未分類') {
                let inferred = '未分類';
                
                for (const rule of CATEGORY_RULES) {
                    if (rule.keys.some(k => place.name.toLowerCase().includes(k.toLowerCase()))) {
                        inferred = rule.category;
                        break;
                    }
                }
                
                place.category = inferred;
                updatedCount++;
            }
        }

        console.log(`Inferred categories for ${updatedCount} places.`);
        await fs.writeFile(ISLAND_FILE, JSON.stringify(data, null, 2), 'utf-8');
        console.log("Saved island.json.");

    } catch (error) {
        console.error("Error:", error);
    }
}

main();
