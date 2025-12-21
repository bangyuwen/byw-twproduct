import type { Place, PlaceData } from '../types/place';

export type { Place };
export type GluttonyData = PlaceData;

export class FetchError extends Error {
    constructor(public originalError: unknown) {
        super("Failed to fetch gluttony data");
        this.name = "FetchError";
    }
}

// Fetch the data using standard fetch API
export async function fetchAllShops(): Promise<GluttonyData> {
    try {
        const [gluttonyRes, islandRes, supportRes, babyRes] = await Promise.all([
            fetch('/byw-mit/gluttony.json'),
            fetch('/byw-mit/island.json'),
            fetch('/byw-mit/support.json'),
            fetch('/byw-mit/baby.json')
        ]);

        if (!gluttonyRes.ok) throw new Error(`Failed to fetch gluttony data: ${gluttonyRes.statusText}`);
        if (!islandRes.ok) console.warn(`Failed to fetch island data: ${islandRes.statusText}`);
        if (!supportRes.ok) console.warn(`Failed to fetch support data: ${supportRes.statusText}`);
        if (!babyRes.ok) console.warn(`Failed to fetch baby data: ${babyRes.statusText}`);

        const gluttonyData = (await gluttonyRes.json()) as GluttonyData;
        const islandData = islandRes.ok ? (await islandRes.json()) as GluttonyData : { title: "島國", places: [] };
        const supportData = supportRes.ok ? (await supportRes.json()) as GluttonyData : { title: "支持", places: [] };
        const babyData = babyRes.ok ? (await babyRes.json()) as GluttonyData : { title: "寶寶", places: [] };

        const placeMap = new Map<string, Place>();
    
        // Helper to add/merge places (later sources override earlier ones)
        const addPlaces = (places: Place[], sourceTitle: string) => {
            places.forEach(p => {
                const key = p.place_id || p.name;
                const placeWithSource = { ...p, source: sourceTitle };
                if (placeMap.has(key)) {
                    placeMap.set(key, { ...placeMap.get(key)!, ...placeWithSource });
                } else {
                    placeMap.set(key, placeWithSource);
                }
            });
        };

        addPlaces(gluttonyData.places, gluttonyData.title);
        addPlaces(islandData.places, islandData.title);
        addPlaces(supportData.places, supportData.title);
        addPlaces(babyData.places, babyData.title);

        return {
            title: gluttonyData.title,
            places: Array.from(placeMap.values())
        };
    } catch (error) {
        throw new FetchError(error);
    }
}
