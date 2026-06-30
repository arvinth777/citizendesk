import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Camera, TrendingUp, CheckCircle, Activity, MapPin, CheckCircle2 } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import { formatDistanceToNow } from "date-fns";
import { collection, query, orderBy, limit, getDocs, getCountFromServer, where } from "firebase/firestore";
import { db } from "../lib/firebase";
import { clsx } from "clsx";

type RecentReport = {
  id: string;
  category: string;
  address: string;
  time: Date;
  status: string;
};

export default function Home() {
  const prefersReducedMotion = useReducedMotion();
  const [stats, setStats] = useState({ total: 0, resolved: 0, active: 0 });
  const [recentReports, setRecentReports] = useState<RecentReport[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchHomeData() {
      try {
        const reportsRef = collection(db, "reports");
        
        // Fetch stats using aggregation to save read costs
        const [totalSnap, resolvedSnap] = await Promise.all([
          getCountFromServer(reportsRef),
          getCountFromServer(query(reportsRef, where("status", "==", "resolved")))
        ]);
        
        const total = totalSnap.data().count;
        const resolved = resolvedSnap.data().count;
        
        setStats({
          total,
          resolved,
          active: total - resolved
        });

        // Fetch recent reports safely
        const recentQuery = query(reportsRef, orderBy("createdAt", "desc"), limit(4));
        const recentSnap = await getDocs(recentQuery);
        
        const recent = recentSnap.docs.map(doc => {
           const data = doc.data();
           // Geofuzzing: only show the broad neighborhood/street instead of full address
           const addressParts = data.address ? data.address.split(',') : ['Unknown location'];
           const fuzzedAddress = addressParts.slice(0, 2).join(',').trim();
           
           return {
             id: doc.id,
             category: data.category || 'other',
             address: fuzzedAddress || 'Unknown location',
             time: data.createdAt?.toDate ? data.createdAt.toDate() : new Date(),
             status: data.status || 'open',
           };
        });
        setRecentReports(recent);
      } catch (e) {
        console.error("Failed to load home page data:", e);
      } finally {
        setLoading(false);
      }
    }
    fetchHomeData();
  }, []);

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { 
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: prefersReducedMotion ? 0 : 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" } }
  };

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="pt-32 pb-20 px-6 max-w-[1200px] mx-auto text-center relative">
        <motion.div 
          initial="hidden"
          animate="visible"
          variants={containerVariants}
          className="relative z-10"
        >
          <motion.h1 variants={itemVariants} className="text-[52px] md:text-[72px] font-bold text-[#1C1C1E] dark:text-white leading-[1.05] tracking-tight mb-6">
            Better communities,<br className="hidden md:block"/> one report at a time.
          </motion.h1>
          <motion.p variants={itemVariants} className="text-[#8E8E93] dark:text-[#98989D] text-[20px] md:text-[24px] font-medium tracking-tight max-w-2xl mx-auto mb-10">
            Citizen Desk is your local hub for reporting issues, tracking progress, and improving your neighborhood together.
          </motion.p>
          <motion.div variants={itemVariants} className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              to="/report"
              className="w-full sm:w-auto px-8 py-4 bg-[#1C1C1E] dark:bg-white text-white dark:text-[#1C1C1E] text-[17px] font-semibold rounded-full transition-transform hover:scale-105 tracking-apple shadow-sm"
            >
              Report an Issue
            </Link>
            <Link
              to="/map"
              className="w-full sm:w-auto px-8 py-4 bg-white dark:bg-[#1C1C1E] text-[#1C1C1E] dark:text-white border border-slate-200 dark:border-slate-800 text-[17px] font-semibold rounded-full transition-colors hover:bg-slate-50 dark:hover:bg-slate-900 tracking-apple"
            >
              Explore Map
            </Link>
          </motion.div>
        </motion.div>
      </section>

      {/* Stats Bar */}
      <section className="px-6 max-w-[1000px] mx-auto mb-24">
        <motion.div 
           initial={{ opacity: 0, y: prefersReducedMotion ? 0 : 20 }}
           whileInView={{ opacity: 1, y: 0 }}
           viewport={{ once: true, margin: "-100px" }}
           className="grid grid-cols-1 md:grid-cols-3 gap-6"
        >
          {[
            { label: "Total Reports", value: stats.total, icon: Activity, color: "text-blue-500" },
            { label: "Active Issues", value: stats.active, icon: MapPin, color: "text-orange-500" },
            { label: "Resolved", value: stats.resolved, icon: CheckCircle2, color: "text-green-500" }
          ].map((stat, idx) => (
            <div key={idx} className="bg-white/60 dark:bg-slate-800/60 backdrop-blur-xl p-8 rounded-[32px] border border-black/5 dark:border-white/5 shadow-[0_8px_30px_rgb(0,0,0,0.04)] text-center flex flex-col items-center justify-center min-h-[180px]">
              {loading ? (
                <div className="w-16 h-10 bg-slate-200 dark:bg-slate-700 rounded-lg animate-pulse mb-2" />
              ) : (
                <div className="text-[48px] font-bold text-[#1C1C1E] dark:text-white tracking-tighter leading-none mb-2">
                  {stat.value.toLocaleString()}
                </div>
              )}
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-widest mt-1">
                <stat.icon className={`w-4 h-4 ${stat.color}`} />
                {stat.label}
              </div>
            </div>
          ))}
        </motion.div>
      </section>

      {/* Recent Activity */}
      <section className="px-6 max-w-[1200px] mx-auto mb-32">
        <div className="flex justify-between items-end mb-8">
          <div>
            <h2 className="text-[32px] font-bold tracking-tight text-[#1C1C1E] dark:text-white">Recent Activity</h2>
            <p className="text-slate-500 dark:text-slate-400 font-medium tracking-tight">Real-time reports from your community.</p>
          </div>
          <Link to="/map" className="hidden sm:flex text-[#007AFF] font-semibold hover:underline items-center gap-1">
            View Map &rarr;
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {loading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="bg-white dark:bg-slate-900 h-[140px] rounded-[24px] border border-slate-200 dark:border-slate-800 animate-pulse" />
            ))
          ) : recentReports.length > 0 ? (
            recentReports.map(report => (
              <Link to="/map" key={report.id} className="bg-white dark:bg-[#1C1C1E] p-6 rounded-[24px] border border-black/5 dark:border-white/10 shadow-sm hover:shadow-md hover:scale-[1.02] transition-all group flex flex-col justify-between min-h-[140px]">
                <div className="flex justify-between items-start mb-4">
                  <span className={clsx(
                    "px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider",
                    report.status === "resolved" ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" :
                    report.status === "in_progress" ? "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400" :
                    "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                  )}>
                    {report.category}
                  </span>
                  <span className="text-[12px] font-medium text-slate-400 whitespace-nowrap ml-2">
                    {formatDistanceToNow(report.time)}
                  </span>
                </div>
                <h3 className="font-semibold text-[17px] text-[#1C1C1E] dark:text-white leading-tight line-clamp-2 group-hover:text-[#007AFF] transition-colors">
                  {report.address}
                </h3>
              </Link>
            ))
          ) : (
             <div className="col-span-full py-12 text-center text-slate-500 font-medium bg-white dark:bg-slate-900 rounded-[24px] border border-slate-200 dark:border-slate-800">
                No recent activity in your area. Be the first to report an issue!
             </div>
          )}
        </div>
      </section>

      {/* How it Works / Marketing */}
      <section className="px-6 max-w-[1200px] mx-auto mb-32">
        <h2 className="text-[32px] font-bold tracking-tight text-[#1C1C1E] dark:text-white text-center mb-12">How it works</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {[
            { icon: Camera, title: "1. Snap & Report", desc: "See an issue? Take a quick photo and submit it to Citizen Desk in seconds." },
            { icon: TrendingUp, title: "2. Track Progress", desc: "Follow the status of your report as the community corroborates it and authorities respond." },
            { icon: CheckCircle, title: "3. See Results", desc: "Get notified when the issue is resolved and celebrate a better neighborhood." }
          ].map((step, idx) => (
            <motion.div 
              key={idx}
              initial={{ opacity: 0, y: prefersReducedMotion ? 0 : 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: idx * 0.1 }}
              className="text-center flex flex-col items-center"
            >
              <div className="w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-6">
                <step.icon className="w-8 h-8 text-[#1C1C1E] dark:text-white" strokeWidth={1.5} />
              </div>
              <h3 className="text-[22px] font-bold tracking-tight text-[#1C1C1E] dark:text-white mb-3">{step.title}</h3>
              <p className="text-[17px] text-[#8E8E93] tracking-tight leading-relaxed max-w-[280px]">{step.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>
    </div>
  );
}
