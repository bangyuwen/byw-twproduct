export interface Place {
    place_id: string;
    name: string;
    category: string;
    description: string;
    url: string;
    lat: string;
    lng: string;
    recent_visitors?: string;
    county?: string;
    city?: string;
    permanently_closed?: boolean;
    source?: string;
}

export interface GluttonyData {
    title: string;
    places: Place[];
}

export class FetchError extends Error {
    constructor(public originalError: unknown) {
        super("Failed to fetch gluttony data");
        this.name = "FetchError";
    }
}

// Fetch the data using standard fetch API
export async function fetchAllShops(): Promise<GluttonyData> {
    try {
        const [gluttonyRes, islandRes] = await Promise.all([
            fetch('/byw-mit/gluttony.json'),
            fetch('/byw-mit/island.json')
        ]);

        if (!gluttonyRes.ok) throw new Error(`Failed to fetch gluttony data: ${gluttonyRes.statusText}`);
        if (!islandRes.ok) console.warn(`Failed to fetch island data: ${islandRes.statusText}`);

        const gluttonyData = (await gluttonyRes.json()) as GluttonyData;
        const islandData = islandRes.ok ? (await islandRes.json()) as GluttonyData : { title: "島國", places: [] };

    const placeMap = new Map<string, Place>();
    
    // Helper to add places
    const addPlaces = (places: Place[], sourceTitle: string) => {
        places.forEach(p => {
            const key = p.place_id || p.name;
            const placeWithSource = { ...p, source: sourceTitle };
            
            if (placeMap.has(key)) {
                 // Merge: keep existing source if desired, or overwrite. 
                 // Actually, if it exists in both, which source should we attribute?
                 // Gluttony is likely "primary". Island is "secondary".
                 // But wait, the user said "DollyNails NOT Gluttony, IS Island".
                 // This implies if it's in Island, it should be Island.
                 // BUT merge order is Gluttony -> Island.
                 // If I add Gluttony first, then Island... valid fields override.
                 // I should probably preserve the ORIGINAL source if it was already set?
                 // Or if it's in both, maybe distinct?
                 // Let's assume for now valid merge keeps the LAST source if we overwrite.
                 placeMap.set(key, { ...placeMap.get(key)!, ...placeWithSource });
            } else {
                placeMap.set(key, placeWithSource);
            }
        });
    };

    addPlaces(gluttonyData.places, gluttonyData.title);
    addPlaces(islandData.places, islandData.title);

        return {
            title: gluttonyData.title,
            places: Array.from(placeMap.values())
        };
    } catch (error) {
        throw new FetchError(error);
    }
}
