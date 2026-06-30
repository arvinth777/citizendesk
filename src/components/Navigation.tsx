import { Link, useLocation } from "react-router-dom";
import { User } from "firebase/auth";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { db, logout } from "../lib/firebase";
import { LogOut, Home, FileText, MapPin, ClipboardList, BarChart2, Database } from "lucide-react";
import { clsx } from "clsx";
import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";

export default function Navigation({ user, isAdmin }: { user: User, isAdmin?: boolean }) {
  const location = useLocation();
  const navigate = useNavigate();
  const [resolvedCount, setResolvedCount] = useState(0);
  const { t } = useTranslation();

  useEffect(() => {
    if (!user?.uid) return;
    const q = query(collection(db, "reports"), where("reporterId", "==", user.uid), where("status", "==", "resolved"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setResolvedCount(snapshot.docs.length);
    });
    return () => unsubscribe();
  }, [user]);

  const links = [
    { name: t("Home"), path: "/", id: "tour-nav-home", icon: Home },
    { name: t("Report"), path: "/report", id: "tour-nav-report", icon: FileText },
    { name: t("Map"), path: "/map", id: "tour-nav-map", icon: MapPin },
    { name: t("Stats"), path: "/dashboard", id: "tour-nav-dashboard", icon: BarChart2 },
    { name: t("Mine"), path: "/my-reports", id: "tour-nav-mine", icon: ClipboardList },
  ];

  if (isAdmin) {
    links.push({ name: t("Admin"), path: "/admin", id: "tour-nav-admin", icon: Database });
  }

  return (
    <>
      {/* Fixed Top Navbar (Desktop/Tablet) */}
      <header className="fixed top-0 left-0 right-0 h-16 bg-white/80 dark:bg-[#1C1C1E]/80 backdrop-blur-[32px] border-b border-black/[0.05] dark:border-white/[0.05] shadow-[0_2px_12px_rgba(0,0,0,0.03)] z-50 hidden md:block">
        <div className="max-w-[1400px] mx-auto px-6 h-full flex items-center justify-between">
          {/* Logo Section */}
          <Link to="/" className="flex items-center gap-2">
            <svg className="w-[140px] h-[42px] text-[#1C1C1E] dark:text-white" viewBox="0 0 200 60" xmlns="http://www.w3.org/2000/svg">
              <path d="M30 15C21.7157 15 15 21.7157 15 30C15 38.2843 21.7157 45 30 45H45V30C45 21.7157 38.2843 15 30 15ZM30 18C36.6274 18 42 23.3726 42 30V42H30C23.3726 42 18 36.6274 18 30C18 23.3726 23.3726 18 30 18Z" fill="currentColor"/>
              <rect x="28" y="28" width="4" height="4" rx="2" fill="currentColor"/>
              <text x="60" y="38" font-family="-apple-system, BlinkMacSystemFont, 'SF Pro Display', sans-serif" font-size="22" font-weight="600" letter-spacing="-0.5" fill="currentColor">Citizen Desk</text>
            </svg>
          </Link>

          {/* Navigation Links */}
          <nav className="flex items-center gap-1.5 bg-slate-100/50 dark:bg-slate-800/40 p-1 rounded-full border border-slate-200/20">
            {links.map((link) => {
              const isActive = location.pathname === link.path || (link.path === '/' && location.pathname === '/');
              return (
                <Link
                  key={link.path}
                  id={link.id}
                  to={link.path}
                  className={clsx(
                    "px-5 py-2 text-sm font-semibold transition-all rounded-full tracking-apple",
                    isActive
                      ? "bg-[#1C1C1E] dark:bg-white text-white dark:text-[#1C1C1E] shadow-sm"
                      : "text-[#8E8E93] dark:text-[#98989D] hover:text-[#1C1C1E] dark:hover:text-white"
                  )}
                >
                  {link.name}
                </Link>
              );
            })}
          </nav>

          {/* User Profile / Auth Section */}
          <div className="flex items-center gap-3">
            {user ? (
              <div className="bg-slate-100/60 dark:bg-slate-800/60 border border-slate-200/25 dark:border-slate-700/25 rounded-full py-1 pl-1 pr-3.5 flex items-center gap-3">
                <img 
                  src={user.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.displayName || 'User')}&background=E5E5EA&color=1C1C1E`} 
                  alt="Avatar" 
                  className="w-8 h-8 rounded-full object-cover shadow-sm border border-black/5 dark:border-white/5" 
                />
                <div className="flex flex-col text-left">
                  <span className="text-[13px] font-semibold text-[#1C1C1E] dark:text-white leading-tight tracking-apple">
                    {user.displayName?.split(' ')[0]}
                  </span>
                  <span className="text-[10px] text-[#8E8E93] leading-none mt-0.5">
                    {user.email?.split('@')[0]}
                  </span>
                </div>
                <button
                  onClick={logout}
                  className="p-1.5 text-[#8E8E93] hover:text-[#FF3B30] dark:hover:text-[#FF453A] transition-colors ml-1"
                  title="Log Out"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button className="px-5 py-2 bg-[#007AFF] hover:bg-[#007AFF]/90 text-white text-sm font-semibold rounded-full transition-all">
                Sign in with Google
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Mobile Bottom Navigation */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 nav-glass border-t-0 z-50 pb-safe shadow-[0_-5px_20px_rgba(0,0,0,0.05)]">
        <div className="flex justify-around items-center h-16 px-2">
          {links.map((link) => {
            const isActive = location.pathname === link.path || (link.path === '/' && location.pathname === '/');
            const Icon = link.icon;
            return (
              <Link
                key={link.path}
                to={link.path}
                className={clsx(
                  "flex flex-col items-center justify-center w-full h-full space-y-1 transition-colors",
                  isActive ? "text-[#1C1C1E] dark:text-white" : "text-slate-500 dark:text-slate-400"
                )}
              >
                <Icon className="w-5 h-5" />
                <span className="text-[10px] font-medium tracking-apple">{link.name}</span>
              </Link>
            );
          })}
        </div>
      </div>
    </>
  );
}
