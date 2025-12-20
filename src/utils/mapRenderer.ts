// Type definitions for minimal Leaflet usage
interface LeafletMap {
    setView(center: [number, number], zoom: number): LeafletMap;
    removeLayer(layer: any): void;
    invalidateSize(): void;
}

interface LeafletMarker {
    addTo(map: LeafletMap): LeafletMarker;
    bindPopup(content: string): LeafletMarker;
}

// Declare external L
declare const L: any;

export interface MapMarkerData {
    lat: string | number;
    lng: string | number;
    name: string;
    category: string;
    isVisited: boolean;
}

export class MapRenderer {
    private map: LeafletMap | null = null;
    private markers: LeafletMarker[] = [];
    private elementId: string;

    constructor(elementId: string) {
        this.elementId = elementId;
    }

    init(center: [number, number], zoom: number): void {
        if (this.map) return;
        
        const element = document.getElementById(this.elementId);
        if (!element) return;

        this.map = L.map(this.elementId).setView(center, zoom);

        L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
            attribution: '&copy; OpenStreetMap &copy; CARTO',
            subdomains: 'abcd',
            maxZoom: 20
        }).addTo(this.map);
    }

    updateMarkers(shops: any[], visitedShops: string[]): void {
        if (!this.map) return;
        
        // Clear existing markers
        const mapInstance = this.map;
        this.markers.forEach(m => mapInstance.removeLayer(m));
        this.markers = [];

        // Add new markers
        shops.forEach(shop => {
            if (shop.lat && shop.lng) {
                const isVisited = visitedShops.includes(shop.id);
                // Handle both string and number types safely
                const lat = typeof shop.lat === 'number' ? shop.lat : parseFloat(shop.lat);
                const lng = typeof shop.lng === 'number' ? shop.lng : parseFloat(shop.lng);

                if (!isNaN(lat) && !isNaN(lng)) {
                    const marker = L.marker([lat, lng])
                        .addTo(mapInstance)
                        .bindPopup(`
                            <b>${shop.name}</b><br>
                            ${shop.category}<br>
                            ${isVisited ? '✅ 已踩點' : '⬜ 未踩點'}
                        `);
                    this.markers.push(marker);
                }
            }
        });
    }

    setView(center: [number, number], zoom: number): void {
        if (this.map) {
            this.map.setView(center, zoom);
        }
    }

    addCurrentLocationMarker(lat: number, lng: number): void {
        if (!this.map) return;
        
        // Remove existing location marker if any (optional, but good practice to track it)
        // For simplicity, we'll just add a new one with a distinct look
        
        const marker = L.marker([lat, lng], {
            icon: L.divIcon({
                className: 'current-location-marker',
                html: '<div style="background-color: #007bff; width: 12px; height: 12px; border-radius: 50%; border: 2px solid white; box-shadow: 0 0 4px rgba(0,0,0,0.3);"></div>',
                iconSize: [16, 16],
                iconAnchor: [8, 8]
            })
        }).addTo(this.map)
          .bindPopup('📍 你在這裡');
          
        this.markers.push(marker); // Track it so it gets cleared on updates if we want, or manage separately. 
        // Note: In current logic, updateMarkers clears *all* markers in this.markers. 
        // If we want this to persist across filter changes, we might need a separate track.
        // For now, let's treat it as a temporary marker that might be cleared if filters change, 
        // or we can add it to a separate layer.
        // Given the simplicity, let's just let it be cleared if user changes filters, 
        // or re-add it if we had state. 
        // BETTER APPROACH: Don't add to this.markers if we don't want it cleared by updateMarkers.
        // But updateMarkers clears everything. Let's just add it to map directly and maybe track in a separate property if we needed to remove it.
        // For this task, keeping it simples.
    }

    invalidateSize(): void {
        if (this.map) {
            this.map.invalidateSize();
        }
    }
}
