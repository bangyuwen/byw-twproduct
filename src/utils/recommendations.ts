import type { Place } from "./api";



/**
 * Extended interface with pre-parsed data to avoid repeated string splitting.
 * Kept for specific UI compatibility.
 */
export interface ProcessedPlace extends Place {
    /** Total number of visitors */
    visitorCount: number;
    /** Array of visitor IDs */
    visitors: string[];
    popular_product?: string;
}

/**
 * Tracks similarity between a recommended shop and a shop the user visited.
 * Kept for interface compatibility but will likely be empty.
 */
export interface SimilarShop {
    visitedId: string;
    visitedName: string;
    /** Similarity score between 0 and 1 */
    similarity: number;
}

/**
 * Helper interface for recommendation with score and explanation.
 */
export interface RecommendedPlace extends ProcessedPlace {
    /** Combined Collaborative Filtering score - effectively 0 or random now */
    cfScore: number;
    /** List of visited shops that contributed to this recommendation */
    similarTo: SimilarShop[];
}

/**
 * Pre-process places to parse visitor strings once.
 * Converts comma-separated visitor strings into Sets and Arrays.
 */
export function preprocessPlaces(places: Place[]): ProcessedPlace[] {
    return places.map(place => {
        const visitors = place.recent_visitors
            ? place.recent_visitors.split(',').map(v => v.trim()).filter(v => v)
            : [];
        return {
            ...place,
            visitorCount: visitors.length,
            visitors: visitors
        };
    });
}

/**
 * Simple random recommendation since we lack user data for CF.
 * Returns a shuffled list of unvisited shops.
 */
/**
 * Content-Based Filtering Recommendation Algorithm
 * 
 * Logic:
 * 1. Analyze user's history (statusMap) to build a preference profile.
 * 2. Weighting:
 *    - Like: 3 points
 *    - Visited: 1 point
 *    - Want: 0.5 points (Weak signal of interest)
 *    - Dislike: 0 points (Ignored)
 * 3. Calculate Affinity for Category and Location (City).
 * 4. Score unvisited shops:
 *    - Score = (CategoryScore * W_Cat) + (LocationScore * W_Loc) + RandomNoise
 * 5. Return top N shops.
 */
export function getRecommendations(
    allShops: ProcessedPlace[], 
    statusMap: Record<string, string>
): (ProcessedPlace | RecommendedPlace)[] {
    
    // 1. Build User Profile
    const categoryScores: Record<string, number> = {};
    const cityScores: Record<string, number> = {};
    const visitedSet = new Set<string>();
    
    // Helper to add score
    const addScore = (dict: Record<string, number>, key: string | undefined, score: number) => {
        if (!key) return;
        dict[key] = (dict[key] || 0) + score;
    };

    let hasHistory = false;

    Object.entries(statusMap).forEach(([id, status]) => {
        if (status === 'dislike' || status === 'none') return;

        const shop = allShops.find(s => s.place_id === id);
        if (!shop) return;

        visitedSet.add(id);
        hasHistory = true;

        let weight = 1;
        if (status === 'like') weight = 3;
        else if (status === 'want') weight = 0.5; // Slight boost for things they marked as want
        
        // Accumulate affinity
        addScore(categoryScores, shop.category, weight);
        addScore(cityScores, shop.city, weight);
    });

    // 2. Filter Candidates (Unvisited shops)
    // Note: We include 'want' shops in candidates? 
    // Usually recommendation is for "New Discovery". 'Want' is already discovered.
    // So we exclude anything in statusMap except 'none' (which shouldn't be in map).
    // Let's filter out anything that has a status (visited, like, dislike, want).
    const candidates = allShops.filter(shop => !statusMap[shop.place_id]);

    // If no history, fallback to popularity or random (Hybrid approach part 1: Cold Start)
    if (!hasHistory) {
        // Simple popularity shuffle?
        // Or pure random as before but slightly weighted by popularity
        const popularCandidates = [...candidates].sort((a, b) => b.visitorCount - a.visitorCount);
        
        // Take top 50 popular and shuffle them to give top 10
        const top50 = popularCandidates.slice(0, 50);
        for (let i = top50.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [top50[i], top50[j]] = [top50[j], top50[i]];
        }
        return top50.slice(0, 10).map(s => ({
            ...s,
            cfScore: 0,
            similarTo: []
        }));
    }

    // 3. Score Candidates
    
    // Normalize weights slightly? Not strictly necessary for ranking.
    // Just simple linear combination. w_cat = 0.7, w_loc = 0.3 (Category is usually more important than just location, or vice versa?)
    // Actually location is quite important for physical visits. Let's say 50/50.
    
    const scoredCandidates = candidates.map(shop => {
        const catScore = (shop.category && categoryScores[shop.category]) || 0;
        const cityScore = (shop.city && cityScores[shop.city]) || 0;
        
        // Add a small random factor (0-1) to break ties and rotate exposure
        const randomFactor = Math.random(); 
        
        // Basic ScoreFormula
        const score = (catScore * 1.5) + (cityScore * 1.0) + randomFactor;

        // Find similar visited shops (Explanation)
        // Find visited shops with same category
        const explanationSources: SimilarShop[] = [];
        Object.entries(statusMap).forEach(([id, status]) => {
            if (status === 'dislike' || status === 'want') return;
            const visitedShop = allShops.find(s => s.place_id === id);
            if (!visitedShop) return;

            if (shop.category && visitedShop.category === shop.category) {
                 explanationSources.push({
                     visitedId: visitedShop.place_id,
                     visitedName: visitedShop.name,
                     similarity: 1
                 });
            }
        });

        return {
            ...shop,
            cfScore: score,
            similarTo: explanationSources.slice(0, 3) // Keep top 3 for UI
        } as RecommendedPlace;
    });

    // 4. Sort by Score
    scoredCandidates.sort((a, b) => b.cfScore - a.cfScore);

    return scoredCandidates.slice(0, 10);
}

