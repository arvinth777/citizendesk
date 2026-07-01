import { useState, useEffect } from "react";
import { Download, Loader2, Search, Map as MapIcon, Building2, MapPin, Globe2, Navigation } from "lucide-react";
import { clsx } from "clsx";
import { APIProvider, Map, useMap } from "@vis.gl/react-google-maps";
import { motion } from "motion/react";

type Category = 'Major Cities' | 'States' | 'National';

interface ParsedLocation {
  id: string;
  name: string;
  category: Category;
  url: string;
  rawPath: string;
}

const titleCase = (str: string) => {
  return str.toLowerCase().split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
};

function GeoJsonMapOverlay({ geoData }: { geoData: any }) {
  const map = useMap();
  useEffect(() => {
    if (!map || !geoData) return;
    
    // Clear old data
    map.data.forEach(feature => map.data.remove(feature));
    
    // Add new data
    map.data.addGeoJson(geoData);
    
    // Style the polygon
    map.data.setStyle({
      fillColor: '#007AFF',
      fillOpacity: 0.2,
      strokeColor: '#007AFF',
      strokeWeight: 2,
    });

    // Compute bounding box and pan/zoom
    const bounds = new window.google.maps.LatLngBounds();
    let hasGeometry = false;
    map.data.forEach((feature) => {
      const geom = feature.getGeometry();
      if (geom) {
        hasGeometry = true;
        geom.forEachLatLng((latLng) => {
          bounds.extend(latLng);
        });
      }
    });

    if (hasGeometry) {
      map.fitBounds(bounds);
    }
  }, [map, geoData]);

  return null;
}

