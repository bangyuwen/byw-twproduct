import type { Place } from '../types/place';

export class DataProcessor {
    private placeMap = new Map<string, Place>();
    private coordMap = new Map<string, string>(); // "lat,lng" -> place key (name or ID)

    /**
     * Adds a list of places from a specific source.
     * Handles deduplication by ID and coordinates, and aggregates source titles.
     */
    public addPlaces(places: Place[], sourceTitle: string): void {
        places.forEach(p => {
            let key = p.place_id || p.name;
            
            // Try to find existing place by coordinates if available
            if (p.lat && p.lng) {
                // Use 4 decimal places for approx 11m precision, sufficient for shop deduplication
                const coordKey = `${Number(p.lat).toFixed(4)},${Number(p.lng).toFixed(4)}`;
                if (this.coordMap.has(coordKey)) {
                    key = this.coordMap.get(coordKey)!;
                } else {
                    this.coordMap.set(coordKey, key);
                }
            }

            if (this.placeMap.has(key)) {
                const existingPlace = this.placeMap.get(key)!;
                
                // Check if source already included to avoid "A · A"
                const currentSources = existingPlace.source ? existingPlace.source.split(' · ') : [];
                let newSource = existingPlace.source;
                
                if (!currentSources.includes(sourceTitle)) {
                    newSource = `${existingPlace.source} · ${sourceTitle}`;
                }
                
                // Merge properties. 
                // We prioritize existing data but ensure the source is updated with aggregation.
                this.placeMap.set(key, { ...existingPlace, ...p, source: newSource });
            } else {
                this.placeMap.set(key, { ...p, source: sourceTitle });
            }
        });
    }

    /**
     * Returns the processed list of unique places.
     */
    public getResult(): Place[] {
        return Array.from(this.placeMap.values());
    }
}
