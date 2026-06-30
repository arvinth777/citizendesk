import { useEffect, useRef, useState } from 'react';
import { User } from 'firebase/auth';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db, requestNotificationPermission, messaging } from '../lib/firebase';
import { onMessage } from 'firebase/messaging';
import { CheckCircle2, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

type Toast = {
  id: string;
  title: string;
  body: string;
};

export default function NotificationListener({ user }: { user: User }) {
  const initialized = useRef(false);
  const previousStatusMap = useRef<Record<string, string>>({});
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = (title: string, body: string) => {
    const id = Math.random().toString(36).substring(7);
    setToasts((prev) => [...prev, { id, title, body }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 5000);
  };

  useEffect(() => {
    // Request permission for native notifications when user logs in
    requestNotificationPermission();

    // Listen for FCM foreground messages
    let unsubscribeFCM = () => {};
    if (messaging) {
      unsubscribeFCM = onMessage(messaging, (payload) => {
        if (payload.notification?.title && payload.notification?.body) {
           addToast(payload.notification.title, payload.notification.body);
        }
      });
    }

    const q = query(collection(db, "reports"), where("reporterId", "==", user.uid));
    const unsubscribeFirestore = onSnapshot(q, (snapshot) => {
      if (!initialized.current) {
        // First load, just record current states
        snapshot.docs.forEach(doc => {
          previousStatusMap.current[doc.id] = doc.data().status;
        });
        initialized.current = true;
        return;
      }

      snapshot.docChanges().forEach((change) => {
        if (change.type === "modified") {
          const data = change.doc.data();
          const prevStatus = previousStatusMap.current[change.doc.id];
          
          if (prevStatus === 'open' && data.status === 'resolved') {
             // Status changed from open to resolved! Trigger local UI notification
             addToast('Report Resolved!', `Good news! Your report "${data.description}" has been marked as resolved.`);
          }
          
          previousStatusMap.current[change.doc.id] = data.status;
        } else if (change.type === "added") {
          previousStatusMap.current[change.doc.id] = change.doc.data().status;
        }
      });
    });

    return () => {
      unsubscribeFirestore();
      unsubscribeFCM();
    };
  }, [user]);

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
      <AnimatePresence>
        {toasts.map((toast) => (
          <motion.div
            key={toast.id}
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.2 } }}
            className="bg-white rounded-xl shadow-lg border border-slate-200 p-4 w-80 flex items-start gap-3"
          >
            <CheckCircle2 className="w-5 h-5 text-[#34C759] flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h4 className="text-sm font-semibold text-slate-900">{toast.title}</h4>
              <p className="text-sm text-slate-600 mt-1 leading-relaxed">{toast.body}</p>
            </div>
            <button 
              onClick={() => setToasts(t => t.filter(x => x.id !== toast.id))}
              className="text-slate-400 hover:text-slate-600 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
