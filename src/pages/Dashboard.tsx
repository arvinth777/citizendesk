import { useState, useEffect } from "react";
import { User } from "firebase/auth";
import { collection, onSnapshot, query } from "firebase/firestore";
import { db } from "../lib/firebase";
import { Loader2, MapPin, BarChart3, LineChart as LineIcon } from "lucide-react";
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { motion } from "motion/react";

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
  corroborationCount: number;
  createdAt: any;
};

export default function Dashboard({ user }: { user: User }) {
  const [reports, setReports] = useState<ReportData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, "reports"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ReportData));
      setReports(data);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // Compute reports by category
  const categories = ["Pothole", "Garbage", "Streetlight", "Road damage", "Other"];
  const counts = categories.reduce((acc, cat) => {
    acc[cat] = 0;
    return acc;
  }, {} as Record<string, number>);

  reports.forEach(r => {
    const cat = r.category.toLowerCase().replace(/_/g, " ");
    let found = false;
    for (const c of categories) {
      if (cat.includes(c.toLowerCase()) || (c === "Road damage" && cat.includes("road")) || (c === "Streetlight" && cat.includes("street"))) {
        counts[c]++;
        found = true;
        break;
      }
    }
    if (!found) {
      counts["Other"]++;
    }
  });

  const categoryChartData = categories.map(c => ({
    name: c,
    count: counts[c]
  }));

  // Compute daily report counts for the last 14 days
  const last14DaysData = [];
  const now = new Date();
  for (let i = 13; i >= 0; i--) {
    const date = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
    const dateStr = date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    
    const count = reports.filter(r => {
      if (!r.createdAt) return false;
      const created = r.createdAt.toDate ? r.createdAt.toDate() : new Date(r.createdAt);
      return created.toDateString() === date.toDateString();
    }).length;

    last14DaysData.push({ date: dateStr, count });
  }

  // Compute top hotspots (group by coordinate proximity ~100m)
  const hotspotsMap = new Map<string, { address: string; lat: number; lng: number; count: number }>();
  reports.forEach(r => {
    if (!r.lat || !r.lng) return;
    const key = `${r.lat.toFixed(3)},${r.lng.toFixed(3)}`;
    if (hotspotsMap.has(key)) {
      hotspotsMap.get(key)!.count++;
    } else {
      hotspotsMap.set(key, {
        address: r.address || `Location near ${r.lat.toFixed(4)}, ${r.lng.toFixed(4)}`,
        lat: r.lat,
        lng: r.lng,
        count: 1
      });
    }
  });

  const topHotspots = Array.from(hotspotsMap.values())
    .sort((a, b) => b.count - a.count)
    .slice(0, 3);

  // Custom tooltips for nice Apple aesthetics
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-md p-3 rounded-2xl shadow-xl border border-slate-200/50 dark:border-slate-800 text-xs font-semibold text-slate-800 dark:text-slate-200">
          <p className="mb-1 text-[#8E8E93]">{payload[0].payload.name || payload[0].payload.date}</p>
          <p className="text-[#008080] text-sm">Count : {payload[0].value}</p>
        </div>
      );
    }
    return null;
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className="flex flex-col gap-8 pb-12"
    >
      {/* Title Header */}
      <div>
        <h1 className="text-[40px] font-bold text-slate-900 dark:text-white leading-tight tracking-tight" style={{ fontFamily: 'Syne, sans-serif' }}>Analytics overview</h1>
        <p className="text-slate-600 dark:text-slate-400 text-lg">System-wide dashboard and reports tracking</p>
      </div>

      {loading ? (
        <div className="flex-1 min-h-[50vh] flex items-center justify-center">
          <div className="flex flex-col items-center gap-3 text-slate-400">
            <Loader2 className="w-8 h-8 animate-spin text-[#008080]" />
            <span className="text-sm font-medium">Loading Stats...</span>
          </div>
        </div>
      ) : (
        <>
          {/* Charts Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Reports by Category Bar Chart */}
            <div className="bg-white dark:bg-slate-900 rounded-[28px] p-6 shadow-sm border border-slate-200/50 dark:border-slate-800 flex flex-col gap-6">
              <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-[#008080]" />
                Reports by category
              </h2>
              <div className="h-80 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={categoryChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(0,0,0,0.05)" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: "#8E8E93" }} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: "#8E8E93" }} allowDecimals={false} />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="count" fill="#008080" radius={[8, 8, 0, 0]} maxBarSize={50} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Daily Reports Line Chart */}
            <div className="bg-white dark:bg-slate-900 rounded-[28px] p-6 shadow-sm border border-slate-200/50 dark:border-slate-800 flex flex-col gap-6">
              <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <LineIcon className="w-5 h-5 text-[#22c55e]" />
                Last 14 days
              </h2>
              <div className="h-80 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={last14DaysData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(0,0,0,0.05)" />
                    <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: "#8E8E93" }} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: "#8E8E93" }} allowDecimals={false} />
                    <Tooltip content={<CustomTooltip />} />
                    <Line type="monotone" dataKey="count" stroke="#22c55e" strokeWidth={3} dot={{ r: 4, strokeWidth: 2, fill: "#22c55e" }} activeDot={{ r: 6 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Top Hotspots Section */}
          <div className="bg-white dark:bg-slate-900 rounded-[28px] p-6 shadow-sm border border-slate-200/50 dark:border-slate-800 flex flex-col gap-6">
            <div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <MapPin className="w-5 h-5 text-indigo-500" />
                Top hotspots
              </h2>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Locations (rounded to ~100m) with the most reports.</p>
            </div>
            
            <div className="flex flex-col gap-4">
              {topHotspots.length > 0 ? (
                topHotspots.map((spot, index) => (
                  <div 
                    key={index} 
                    className="flex items-center justify-between bg-slate-50 dark:bg-slate-800/30 p-5 rounded-2xl border border-slate-100 dark:border-slate-800/80 transition-colors hover:bg-slate-100/50 dark:hover:bg-slate-800/60"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-full bg-[#008080]/10 dark:bg-[#008080]/20 text-[#008080] font-bold flex items-center justify-center text-lg">
                        {index + 1}
                      </div>
                      <div className="flex flex-col">
                        <span className="text-base font-semibold text-slate-800 dark:text-slate-200 leading-tight">
                          {spot.address}
                        </span>
                        <span className="text-xs text-slate-400 font-medium mt-1">
                          {spot.lat.toFixed(4)}, {spot.lng.toFixed(4)}
                        </span>
                      </div>
                    </div>
                    <div className="text-right flex flex-col justify-center">
                      <span className="text-2xl font-extrabold text-[#008080]">
                        {spot.count}
                      </span>
                      <span className="text-[10px] font-bold text-[#8E8E93] uppercase tracking-wider mt-0.5">
                        {spot.count === 1 ? 'Report' : 'Reports'}
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-slate-400 dark:text-slate-500 font-medium">
                  No hotspots detected in your area yet.
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </motion.div>
  );
}
