import React, { useState, useEffect, useRef, useMemo } from "react";
import { User } from "firebase/auth";
import { collection, onSnapshot, query, where, doc, updateDoc, Timestamp } from "firebase/firestore";
import { db } from "../lib/firebase";
import { format } from "date-fns";
import { Loader2, Camera, CheckCircle, MapPin, Search } from "lucide-react";
import Lightbox from "../components/Lightbox";
import { motion } from "motion/react";

export default function MyReports({ user }: { user: User }) {
  const [reports, setReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [resolvingId, setResolvingId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);

  useEffect(() => {
    const q = query(collection(db, "reports"), where("reporterId", "==", user.uid));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as any));
      // Sort by creation date descending
      data.sort((a, b) => {
         if (!a.createdAt || !b.createdAt) return 0;
         const aTime = a.createdAt.toMillis ? a.createdAt.toMillis() : new Date(a.createdAt).getTime();
         const bTime = b.createdAt.toMillis ? b.createdAt.toMillis() : new Date(b.createdAt).getTime();
         return bTime - aTime;
      });
      setReports(data);
      setLoading(false);
    });
    return () => unsubscribe();
  }, [user.uid]);

  const filteredReports = useMemo(() => {
    if (!searchQuery.trim()) return reports;
    const q = searchQuery.toLowerCase();
    return reports.filter(r => 
       r.address?.toLowerCase().includes(q) || 
       r.description?.toLowerCase().includes(q)
    );
  }, [reports, searchQuery]);

  const handleResolveUpload = async (e: React.ChangeEvent<HTMLInputElement>, reportId: string) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = async (ev) => {
        const photoDataUrl = ev.target?.result as string;
        try {
          const docRef = doc(db, "reports", reportId);
          await updateDoc(docRef, {
            status: "resolved",
            resolvedAt: Timestamp.now(),
            resolvedPhotoUrl: photoDataUrl
          });
        } catch (error) {
          console.error(error);
          alert("Error resolving report.");
        } finally {
          setResolvingId(null);
        }
      };
      reader.readAsDataURL(file);
    } else {
      setResolvingId(null);
    }
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto mt-6 space-y-8 animate-pulse">
        <div className="mb-8">
          <div className="h-10 bg-slate-200 dark:bg-slate-800 rounded w-48 mb-4"></div>
          <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded w-64"></div>
        </div>
        <div className="relative mb-6">
           <div className="h-12 bg-slate-200 dark:bg-slate-800 rounded-full w-full"></div>
        </div>
        <div className="grid grid-cols-1 gap-6">
           {[1, 2, 3].map(i => (
             <div key={i} className="bg-white dark:bg-slate-900 rounded-[32px] shadow-sm border border-slate-200 dark:border-slate-800 p-6 sm:p-8 flex flex-col sm:flex-row gap-8">
                <div className="sm:w-64 h-48 flex-shrink-0 rounded-2xl bg-slate-200 dark:bg-slate-800"></div>
                <div className="flex-1 flex flex-col space-y-4">
                   <div className="flex gap-2">
                     <div className="h-6 w-20 bg-slate-200 dark:bg-slate-800 rounded-full"></div>
                     <div className="h-6 w-24 bg-slate-200 dark:bg-slate-800 rounded-full"></div>
                   </div>
                   <div className="h-6 w-3/4 bg-slate-200 dark:bg-slate-800 rounded"></div>
                   <div className="h-4 w-full bg-slate-200 dark:bg-slate-800 rounded"></div>
                   <div className="h-4 w-1/2 bg-slate-200 dark:bg-slate-800 rounded"></div>
                </div>
             </div>
           ))}
        </div>
      </div>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className="max-w-4xl mx-auto mt-6 space-y-8"
    >
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-slate-900 dark:text-white mb-2 tracking-tight">My reports</h1>
        <p className="text-slate-600 dark:text-slate-400">Track the status of your civic contributions.</p>
      </div>

      <div className="relative mb-6">
         <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
         <input 
            type="text" 
            value={searchQuery} 
            onChange={(e) => setSearchQuery(e.target.value)} 
            placeholder="Search by address or description..." 
            className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-full py-3.5 pl-12 pr-6 text-slate-900 dark:text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-[#007AFF] transition-colors" 
         />
      </div>
      
      {filteredReports.length === 0 ? (
         <div className="bg-white dark:bg-slate-900 rounded-[32px] p-12 text-center text-slate-500 dark:text-slate-400 shadow-sm border border-slate-200 dark:border-slate-800">
            {reports.length === 0 ? "You haven't submitted any reports yet." : "No reports found matching your search."}
         </div>
      ) : (
        <div className="grid grid-cols-1 gap-6">
          {filteredReports.map(report => (
            <div key={report.id} className="bg-white dark:bg-slate-900 rounded-[32px] shadow-sm border border-slate-200 dark:border-slate-800 p-6 sm:p-8 flex flex-col sm:flex-row gap-8 hover:border-[#007AFF]/30 transition-colors">
              <div className="sm:w-64 h-48 flex-shrink-0 rounded-2xl overflow-hidden bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                {report.photoUrl ? (
                  <>
                    <img 
                      src={report.photoUrl} 
                      alt="Report" 
                      crossOrigin="anonymous"
                      className="w-full h-full object-cover cursor-pointer hover:opacity-90 transition-opacity" 
                      onClick={() => setLightboxImage(report.photoUrl)}
                    />
                  </>
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-slate-400">No Photo</div>
                )}
              </div>
              
              <div className="flex-1 flex flex-col">
                <div className="flex items-center gap-3 mb-4">
                     <span className={`px-3 py-1 text-sm font-semibold rounded-full flex items-center gap-1 ${
                        report.status === 'resolved' ? 'bg-[#dcfce7] dark:bg-[#14532d] text-[#166534] dark:text-[#4ade80]' :
                        report.status === 'in_progress' ? 'bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400' :
                        report.status === 'verified' ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400' :
                        'bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400'
                     }`}>
                       {report.status === 'open' && <div className="w-2 h-2 rounded-full bg-red-600 dark:bg-red-500" />}
                       {report.status.replace("_", " ")}
                     </span>
                     <span className="px-3 py-1 bg-[#E5F0FF] dark:bg-[#007AFF]/20 text-[#007AFF] dark:text-[#66B2FF] text-sm font-semibold rounded-full">
                       {report.category.charAt(0).toUpperCase() + report.category.slice(1).replace("_", " ")}
                     </span>
                     <span className="text-sm text-slate-500 dark:text-slate-400 ml-auto font-medium">
                       {report.createdAt ? format(report.createdAt.toDate ? report.createdAt.toDate() : new Date(report.createdAt), "MMM d, yyyy") : ""}
                     </span>
                </div>
                
                <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2 leading-tight tracking-tight">{report.description}</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 mb-auto flex items-start gap-1.5"><MapPin className="w-4 h-4 mt-0.5 flex-shrink-0" /> {report.address}</p>
                
                {report.status !== "resolved" && (
                   <div className="mt-6 pt-6 border-t border-slate-100 dark:border-slate-800">
                     <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        id={`resolve-upload-${report.id}`}
                        onChange={(e) => handleResolveUpload(e, report.id)}
                     />
                     <button
                        onClick={() => {
                           setResolvingId(report.id);
                           document.getElementById(`resolve-upload-${report.id}`)?.click();
                        }}
                        className="inline-flex items-center gap-2 px-5 py-3 text-sm font-semibold text-[#166534] dark:text-[#4ade80] bg-[#dcfce7] dark:bg-[#14532d] hover:bg-[#bbf7d0] dark:hover:bg-[#166534] rounded-xl transition-colors"
                     >
                        {resolvingId === report.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Camera className="w-4 h-4" />}
                        Mark as resolved with photo
                     </button>
                   </div>
                )}
                
                {report.status === "resolved" && report.resolvedPhotoUrl && (
                   <div className="mt-6 pt-6 border-t border-slate-100 dark:border-slate-800 flex items-start gap-4">
                      <div className="flex-shrink-0">
                         <div className="w-10 h-10 bg-[#dcfce7] dark:bg-[#14532d] text-[#166534] dark:text-[#4ade80] rounded-full flex items-center justify-center">
                            <CheckCircle className="w-5 h-5" />
                         </div>
                      </div>
                      <div>
                         <p className="text-sm font-bold text-slate-900 dark:text-white">Resolved on {report.resolvedAt ? format(report.resolvedAt.toDate ? report.resolvedAt.toDate() : new Date(report.resolvedAt), "MMM d, yyyy") : ""}</p>
                         <img 
                           src={report.resolvedPhotoUrl} 
                           alt="Resolution" 
                           crossOrigin="anonymous"
                           className="mt-3 h-24 w-32 object-cover rounded-xl border border-slate-200 dark:border-slate-700 cursor-pointer hover:opacity-90 transition-opacity" 
                           onClick={() => setLightboxImage(report.resolvedPhotoUrl)}
                         />
                      </div>
                   </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
      
      {lightboxImage && (
        <Lightbox src={lightboxImage} alt="Full Screen" onClose={() => setLightboxImage(null)} />
      )}
    </motion.div>
  );
}
