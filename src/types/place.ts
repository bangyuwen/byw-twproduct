export interface Place {
    place_id: string;
    name: string;
    category: string;
    description: string;
    url: string;
    lat: number | string;
    lng: number | string;
    recent_visitors?: string;
    county?: string;
    city?: string;
    permanently_closed?: boolean;
    source?: string;
    popular_product?: string;
}

export interface PlaceData {
    title: string;
    places: Place[];
    count?: number;
    extracted_at?: string;
}
