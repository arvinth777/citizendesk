import { useState } from "react";
import { loginWithGoogle, loginAnonymously } from "../lib/firebase";
import { LogIn, User, Sparkles } from "lucide-react";
import { motion } from "motion/react";

interface LoginProps {
  onDemoMode: () => void;
  onGuestMode: () => void;
}

export default function Login({ onDemoMode, onGuestMode }: LoginProps) {
  const [loading, setLoading] = useState(false);

  const handleGoogleLogin = async () => {
    setLoading(true);
    await loginWithGoogle();
    setLoading(false);
  };

  const handleGuestLogin = async () => {
    setLoading(true);
    try {
      await loginAnonymously();
    } catch (e) {
      console.warn("Firebase Anonymous Auth not enabled, falling back to local guest mode.");
      onGuestMode();
    }
    setLoading(false);
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className="min-h-[80vh] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8"
    >
      <div className="max-w-md w-full space-y-8 bg-white dark:bg-slate-900 p-8 sm:p-10 rounded-[32px] shadow-xl border border-slate-200 dark:border-slate-800">
        <div className="text-center">
          <div className="w-16 h-16 bg-[#E5F0FF] dark:bg-[#007AFF]/20 text-[#007AFF] dark:text-[#66B2FF] rounded-2xl flex items-center justify-center mx-auto mb-6">
            <LogIn className="w-8 h-8" />
          </div>
          <h2 
            className="text-3xl font-bold text-slate-900 dark:text-white mb-2"
            style={{ fontFamily: 'Syne, sans-serif' }}
          >
            Welcome to Citizen Desk
          </h2>
          <p className="text-slate-600 dark:text-slate-400 text-sm">
            Sign in to report issues or access the admin tools.
          </p>
        </div>

        <div className="mt-8 space-y-4">
          <button
            onClick={handleGoogleLogin}
            disabled={loading}
            className="w-full flex items-center justify-center gap-3 py-3.5 px-4 border border-slate-300 dark:border-slate-700 rounded-xl shadow-sm bg-white dark:bg-slate-800 text-sm font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors disabled:opacity-50"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                fill="#4285F4"
              />
              <path
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                fill="#34A853"
              />
              <path
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                fill="#FBBC05"
              />
              <path
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                fill="#EA4335"
              />
            </svg>
            Continue with Google
          </button>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-200 dark:border-slate-800" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white dark:bg-slate-900 text-slate-500">or</span>
            </div>
          </div>

          <button
            onClick={handleGuestLogin}
            disabled={loading}
            className="w-full flex items-center justify-center gap-3 py-3.5 px-4 border border-transparent rounded-xl shadow-sm text-sm font-semibold text-white bg-slate-800 hover:bg-slate-900 dark:bg-slate-700 dark:hover:bg-slate-600 transition-colors disabled:opacity-50"
          >
            <User className="w-5 h-5" />
            Continue as Guest
          </button>
        </div>
        
        <div className="mt-6 pt-6 border-t border-slate-200 dark:border-slate-800">
           <button
             onClick={onDemoMode}
             disabled={loading}
             className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-sm font-semibold text-[#007AFF] bg-[#E5F0FF] hover:bg-[#D1E4FF] dark:text-[#66B2FF] dark:bg-[#007AFF]/20 dark:hover:bg-[#007AFF]/30 transition-colors"
           >
             <Sparkles className="w-4 h-4" />
             View Demo Mode (Judges)
           </button>
           <p className="mt-3 text-center text-xs text-slate-500 dark:text-slate-400">
             Demo Mode bypasses authentication and populates mock data to preview all features instantly.
           </p>
        </div>
      </div>
    </motion.div>
  );
}