export default function Admin() {
  const [locations, setLocations] = useState<ParsedLocation[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<Category>('Major Cities');
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [importStatus, setImportStatus] = useState<"idle" | "importing" | "success" | "error">("idle");
  const [geoData, setGeoData] = useState<any>(null);

  const MAP_API_KEY = (window as any).ENV?.VITE_GOOGLE_MAPS_API_KEY || (import.meta as any).env.VITE_GOOGLE_MAPS_API_KEY || "";

  const fetchShapefiles = async () => {
    setLoading(true);
    try {
      const repoUrl = 'https://api.github.com/repos/datta07/INDIAN-SHAPEFILES/git/trees/master?recursive=1';
      const response = await fetch(repoUrl);
      const data = await response.json();
      
      const parsed: ParsedLocation[] = [];

      data.tree.forEach((file: any) => {
        if (file.type !== 'blob' || !file.path.endsWith('.geojson')) return;
        
        const path = file.path;
        let category: Category | null = null;
        let name = "";

        if (path.startsWith('METROPOLITAN CITIES/')) {
          category = 'Major Cities';
          name = titleCase(path.split('/').pop()?.replace('.geojson', '') || "");
        } else if (path.startsWith('STATES/')) {
          category = 'States';
          const parts = path.split('/');
          const stateName = titleCase(parts[1]);
          let detail = parts.pop()?.replace('.geojson', '').replace(parts[1], '').trim() || "";
          detail = detail.replace(/_/g, ' ').trim();
          name = detail ? `${stateName} (${titleCase(detail)})` : stateName;
        } else if (path.startsWith('INDIA/')) {
          category = 'National';
          name = titleCase(path.split('/').pop()?.replace('.geojson', '').replace(/_/g, ' ') || "");
        }

        if (category && name) {
          parsed.push({
            id: path,
            name,
            category,
            url: `https://raw.githubusercontent.com/datta07/INDIAN-SHAPEFILES/master/${encodeURI(path)}`,
            rawPath: path
          });
        }
      });
      
      setLocations(parsed.sort((a, b) => a.name.localeCompare(b.name)));
    } catch (error) {
      console.error("Error fetching repo data:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchShapefiles();
  }, []);

  const handleImport = async (loc: ParsedLocation) => {
    setSelectedFile(loc.id);
    setImportStatus("importing");
    setGeoData(null);
    
    try {
      const response = await fetch(loc.url);
      const data = await response.json();
      
      console.log(`Imported ${data.features?.length || 0} boundaries for ${loc.name}`);
      setGeoData(data);
      
      setImportStatus("success");
      setTimeout(() => {
         setImportStatus("idle");
      }, 3000);
    } catch (error) {
      console.error("Failed to import jurisdiction:", error);
      setImportStatus("error");
    }
  };

  const filteredLocations = locations.filter(loc => 
    loc.category === activeTab && loc.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className="max-w-7xl mx-auto mt-6"
    >
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-slate-900 dark:text-white mb-2 tracking-tight" style={{ fontFamily: 'Syne, sans-serif' }}>
          Platform Configuration
        </h1>
        <p className="text-slate-600 dark:text-slate-400">
          Set up the official geographic boundaries for your civic instance.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-[calc(100vh-200px)]">
        {/* Left Column: UI */}
        <div className="bg-white dark:bg-slate-900 rounded-[32px] shadow-sm border border-slate-200 dark:border-slate-800 flex flex-col h-full overflow-hidden">
          <div className="p-6 sm:p-8 border-b border-slate-200 dark:border-slate-800 shrink-0">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-[#E5F0FF] dark:bg-[#007AFF]/20 text-[#007AFF] dark:text-[#66B2FF] rounded-xl flex items-center justify-center">
                <MapIcon className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-slate-900 dark:text-white" style={{ fontFamily: 'Syne, sans-serif' }}>
                  Active Jurisdiction
                </h2>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Select your region to enable map boundaries.
                </p>
              </div>
            </div>

            {/* Search */}
            <div className="relative mb-6">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input
                type="text"
                placeholder={`Search ${activeTab.toLowerCase()}...`}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-4 py-3.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#007AFF] text-slate-900 dark:text-white transition-colors"
              />
            </div>

            {/* Tabs */}
            <div className="flex flex-wrap gap-2">
              {[
                { id: 'Major Cities', icon: Building2, label: 'Cities' },
                { id: 'States', icon: MapPin, label: 'States' },
                { id: 'National', icon: Globe2, label: 'National' }
              ].map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => { setActiveTab(tab.id as Category); setSearchQuery(""); }}
                    className={clsx(
                      "flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-medium transition-colors",
                      isActive 
                        ? "bg-[#007AFF] text-white shadow-sm" 
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700"
                    )}
                  >
                    <Icon className="w-4 h-4" />
                    {tab.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* List */}
          <div className="flex-1 overflow-y-auto p-4 bg-slate-50/50 dark:bg-slate-950/50">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-20 text-slate-500">
                <Loader2 className="w-8 h-8 animate-spin mb-4 text-[#007AFF]" />
                <p className="font-medium text-slate-600 dark:text-slate-400">Loading boundaries...</p>
              </div>
            ) : filteredLocations.length === 0 ? (
              <div className="py-20 text-center text-slate-500">
                <MapIcon className="w-12 h-12 mx-auto mb-4 opacity-20" />
                <p className="font-medium text-slate-600 dark:text-slate-400">No matching jurisdictions found.</p>
                <p className="text-sm mt-1">Try selecting a different tab or adjusting your search.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
                {filteredLocations.map((loc) => {
                  const isSelected = selectedFile === loc.id;
                  return (
                    <div 
                      key={loc.id}
                      className={clsx(
                        "flex items-center justify-between p-4 rounded-xl border transition-all",
                        isSelected
                          ? "bg-[#E5F0FF] border-[#007AFF]/30 dark:bg-[#007AFF]/20 dark:border-[#007AFF]/50 shadow-md"
                          : "bg-white border-slate-200 hover:border-[#007AFF]/50 dark:bg-slate-900 dark:border-slate-800 dark:hover:border-[#007AFF]/50 shadow-sm"
                      )}
                    >
                      <div className="flex items-center gap-3 truncate pr-4">
                        <div className={clsx(
                          "w-8 h-8 rounded-lg flex items-center justify-center shrink-0",
                          isSelected ? "bg-[#E5F0FF] text-[#007AFF] dark:bg-[#007AFF]/30" : "bg-[#F2F2F7] dark:bg-slate-800 text-[#007AFF] dark:text-[#66B2FF]"
                        )}>
                          {activeTab === 'Major Cities' ? <Building2 className="w-4 h-4" /> : 
                           activeTab === 'States' ? <MapPin className="w-4 h-4" /> : <Globe2 className="w-4 h-4" />}
                        </div>
                        <span className={clsx(
                          "font-medium truncate",
                          isSelected ? "text-[#007AFF] font-bold" : "text-slate-900 dark:text-white"
                        )}>
                          {loc.name}
                        </span>
                      </div>
                      
                      <button
                        onClick={() => handleImport(loc)}
                        disabled={importStatus === 'importing'}
                        className={clsx(
                          "shrink-0 flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wide transition-all",
                          isSelected && importStatus === 'success'
                            ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                            : isSelected && importStatus === 'importing'
                            ? "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300"
                            : "bg-slate-100 text-slate-700 hover:bg-[#007AFF] hover:text-white dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-[#007AFF] dark:hover:text-white"
                        )}
                      >
                        {isSelected && importStatus === 'importing' ? (
                          <><Loader2 className="w-3 h-3 animate-spin" /> Fetching...</>
                        ) : isSelected && importStatus === 'success' ? (
                          <>Active</>
                        ) : (
                          <>Set</>
                        )}
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Map Preview */}
        <div className="bg-white dark:bg-slate-900 rounded-[32px] shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden relative min-h-[400px]">
          {!MAP_API_KEY ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-900 text-slate-500 p-8 text-center z-10">
              <Navigation className="w-12 h-12 mb-4 text-slate-300 dark:text-slate-700" />
              <h2 className="text-xl font-semibold text-slate-700 dark:text-slate-300 mb-2">Google Maps API Key Missing</h2>
              <p>Please add <code>VITE_GOOGLE_MAPS_API_KEY</code> to your environment.</p>
            </div>
          ) : (
            <APIProvider apiKey={MAP_API_KEY}>
              <Map
                mapId="citizendesk-admin-map"
                defaultZoom={4}
                defaultCenter={{ lat: 20.5937, lng: 78.9629 }}
                gestureHandling="greedy"
                disableDefaultUI={true}
                className="w-full h-full"
              >
                {geoData && <GeoJsonMapOverlay geoData={geoData} />}
              </Map>
              
              {!geoData && (
                <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center bg-slate-900/10 dark:bg-slate-900/50 backdrop-blur-[2px]">
                  <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-xl flex flex-col items-center text-center max-w-sm border border-slate-200 dark:border-slate-700">
                    <MapIcon className="w-10 h-10 text-slate-400 mb-3" />
                    <h3 className="font-bold text-slate-900 dark:text-white mb-1">No Jurisdiction Selected</h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                      Select a city or state from the list to preview its geographic boundaries on the map.
                    </p>
                  </div>
                </div>
              )}
            </APIProvider>
          )}
        </div>
      </div>
    </motion.div>
  );
}
