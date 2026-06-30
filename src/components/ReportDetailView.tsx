import { useState, useRef } from "react";
import { User } from "firebase/auth";
import { MapPin, ThumbsUp, Share2, FileDown, X, Building2, Mail, Phone, Send, Leaf } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import CivicBadge from "./CivicBadge";
import ReportActivityLog from "./ReportActivityLog";
import Lightbox from "./Lightbox";
import { motion, AnimatePresence } from "motion/react";
import { toPng } from "html-to-image";
import jsPDF from "jspdf";

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
  municipalityInfo?: any;
};

interface ReportDetailViewProps {
  selectedReport: ReportData;
  reporterResolvedCount: number;
  user: User;
  onClose: () => void;
  onCorroborate: (id: string) => void;
  onShare: () => void;
}

export default function ReportDetailView({
  selectedReport,
  reporterResolvedCount,
  user,
  onClose,
  onCorroborate,
  onShare
}: ReportDetailViewProps) {
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);

  const handleExportPDF = async () => {
    if (!printRef.current) return;
    setIsExporting(true);
    try {
      const element = printRef.current;
      
      const width = element.offsetWidth;
      const height = element.scrollHeight;

      const imgData = await toPng(element, {
        pixelRatio: 2,
        backgroundColor: document.documentElement.classList.contains('dark') ? '#0f172a' : '#ffffff'
      });
      
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'px',
        format: [width, height]
      });
      
      pdf.addImage(imgData, 'PNG', 0, 0, width, height);
      pdf.save(`Citizen-Desk-Report-${selectedReport.id.substring(0, 8)}.pdf`);
    } catch (err) {
      console.error("Failed to export PDF", err);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <AnimatePresence>
      {/* Mobile Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.5 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/50 z-40 md:hidden"
        onClick={onClose}
      />
      
      <motion.div
        drag="y"
        dragConstraints={{ top: 0, bottom: 0 }}
        dragElastic={0.2}
        onDragEnd={(e, info) => {
          if (info.offset.y > 100 || info.velocity.y > 500) {
            onClose();
          }
        }}
        initial={{ y: "100%", opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: "100%", opacity: 0 }}
        transition={{ type: "spring", damping: 25, stiffness: 200 }}
        className="fixed bottom-0 left-0 right-0 h-[85vh] md:h-auto md:relative md:bottom-auto md:left-auto md:right-auto md:w-[420px] bg-white dark:bg-slate-900 md:rounded-[32px] rounded-t-[32px] shadow-2xl md:shadow-sm border border-slate-200 dark:border-slate-800 p-6 md:p-8 flex flex-col z-50 overflow-hidden"
      >
        <div className="w-12 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full mx-auto mb-6 md:hidden" />
        
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 md:top-6 md:right-6 p-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full text-slate-500 dark:text-slate-400 transition-colors z-10"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex-1 overflow-y-auto overflow-x-hidden pr-2 -mr-2 pb-10 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]" ref={printRef}>
          {selectedReport.photoUrl && (
            <>
                {selectedReport.photoUrl.match(/\.(mp4|webm|ogg)$/i) ? (
                  <video 
                    src={selectedReport.photoUrl} 
                    controls 
                    className="w-full max-h-[400px] object-cover rounded-2xl mb-6 bg-black" 
                  />
                ) : (
                  <img 
                    src={selectedReport.photoUrl} 
                    alt="Issue" 
                    crossOrigin="anonymous"
                    className="w-full h-[200px] object-cover rounded-2xl mb-6 cursor-pointer hover:opacity-90 transition-opacity" 
                    onClick={() => setLightboxImage(selectedReport.photoUrl)}
                  />
                )}
                {lightboxImage && (
                  <Lightbox src={lightboxImage} alt="Issue Full Screen" onClose={() => setLightboxImage(null)} />
                )}
            </>
          )}
          
          <div className="flex items-center gap-3 mb-4 flex-wrap">
              <div className="px-3 py-1 bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-full text-sm font-semibold flex items-center gap-1">
                <div className="w-2 h-2 rounded-full bg-red-600 dark:bg-red-500" />
                {selectedReport.status.replace("_", " ")}
              </div>
              <div className={`px-3 py-1 rounded-full text-sm font-semibold flex items-center gap-1.5 ${selectedReport.category === 'sanitation' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 border border-green-200 dark:border-green-800/50' : 'bg-[#E5F0FF] dark:bg-[#007AFF]/20 text-[#007AFF] dark:text-[#66B2FF]'}`}>
                {selectedReport.category === 'sanitation' && <Leaf className="w-3.5 h-3.5" />}
                {selectedReport.category.charAt(0).toUpperCase() + selectedReport.category.slice(1).replace(/_/g, " ")}
              </div>
              <div className="text-sm text-slate-500 dark:text-slate-400 ml-auto">
                {selectedReport.createdAt ? formatDistanceToNow(selectedReport.createdAt.toDate ? selectedReport.createdAt.toDate() : new Date(selectedReport.createdAt), { addSuffix: true }) : ""}
              </div>
          </div>

          <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2 flex items-start gap-2 tracking-tight">
              <MapPin className="w-6 h-6 text-[#007AFF] mt-1 flex-shrink-0" />
              {selectedReport.address}
          </h2>

          <div className="flex items-center gap-1 mb-6 pl-8">
              {[1, 2, 3, 4, 5].map(i => (
                <div key={i} className={`h-2 rounded-full ${i <= selectedReport.severity ? 'bg-[#007AFF] w-8' : 'bg-slate-200 dark:bg-slate-700 w-4'}`} />
              ))}
              <span className="text-sm text-slate-500 dark:text-slate-400 ml-2">{selectedReport.severity}/5</span>
          </div>

          <p className="text-slate-600 dark:text-slate-300 mb-8 leading-relaxed">
              {selectedReport.description}
          </p>

          <div className="bg-[#f8fafc] dark:bg-slate-800 rounded-2xl p-6 mb-6">
              <h4 className="text-sm font-bold text-slate-900 dark:text-white mb-2">Escalation draft</h4>
              <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                {selectedReport.escalationSummary}
              </p>
          </div>

          {selectedReport.municipalityInfo && (
            <div className="bg-indigo-50 dark:bg-indigo-900/10 rounded-2xl p-6 mb-6 border border-indigo-100 dark:border-indigo-900/30">
              <h4 className="text-sm font-bold text-indigo-900 dark:text-indigo-300 mb-4 flex items-center gap-2">
                <Building2 className="w-4 h-4" />
                Responsible Authority
              </h4>
              <div className="mb-4">
                <p className="font-semibold text-slate-900 dark:text-white">
                  {selectedReport.municipalityInfo.municipality?.name || "Local Municipal Body"}
                </p>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  {selectedReport.municipalityInfo.municipality?.district}, {selectedReport.municipalityInfo.municipality?.state}
                </p>
              </div>

              {selectedReport.municipalityInfo.contacts?.length > 0 && (
                <div className="space-y-3 mb-6">
                  {selectedReport.municipalityInfo.contacts.map((contact: any, idx: number) => (
                    <div key={idx} className="bg-white dark:bg-slate-800 p-3 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700">
                      <p className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">{contact.department}</p>
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                         <span className="text-sm font-medium text-slate-700 dark:text-slate-300 flex items-center gap-2">
                           <Mail className="w-4 h-4 text-indigo-400" />
                           {contact.email}
                         </span>
                         <span className="text-sm font-medium text-slate-700 dark:text-slate-300 flex items-center gap-2">
                           <Phone className="w-4 h-4 text-indigo-400" />
                           {contact.phone}
                         </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {selectedReport.municipalityInfo.emailTemplate && selectedReport.municipalityInfo.contacts?.[0]?.email && (
                <a
                  href={`mailto:${selectedReport.municipalityInfo.contacts[0].email}?subject=${encodeURIComponent(selectedReport.municipalityInfo.emailTemplate.subject)}&body=${encodeURIComponent(selectedReport.municipalityInfo.emailTemplate.body)}`}
                  className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold rounded-xl transition-colors shadow-sm flex items-center justify-center gap-2"
                >
                  <Send className="w-4 h-4" />
                  Send Pre-written Email
                </a>
              )}
            </div>
          )}

          <div className="flex gap-4 mb-8">
              <div className="flex-1 bg-[#f8fafc] dark:bg-slate-800 rounded-2xl p-6">
                <h4 className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">Priority</h4>
                <p className="text-3xl font-bold text-slate-900 dark:text-white">{selectedReport.priorityScore}</p>
              </div>
              <div className="flex-1 bg-[#f8fafc] dark:bg-slate-800 rounded-2xl p-6">
                <h4 className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">Confirmations</h4>
                <p className="text-3xl font-bold text-slate-900 dark:text-white">{selectedReport.corroborationCount}</p>
              </div>
          </div>

          <div className="flex flex-col gap-3 mb-6" data-html2canvas-ignore>
            <div className="flex gap-3">
              {selectedReport.status !== "resolved" && (
                <button
                  onClick={() => onCorroborate(selectedReport.id)}
                  className="flex-1 py-3 bg-[#dcfce7] dark:bg-[#14532d] hover:bg-[#bbf7d0] dark:hover:bg-[#166534] text-[#166534] dark:text-[#4ade80] text-sm font-semibold rounded-xl transition-colors flex items-center justify-center gap-2"
                >
                  <ThumbsUp className="w-4 h-4" />
                  I see this too
                </button>
              )}
              <button
                onClick={onShare}
                className="flex-1 py-3 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-sm font-semibold rounded-xl transition-colors flex items-center justify-center gap-2"
              >
                <Share2 className="w-4 h-4" />
                Share
              </button>
            </div>
            <button
              onClick={handleExportPDF}
              disabled={isExporting}
              className="w-full py-3 bg-indigo-50 dark:bg-indigo-900/30 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 text-indigo-700 dark:text-indigo-400 text-sm font-semibold rounded-xl transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <FileDown className="w-4 h-4" />
              {isExporting ? "Exporting..." : "Export as PDF"}
            </button>
          </div>

          <div className="mt-4 pt-6 border-t border-slate-100 dark:border-slate-800 flex items-center justify-center gap-2">
              <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Reported by <span className="font-bold text-slate-700 dark:text-slate-300">{selectedReport.reporterName}</span></p>
              <CivicBadge count={reporterResolvedCount} />
          </div>

          <div data-html2canvas-ignore>
            <ReportActivityLog reportId={selectedReport.id} reportCreatedAt={selectedReport.createdAt} reporterName={selectedReport.reporterName} user={user} />
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
