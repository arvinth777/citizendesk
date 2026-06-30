import React, { useState, useEffect } from "react";
import { collection, onSnapshot, query, orderBy, Timestamp, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../lib/firebase";
import { User } from "firebase/auth";
import { formatDistanceToNow } from "date-fns";
import { MessageSquare, ThumbsUp, Activity, CheckCircle2, Send } from "lucide-react";

type ActivityItem = {
  id: string;
  type: "comment" | "corroboration" | "status_change" | "creation";
  text?: string;
  userName?: string;
  userId?: string;
  timestamp: any;
  status?: string;
};

export default function ReportActivityLog({ reportId, reportCreatedAt, reporterName, user }: { reportId: string, reportCreatedAt?: any, reporterName?: string, user: User }) {
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [newComment, setNewComment] = useState("");

  useEffect(() => {
    const commentsQ = query(collection(db, `reports/${reportId}/comments`), orderBy("createdAt", "asc"));
    const actsQ = query(collection(db, `reports/${reportId}/activities`), orderBy("timestamp", "asc"));

    let comments: ActivityItem[] = [];
    let acts: ActivityItem[] = [];

    const updateMerged = () => {
       const merged = [...comments, ...acts];
       if (reportCreatedAt) {
          merged.push({
             id: "creation",
             type: "creation",
             userName: reporterName,
             timestamp: reportCreatedAt
          });
       }
       merged.sort((a, b) => {
          const tA = a.timestamp?.toMillis ? a.timestamp.toMillis() : 0;
          const tB = b.timestamp?.toMillis ? b.timestamp.toMillis() : 0;
          return tB - tA; // sort descending
       });
       setActivities(merged);
       setLoading(false);
    };

    const unsubComments = onSnapshot(commentsQ, (snap) => {
       comments = snap.docs.map(doc => {
          const d = doc.data();
          return {
             id: doc.id,
             type: "comment",
             text: d.text,
             userName: d.authorName,
             userId: d.authorId,
             timestamp: d.createdAt
          };
       });
       updateMerged();
    });

    const unsubActs = onSnapshot(actsQ, (snap) => {
       acts = snap.docs.map(doc => {
          const d = doc.data();
          return {
             id: doc.id,
             type: d.type,
             userName: d.userName,
             userId: d.userId,
             timestamp: d.timestamp,
             status: d.status
          };
       });
       updateMerged();
    });

    return () => {
       unsubComments();
       unsubActs();
    };
  }, [reportId, reportCreatedAt, reporterName]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    try {
      await addDoc(collection(db, `reports/${reportId}/comments`), {
        text: newComment,
        authorId: user.uid,
        authorName: user.displayName || "Anonymous",
        createdAt: serverTimestamp()
      });
      setNewComment("");
    } catch (err) {
      console.error(err);
      alert("Failed to post comment.");
    }
  };

  if (loading) {
     return <div className="animate-pulse flex space-x-4 p-4 mt-6 border-t border-slate-100 dark:border-slate-800 pt-6"><div className="flex-1 space-y-4 py-1"><div className="h-2 bg-slate-200 dark:bg-slate-700 rounded"></div></div></div>;
  }

  return (
    <div className="flex flex-col gap-4 mt-6 border-t border-slate-100 dark:border-slate-800 pt-6">
      <h3 className="text-lg font-bold text-slate-900 dark:text-white tracking-tight">Activity log</h3>
      <div className="flex flex-col gap-6 max-h-[300px] overflow-y-auto pr-2">
        {activities.map((item, index) => (
           <div key={item.id} className="flex gap-3">
              <div className="mt-0.5 flex-shrink-0">
                 {item.type === "creation" && <div className="w-8 h-8 rounded-full bg-[#E5F0FF] dark:bg-[#007AFF]/20 text-[#007AFF] dark:text-[#66B2FF] flex items-center justify-center"><Activity className="w-4 h-4" /></div>}
                 {item.type === "comment" && <div className="w-8 h-8 rounded-full bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center"><MessageSquare className="w-4 h-4" /></div>}
                 {item.type === "corroboration" && <div className="w-8 h-8 rounded-full bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-400 flex items-center justify-center"><ThumbsUp className="w-4 h-4" /></div>}
                 {item.type === "status_change" && <div className="w-8 h-8 rounded-full bg-orange-50 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 flex items-center justify-center"><CheckCircle2 className="w-4 h-4" /></div>}
              </div>
              <div>
                 <p className="text-sm text-slate-900 dark:text-white">
                    <span className="font-semibold">{item.userName || "Someone"}</span>
                    {item.type === "creation" && " created the report"}
                    {item.type === "corroboration" && " corroborated this issue"}
                    {item.type === "status_change" && ` changed status to ${item.status?.replace("_", " ")}`}
                 </p>
                 {item.type === "comment" && <p className="text-sm text-slate-600 dark:text-slate-300 mt-1">{item.text}</p>}
                 {item.timestamp && (
                    <p className="text-xs text-slate-400 mt-1">{formatDistanceToNow(item.timestamp.toDate ? item.timestamp.toDate() : new Date(item.timestamp), { addSuffix: true })}</p>
                 )}
              </div>
           </div>
        ))}
        {activities.length === 0 && <p className="text-sm text-slate-500 dark:text-slate-400">No activity yet.</p>}
      </div>

      <form onSubmit={handleSubmit} className="flex gap-2 relative mt-2">
        <input 
          type="text"
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          placeholder="Add an update or comment..."
          className="flex-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-full py-2.5 pl-4 pr-12 text-sm text-slate-900 dark:text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-[#007AFF]"
        />
        <button 
          type="submit"
          disabled={!newComment.trim()}
          className="absolute right-1 top-1 bottom-1 w-8 flex items-center justify-center bg-[#007AFF] text-white rounded-full hover:bg-[#007AFF]/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Send className="w-4 h-4 -ml-0.5" />
        </button>
      </form>
    </div>
  );
}
