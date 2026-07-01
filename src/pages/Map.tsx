import { useState, useEffect, useRef } from "react";
import { User } from "firebase/auth";
import { collection, onSnapshot, query, doc, updateDoc, getDoc, where, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../lib/firebase";
import { lazy, Suspense } from "react";
import { APIProvider, Map, AdvancedMarker, useMap, useMapsLibrary } from "@vis.gl/react-google-maps";
import { Loader2, Navigation, Search, MapPin, ThumbsUp, Share2, ShieldCheck, Layers } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import CivicBadge from "../components/CivicBadge";
import Lightbox from "../components/Lightbox";
import ReportDetailView from "../components/ReportDetailView";
import { motion } from "motion/react";

const HeatmapOverlay = lazy(() => import('../components/HeatmapOverlay'));

type ReportData = {
  id: string;
  category: string;
  severity: number;
  status: string;
  lat: number;
  lng: number;
  address: string;
  photoUrl: string;
  description: string;
  reporterName: string;
  reporterId: string;
  priorityScore: number;
  escalationSummary: string;
  corroborationCount: number;
  createdAt: any;
};



export default function MapPage({ user }: { user: User }) {
  const [reports, setReports] = useState<ReportData[]>([]);
  const [selectedReport, setSelectedReport] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("All");
  const [categoryFilter, setCategoryFilter] = useState("All categories");
  const [showHeatmap, setShowHeatmap] = useState(false);
  const [reporterResolvedCount, setReporterResolvedCount] = useState(0);
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);
  const [initialSelectDone, setInitialSelectDone] = useState(false);

  useEffect(() => {
    const q = query(collection(db, "reports"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ReportData));
      setReports(data);
      setLoading(false);
      
      if (selectedReport) {
        const updated = data.find(r => r.id === selectedReport.id);
        if (updated) setSelectedReport(updated);
        else setSelectedReport(null);
      }
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!initialSelectDone && reports.length > 0) {
      setSelectedReport(reports[0]);
      setInitialSelectDone(true);
    }
  }, [reports, initialSelectDone]);

  useEffect(() => {
    if (!selectedReport?.reporterId) {
       setReporterResolvedCount(0);
       return;
    }
    const q = query(collection(db, "reports"), where("reporterId", "==", selectedReport.reporterId), where("status", "==", "resolved"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
       setReporterResolvedCount(snapshot.docs.length);
    });
    return () => unsubscribe();
  }, [selectedReport?.reporterId]);

  const getPinColor = (status: string) => {
    switch (status) {
      case "open": return "#ef4444";
      case "verified": return "#3b82f6";
      case "in_progress": return "#f59e0b";
      case "resolved": return "#10b981";
      default: return "#64748b";
    }
  };

  const [searchQuery, setSearchQuery] = useState("");

  const handleCorroborate = async (reportId: string) => {
    try {
      const docRef = doc(db, "reports", reportId);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
         const currentCount = docSnap.data().corroborationCount || 0;
         await updateDoc(docRef, {
           corroborationCount: currentCount + 1,
           status: "verified"
         });
         await addDoc(collection(db, `reports/${reportId}/activities`), {
            type: "corroboration",
            userId: user.uid,
            userName: user.displayName || "Anonymous",
            timestamp: serverTimestamp()
         });
      }
    } catch (e) {
      console.error(e);
      alert("Failed to corroborate.");
    }
  };

  const handleShare = async () => {
    if (!selectedReport) return;
    if (navigator.share) {
        try {
            await navigator.share({
                title: 'Citizen Desk Report',
                text: `Check out this civic issue: ${selectedReport.description} at ${selectedReport.address}`,
                url: window.location.href,
            });
        } catch (error) {
            console.log('Error sharing', error);
        }
    } else {
        alert("Web Share API is not supported in your browser.");
    }
  };

  const filteredReports = reports.filter(r => {
    let statusMatch = true;
    if (filter === "Open") statusMatch = r.status === "open";
    if (filter === "Verified") statusMatch = r.status === "verified";
    if (filter === "In progress") statusMatch = r.status === "in_progress";
    if (filter === "Resolved") statusMatch = r.status === "resolved";

    let categoryMatch = true;
    if (categoryFilter !== "All categories") {
       categoryMatch = r.category.toLowerCase().replace("_", " ") === categoryFilter.toLowerCase();
    }

    let searchMatch = true;
    if (searchQuery.trim()) {
       const q = searchQuery.toLowerCase();
       searchMatch = r.address?.toLowerCase().includes(q) || r.description?.toLowerCase().includes(q);
    }

    return statusMatch && categoryMatch && searchMatch;
  });



  const defaultCenter = reports.length > 0 ? { lat: reports[0].lat, lng: reports[0].lng } : { lat: 12.9716, lng: 77.5946 };
  const MAP_API_KEY = (window as any).ENV?.VITE_GOOGLE_MAPS_API_KEY || (import.meta as any).env.VITE_GOOGLE_MAPS_API_KEY || "";

  const validReports = filteredReports.filter(r => typeof r.lat === 'number' && typeof r.lng === 'number' && !isNaN(r.lat) && !isNaN(r.lng));

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className="flex flex-col h-[calc(100dvh-120px)] md:h-[calc(100vh-100px)] mt-2"
    >
      <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-6 gap-4">
        <div>
          <h1 className="text-[40px] font-bold text-slate-900 dark:text-white leading-tight tracking-tight" style={{ fontFamily: 'Syne, sans-serif' }}>Live map</h1>
          <p className="text-slate-600 dark:text-slate-400 text-lg">{filteredReports.length} of {reports.length} reports shown</p>
        </div>
        <div className="flex flex-wrap items-center gap-2 mb-1">
          {["All", "Open", "Verified", "In progress", "Resolved"].map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-5 py-2.5 rounded-full text-sm font-medium transition-colors ${filter === f ? 'bg-[#1C1C1E] dark:bg-white text-white dark:text-[#1C1C1E] shadow-sm' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'}`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-6">
         <div className="relative flex-1 max-w-3xl">
           <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
           <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search address..." className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-full py-3.5 pl-12 pr-6 text-slate-900 dark:text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-[#1C1C1E] dark:focus:ring-white transition-colors" />
         </div>
         <select 
            value={categoryFilter} 
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-full py-3.5 px-6 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#1C1C1E] dark:focus:ring-white appearance-none transition-colors cursor-pointer"
         >
            <option>All categories</option>
            <option>Pothole</option>
            <option>Garbage</option>
            <option>Streetlight</option>
            <option>Road damage</option>
            <option>Sanitation</option>
            <option>Public Nuisance</option>
            <option>Infrastructure</option>
            <option>Other</option>
         </select>
         <button 
           id="tour-map-heatmap"
           onClick={() => setShowHeatmap(!showHeatmap)}
           className={`flex items-center gap-2 px-6 py-3.5 rounded-full border transition-colors ${showHeatmap ? 'bg-[#1C1C1E]/10 dark:bg-white/20 border-[#1C1C1E]/30 dark:border-white/30 text-[#1C1C1E] dark:text-white' : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'}`}
         >
           <Layers className="w-5 h-5" />
           <span className="font-medium text-sm">Heatmap</span>
         </button>
      </div>

      <div className="flex-1 flex gap-6 overflow-hidden">
        <div className="flex-1 bg-white dark:bg-slate-900 rounded-[32px] shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden relative min-h-0">
          {!MAP_API_KEY ? (
            <div className="absolute inset-0 flex items-center justify-center bg-slate-100 dark:bg-slate-800">
              <div className="text-center p-6 bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 max-w-sm">
                <MapPin className="w-10 h-10 text-slate-400 mx-auto mb-3" />
                <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">Google Maps Key Missing</h3>
                <p className="text-sm text-slate-600 dark:text-slate-400">Please add <code>VITE_GOOGLE_MAPS_API_KEY</code> to your Environment Secrets.</p>
              </div>
            </div>
          ) : loading ? (
            <div className="absolute inset-0 flex items-center justify-center bg-slate-100 dark:bg-slate-800 animate-pulse">
              <div className="flex flex-col items-center gap-3 text-slate-400">
                <Loader2 className="w-8 h-8 animate-spin text-[#008080]" />
                <span className="text-sm font-medium">Loading Map Data...</span>
              </div>
            </div>
          ) : (
            <APIProvider apiKey={MAP_API_KEY}>
              <Map
                defaultCenter={defaultCenter}
                defaultZoom={13}
                mapId="DEMO_MAP_ID"
                className="w-full h-full"
                disableDefaultUI={true}
                gestureHandling="greedy"
              >
                {!showHeatmap && validReports.map((report) => (
                  <AdvancedMarker
                    key={report.id}
                    position={{ lat: report.lat, lng: report.lng }}
                    onClick={() => setSelectedReport(report)}
                    zIndex={selectedReport?.id === report.id ? 100 : 1}
                  >
                    {selectedReport?.id === report.id ? (
                      <div className="relative flex items-center justify-center">
                        <span className="absolute inline-flex h-16 w-16 rounded-full bg-red-400/20 dark:bg-red-500/30 animate-ping" />
                        <div className="w-10 h-10 rounded-full bg-red-500 border-4 border-white dark:border-slate-850 shadow-xl flex items-center justify-center z-20">
                          <MapPin className="w-5 h-5 text-white" />
                        </div>
                      </div>
                    ) : (
                      <div 
                        className="w-5 h-5 rounded-full border-2 border-white dark:border-slate-800 shadow-md hover:scale-110 active:scale-95 transition-transform"
                        style={{ backgroundColor: getPinColor(report.status) }}
                      />
                    )}
                  </AdvancedMarker>
                ))}
                
                {showHeatmap && (
                  <Suspense fallback={null}>
                    <HeatmapOverlay data={validReports} visible={true} />
                  </Suspense>
                )}
              </Map>
              
              {/* Status Legend Overlay */}
              <div className="absolute bottom-6 left-6 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md p-4 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700/50 z-10 pointer-events-none">
                <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider mb-3">Status legend</h4>
                <div className="flex flex-col gap-2.5">
                  <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-[#ef4444]"></div><span className="text-sm font-medium text-slate-700 dark:text-slate-300">Open</span></div>
                  <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-[#3b82f6]"></div><span className="text-sm font-medium text-slate-700 dark:text-slate-300">Verified</span></div>
                  <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-[#f59e0b]"></div><span className="text-sm font-medium text-slate-700 dark:text-slate-300">In progress</span></div>
                  <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-[#10b981]"></div><span className="text-sm font-medium text-slate-700 dark:text-slate-300">Resolved</span></div>
                </div>
              </div>
            </APIProvider>
          )}
        </div>

        {selectedReport && (
          <ReportDetailView
            selectedReport={selectedReport}
            reporterResolvedCount={reporterResolvedCount}
            user={user}
            onClose={() => setSelectedReport(null)}
            onCorroborate={handleCorroborate}
            onShare={handleShare}
          />
        )}
      </div>
    </motion.div>
  );
}
