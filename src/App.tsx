import { BrowserRouter, Routes, Route, useLocation, Navigate } from "react-router-dom";
import { AnimatePresence } from "motion/react";
import { lazy, Suspense, useEffect, useState } from "react";
import PageTransition from "./components/PageTransition";
import Navigation from "./components/Navigation";
import NotificationListener from "./components/NotificationListener";
import { useTheme } from "./hooks/useTheme";
import { User, onAuthStateChanged } from "firebase/auth";
import { auth } from "./lib/firebase";
import Login from "./pages/Login";

// Lazy-load heavy route pages — each gets its own chunk for faster initial load
const Home = lazy(() => import("./pages/Home"));
const Report = lazy(() => import("./pages/Report"));
const MapPage = lazy(() => import("./pages/Map"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const MyReports = lazy(() => import("./pages/MyReports"));
const Settings = lazy(() => import("./pages/Settings"));
const Admin = lazy(() => import("./pages/Admin"));

// --- MOCK USER: Auth bypassed for testing ---
const MOCK_USER: User = {
  uid: "test-user-001",
  displayName: "Test User",
  email: "test@citizendesk.dev",
  photoURL: null,
  emailVerified: true,
  isAnonymous: false,
  metadata: {} as any,
  providerData: [],
  refreshToken: "",
  tenantId: null,
  delete: async () => {},
  getIdToken: async () => "mock-token",
  getIdTokenResult: async () => ({} as any),
  reload: async () => {},
  toJSON: () => ({}),
  phoneNumber: null,
  providerId: "google.com",
} as unknown as User;

const GUEST_USER: User = {
  ...MOCK_USER,
  uid: "guest-user-001",
  displayName: "Guest Citizen",
  email: "guest@citizendesk.dev",
  isAnonymous: true,
} as unknown as User;

function AnimatedRoutes({ user, isAdmin }: { user: User, isAdmin: boolean }) {
  const location = useLocation();
  
  return (
    <Suspense fallback={
      <div className="flex-1 flex items-center justify-center min-h-[50vh]">
        <div className="w-8 h-8 rounded-full border-4 border-[#007AFF]/20 border-t-[#007AFF] animate-spin" />
      </div>
    }>
      <AnimatePresence mode="wait">
        {/* @ts-expect-error Routes accepts key prop natively but TS types are missing it */}
        <Routes location={location} key={location.pathname}>
          <Route path="/" element={<PageTransition><Home /></PageTransition>} />
          <Route path="/report" element={<PageTransition><Report user={user} /></PageTransition>} />
          <Route path="/map" element={<PageTransition><MapPage user={user} /></PageTransition>} />
          <Route path="/dashboard" element={<PageTransition><Dashboard user={user} /></PageTransition>} />
          <Route path="/my-reports" element={<PageTransition><MyReports user={user} /></PageTransition>} />
          <Route path="/settings" element={<PageTransition><Settings /></PageTransition>} />
          <Route path="/admin" element={isAdmin ? <PageTransition><Admin /></PageTransition> : <Navigate to="/" replace />} />
        </Routes>
      </AnimatePresence>
    </Suspense>
  );
}

export default function App() {
  useTheme();
  
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [demoMode, setDemoMode] = useState(false);
  const [guestMode, setGuestMode] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const activeUser = demoMode ? MOCK_USER : guestMode ? GUEST_USER : user;
  const isAdmin = activeUser?.email === "test@citizendesk.dev";

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-4 border-[#007AFF]/20 border-t-[#007AFF] animate-spin" />
      </div>
    );
  }

  if (!activeUser) {
    return (
      <div className="min-h-screen">
        <Login onDemoMode={() => setDemoMode(true)} onGuestMode={() => setGuestMode(true)} />
      </div>
    );
  }

  return (
    <BrowserRouter>
      <NotificationListener user={activeUser} />
      <div className="min-h-screen flex flex-col font-sans transition-colors">
        <Navigation user={activeUser} isAdmin={isAdmin} />
        <main className="flex-1 w-full max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 pt-24 md:pt-28 pb-24 md:pb-8 flex flex-col">
          <AnimatedRoutes user={activeUser} isAdmin={isAdmin} />
        </main>
      </div>
    </BrowserRouter>
  );
}
