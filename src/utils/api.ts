import type { Place, PlaceData } from '../types/place';
import { DataProcessor } from './data-processor';

export type { Place };
export type GluttonyData = PlaceData;

// Fetch the data using standard fetch API
export async function fetchAllShops(): Promise<GluttonyData> {
    const [gluttonyRes, islandRes, supportRes, babyRes, taiwanMapMetaRes] = await Promise.all([
        fetch('/byw-mit/lists/gluttony.json'),
        fetch('/byw-mit/lists/island.json'),
        fetch('/byw-mit/lists/support.json'),
        fetch('/byw-mit/lists/baby.json'),
        fetch('/byw-mit/lists/taiwan-map.json')
    ]);

    if (!gluttonyRes.ok) throw new Error(`Failed to fetch gluttony data: ${gluttonyRes.statusText}`);
    if (!islandRes.ok) console.warn(`Failed to fetch island data: ${islandRes.statusText}`);
    if (!supportRes.ok) console.warn(`Failed to fetch support data: ${supportRes.statusText}`);
    if (!babyRes.ok) console.warn(`Failed to fetch baby data: ${babyRes.statusText}`);
    if (!taiwanMapMetaRes.ok) console.warn(`Failed to fetch taiwan-map data: ${taiwanMapMetaRes.statusText}`);

    const gluttonyData = (await gluttonyRes.json()) as GluttonyData;
    const islandData = islandRes.ok ? (await islandRes.json()) as GluttonyData : { title: "島國", places: [] };
    const supportData = supportRes.ok ? (await supportRes.json()) as GluttonyData : { title: "支持", places: [] };
    const babyData = babyRes.ok ? (await babyRes.json()) as GluttonyData : { title: "寶寶", places: [] };
    const taiwanMapMetaData = taiwanMapMetaRes.ok ? (await taiwanMapMetaRes.json()) as GluttonyData : { title: "台灣地圖", places: [] };

    const processor = new DataProcessor();

    processor.addPlaces(gluttonyData.places, gluttonyData.title);
    processor.addPlaces(islandData.places, islandData.title);
    processor.addPlaces(supportData.places, supportData.title);
    processor.addPlaces(babyData.places, babyData.title);
    processor.addPlaces(taiwanMapMetaData.places, taiwanMapMetaData.title);

    return {
        title: gluttonyData.title,
        places: processor.getResult()
    };
}
