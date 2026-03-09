import { MapContainer, TileLayer, CircleMarker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

// Approximate GPS coordinates for Chennai areas
const AREA_COORDS = {
  "Adyar": [13.0012, 80.2565], "Alandur": [13.0031, 80.2030], "Ambattur": [13.1143, 80.1548],
  "Anna Nagar": [13.0850, 80.2101], "Ashok Nagar": [13.0374, 80.2123], "Avadi": [13.1143, 80.1024],
  "Ayanavaram": [13.0976, 80.2343], "Besant Nagar": [13.0003, 80.2736], "Chetpet": [13.0714, 80.2417],
  "Chromepet": [12.9516, 80.1409], "Egmore": [13.0732, 80.2609], "Guindy": [13.0067, 80.2206],
  "K.K. Nagar": [13.0400, 80.1983], "Kilpauk": [13.0825, 80.2424], "Kodambakkam": [13.0521, 80.2255],
  "Kolathur": [13.1275, 80.2116], "Korattur": [13.1132, 80.1818], "Kotturpuram": [13.0244, 80.2400], 
  "Koyambedu": [13.0667, 80.1914], "Madhavaram": [13.1488, 80.2306], "Madipakkam": [12.9647, 80.1961], 
  "Medavakkam": [12.9171, 80.1923], "Mogappair": [13.0837, 80.1746], "Mylapore": [13.0368, 80.2676], 
  "Nandanam": [13.0305, 80.2389], "Nungambakkam": [13.0595, 80.2425], "Pallavaram": [12.9675, 80.1491], 
  "Perambur": [13.1112, 80.2443], "Perungudi": [12.9654, 80.2461], "Poonamallee": [13.0473, 80.0945], 
  "Porur": [13.0382, 80.1565], "Purasawalkam": [13.0857, 80.2543], "Red Hills": [13.1802, 80.1856], 
  "Royapettah": [13.0543, 80.2657], "Royapuram": [13.1126, 80.2952], "Saidapet": [13.0213, 80.2231],
  "Sholinganallur": [12.9010, 80.2279], "T. Nagar": [13.0418, 80.2341], "Tambaram": [12.9249, 80.1000], 
  "Teynampet": [13.0396, 80.2497], "Thiruvanmiyur": [12.9860, 80.2605], "Tondiarpet": [13.1273, 80.2858],
  "Triplicane": [13.0588, 80.2757], "Vadapalani": [13.0500, 80.2121], "Valasaravakkam": [13.0396, 80.1755], 
  "Velachery": [12.9754, 80.2206], "Villivakkam": [13.1075, 80.2084], "Virugambakkam": [13.0485, 80.1906], 
  "Washermanpet": [13.1090, 80.2858], "West Mambalam": [13.0361, 80.2241]
};

export default function SafetyMap({ data }) {
  return (
    <div className="h-[450px] w-full rounded-2xl overflow-hidden shadow-inner border border-slate-200 dark:border-slate-700">
      <MapContainer center={[13.0500, 80.2200]} zoom={11} className="h-full w-full z-0">
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
          attribution='&copy; OpenStreetMap &copy; CartoDB'
        />
        {data.map((area) => {
          const coords = AREA_COORDS[area.name];
          if (!coords) return null; // Skip if coordinate mapping missing
          
          const isHighRisk = area.status.includes('High Risk');
          const isCaution = area.status.includes('Caution');
          
          // Set color and size of the heatmap circles
          const color = isHighRisk ? '#ef4444' : (isCaution ? '#f59e0b' : '#10b981'); // Red / Yellow / Green
          const radius = isHighRisk ? 28 : (isCaution ? 18 : 8);

          return (
            <CircleMarker
              key={area.name}
              center={coords}
              radius={radius}
              pathOptions={{ fillColor: color, color: color, fillOpacity: 0.5, weight: 1 }}
            >
              <Popup className="font-sans">
                <div className="text-center p-1">
                  <strong className="block text-sm mb-1 text-slate-800">{area.name}</strong>
                  <span className={`text-xs font-bold px-2 py-1 rounded-md ${isHighRisk ? 'bg-red-100 text-red-700' : isCaution ? 'bg-yellow-100 text-yellow-700' : 'bg-green-100 text-green-700'}`}>
                    {area.count} Incidents
                  </span>
                </div>
              </Popup>
            </CircleMarker>
          );
        })}
      </MapContainer>
    </div>
  );
}