"use client"
import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix for missing Leaflet icons
const fixIcons = () => {
  delete L.Icon.Default.prototype._getIconUrl;
  L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  });
};

function LocationMarker({ location, setLocation }) {
  const map = useMapEvents({
    click(e) {
      const { lat, lng } = e.latlng;
      setLocation({ lat, lng });
      map.flyTo([lat, lng], map.getZoom());
    },
  });

  // If location exists, center map on it
  useEffect(() => {
    if (location) {
      map.flyTo([location.lat, location.lng], map.getZoom());
    }
  }, [location, map]);

  return location ? <Marker position={[location.lat, location.lng]} /> : null;
}

export default function MapPicker({ location, setLocation }) {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    fixIcons();
    setIsMounted(true);
  }, []);

  // Prevent map from loading on server or before icons are ready
  if (!isMounted) {
    return (
      <div className="h-64 w-full bg-slate-100 rounded-xl flex items-center justify-center text-slate-400 animate-pulse">
        Loading Map...
      </div>
    );
  }

  return (
    <div className="h-64 w-full rounded-xl overflow-hidden border border-slate-200 z-0 relative">
      <MapContainer
        // This random key forces a fresh map instance if the component re-mounts
        key={isMounted ? "map-loaded" : "map-loading"}
        center={location ? [location.lat, location.lng] : [13.0827, 80.2707]} // Default: Chennai
        zoom={13}
        style={{ height: "100%", width: "100%" }}
      >
        <TileLayer
          attribution='&copy; OpenStreetMap contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <LocationMarker location={location} setLocation={setLocation} />
      </MapContainer>
      
      {!location && (
        <div className="absolute bottom-2 left-0 right-0 text-center pointer-events-none z-[1000]">
           <span className="bg-white/90 px-3 py-1 rounded-full text-xs text-slate-600 font-bold shadow-sm border border-slate-300">
             Tap anywhere to pin location
           </span>
        </div>
      )}
    </div>
  );
}