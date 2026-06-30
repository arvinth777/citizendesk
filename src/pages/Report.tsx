import React, { useState, useRef, useEffect } from "react";
import { User } from "firebase/auth";
import { Camera, MapPin, Loader2, CheckCircle2, AlertCircle, LocateFixed, Phone, Mail, Building2, ImagePlus, X, PenLine } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence, useReducedMotion } from "motion/react";

type LocState = 'idle' | 'loading' | 'success' | 'error' | 'manual';

export default function Report({ user }: { user: User }) {
  const navigate = useNavigate();
  const prefersReducedMotion = useReducedMotion();

  // Media States
  const [description, setDescription] = useState("");
  const [fileState, setFileState] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Location States
  const [locState, setLocState] = useState<LocState>('idle');
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [address, setAddress] = useState("");
  const [manualAddress, setManualAddress] = useState("");

  // Municipality States
  const [municipality, setMunicipality] = useState<any>(null);
  const [loadingMuni, setLoadingMuni] = useState(false);

  // Submission States
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [result, setResult] = useState<{ message: string; isDuplicate?: boolean; id?: string } | null>(null);
  const submitLock = useRef(false);

  // Constants
  const MAX_CHARS = 300;

  // --- Handlers ---
  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement> | React.DragEvent<HTMLDivElement>) => {
    setUploadError(null);
    let file: File | undefined;
    
    if ('dataTransfer' in e) {
       file = e.dataTransfer.files?.[0];
    } else {
       file = e.target.files?.[0];
    }

    if (!file) return;

    if (!file.type.startsWith('image/') && !file.type.startsWith('video/')) {
      setUploadError("Invalid format. Please upload an image or video.");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setUploadError("File exceeds 10MB limit.");
      return;
    }
    
    setFileState(file);
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    
    // Attempt auto-description
    setIsAnalyzing(true);
    const formData = new FormData();
    formData.append("media", file);
    
    fetch("/api/analyze-media", { method: "POST", body: formData })
      .then(res => res.ok ? res.json() : Promise.reject())
      .then(data => { if (data.description) setDescription(data.description); })
      .catch(() => console.warn("Auto-analysis skipped or failed"))
      .finally(() => setIsAnalyzing(false));
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handlePhotoUpload(e);
    }
  };

  const getLocation = () => {
    setLocState('loading');
    setMunicipality(null);
    setAddress("");
    
    if ("geolocation" in navigator) {
      const timeoutId = setTimeout(() => {
        setLocState('error');
      }, 10000);

      navigator.geolocation.getCurrentPosition(
        async (position) => {
          clearTimeout(timeoutId);
          const lat = position.coords.latitude;
          const lng = position.coords.longitude;
          setLocation({ lat, lng });
          
          try {
            const geoRes = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`);
            if (geoRes.ok) {
              const geoData = await geoRes.json();
              setAddress(geoData.display_name || `${lat.toFixed(4)}, ${lng.toFixed(4)}`);
            } else {
              setAddress(`${lat.toFixed(4)}, ${lng.toFixed(4)}`);
            }
          } catch {
             setAddress(`${lat.toFixed(4)}, ${lng.toFixed(4)}`);
          }
          
          setLocState('success');

          // Fetch municipality in background
          setLoadingMuni(true);
          try {
            const muniRes = await fetch("/api/find-municipality", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ lat, lng, address: "", category: "", description }),
            });
            if (muniRes.ok) {
              setMunicipality(await muniRes.json());
            }
          } catch (e) {
             console.warn("Municipality fetch failed");
          } finally {
            setLoadingMuni(false);
          }
        },
        (error) => {
          console.error(error);
          clearTimeout(timeoutId);
          setLocState('error');
        },
        { timeout: 10000 }
      );
    } else {
      setLocState('error');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitLock.current) return;
    
    setSubmitError(null);
    if (!description.trim() && !fileState) {
      setSubmitError("Please provide a description or a photo.");
      return;
    }
    if (locState === 'manual' && !manualAddress.trim()) {
      setSubmitError("Please enter a location manually.");
      return;
    }

    submitLock.current = true;
    setIsSubmitting(true);

    try {
      const lat = location?.lat ?? 12.9716;
      const lng = location?.lng ?? 77.5946;
      const resolvedAddress = (locState === 'manual' ? manualAddress : address) || `Approximate Location: ${lat.toFixed(4)}, ${lng.toFixed(4)}`;

      const abortController = new AbortController();
      const timeoutId = setTimeout(() => abortController.abort(), 90000); 

      const formData = new FormData();
      formData.append("description", description);
      formData.append("lat", lat.toString());
      formData.append("lng", lng.toString());
      formData.append("address", resolvedAddress);
      formData.append("reporterId", user.uid);
      formData.append("reporterName", user.displayName || "Citizen");
      if (municipality) {
         formData.append("municipalityInfo", JSON.stringify(municipality));
      }
      if (fileState) {
        formData.append("media", fileState);
      }

      const response = await fetch("/api/process-report", {
        method: "POST",
        signal: abortController.signal,
        body: formData,
      });

      clearTimeout(timeoutId);

      if (!response.ok) throw new Error("Server error");
      const data = await response.json();
      setResult(data);
      
    } catch (error: any) {
      console.error(error);
      setSubmitError(error.name === 'AbortError' ? "Request timed out." : "Network error, please try again.");
    } finally {
      setIsSubmitting(false);
      submitLock.current = false;
    }
  };

  // --- Render Helpers ---
  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: prefersReducedMotion ? 0 : 0.1,
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: prefersReducedMotion ? 0 : 20 },
    show: { opacity: 1, y: 0, transition: { duration: prefersReducedMotion ? 0 : 0.4, ease: "easeOut" } }
  };

  return (
    <div className="relative min-h-[calc(100vh-100px)] w-full flex justify-center py-10 px-4 overflow-hidden">
      {/* Subtle radial background glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-[800px] h-[600px] bg-[#007AFF]/5 dark:bg-[#007AFF]/10 blur-[100px] rounded-full pointer-events-none -z-10" />

      <AnimatePresence mode="wait">
        {result ? (
           // SUCCESS CARD
          <motion.div 
            key="success"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-lg mx-auto bg-white dark:bg-[#1C1C1E] rounded-3xl shadow-xl border border-black/5 dark:border-white/10 p-10 text-center flex flex-col items-center justify-center min-h-[400px]"
          >
            <motion.div 
              initial={{ scale: 0 }} 
              animate={{ scale: 1 }} 
              transition={{ type: "spring", damping: 15, delay: 0.1 }}
              className="w-20 h-20 bg-[#34C759]/10 text-[#34C759] rounded-full flex items-center justify-center mb-6"
            >
              <CheckCircle2 className="w-10 h-10" />
            </motion.div>
            <h2 className="text-3xl font-bold text-[#1C1C1E] dark:text-white tracking-tight mb-3">Report Submitted</h2>
            <p className="text-[#8E8E93] text-base leading-relaxed mb-10">{result.message}</p>
            
            <div className="w-full space-y-3">
              <button
                onClick={() => navigate("/map")}
                className="w-full py-4 bg-[#007AFF] hover:bg-[#0A84FF] text-white font-semibold rounded-2xl transition-colors shadow-sm"
              >
                Track it on the map
              </button>
              <button
                onClick={() => {
                   setResult(null); setDescription(""); setFileState(null); setPreviewUrl(null);
                   setLocState('idle'); setAddress(""); setManualAddress("");
                }}
                className="w-full py-4 bg-transparent text-[#007AFF] hover:bg-[#007AFF]/10 font-medium rounded-2xl transition-colors"
              >
                File another issue
              </button>
            </div>
          </motion.div>
        ) : (
          // REPORT FORM
          <motion.div 
            key="form"
            variants={containerVariants}
            initial="hidden"
            animate="show"
            className="w-full max-w-2xl mx-auto"
          >
            <motion.div variants={itemVariants} className="text-center mb-10">
              <h1 className="text-4xl sm:text-[44px] font-bold text-[#1C1C1E] dark:text-white tracking-tight leading-none mb-3">Report an issue</h1>
              <p className="text-lg text-[#8E8E93] tracking-apple">Help us improve your community.</p>
            </motion.div>

            <form onSubmit={handleSubmit} className="space-y-8">
              
              {/* Photo Upload Card */}
              <motion.div variants={itemVariants} className="relative group">
                <div 
                  onDragEnter={handleDrag} onDragLeave={handleDrag} onDragOver={handleDrag} onDrop={handleDrop}
                  onClick={() => !fileState && fileInputRef.current?.click()}
                  onKeyDown={(e) => { if ((e.key === "Enter" || e.key === " ") && !fileState) fileInputRef.current?.click(); }}
                  tabIndex={0}
                  className={`
                    w-full min-h-[280px] rounded-[32px] p-6 flex flex-col items-center justify-center text-center cursor-pointer overflow-hidden outline-none
                    border-2 transition-all duration-300 ease-out focus-visible:ring-4 focus-visible:ring-[#007AFF]/30
                    ${dragActive ? 'border-[#007AFF] bg-[#007AFF]/5 scale-[1.02]' : 'border-dashed border-black/10 dark:border-white/10 bg-white/50 dark:bg-[#1C1C1E]/50 hover:bg-white dark:hover:bg-[#2C2C2E]'}
                    ${uploadError ? 'border-red-500 bg-red-50 dark:bg-red-900/10' : ''}
                    ${fileState ? 'border-transparent border-solid bg-[#F2F2F7] dark:bg-[#1C1C1E] shadow-sm' : ''}
                  `}
                >
                  {previewUrl ? (
                    <div className="relative w-full h-full flex flex-col items-center justify-center">
                      {fileState?.type.startsWith('video/') ? (
                        <video src={previewUrl} controls className="max-h-64 rounded-2xl bg-black object-cover w-full h-full absolute inset-0" />
                      ) : (
                        <img src={previewUrl} alt="Preview" className="max-h-64 w-auto object-cover rounded-2xl shadow-sm z-10" />
                      )}
                      <div className="absolute top-4 right-4 z-20 flex items-center justify-center transition-opacity">
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); setFileState(null); setPreviewUrl(null); if(fileInputRef.current) fileInputRef.current.value = ""; }}
                          className="flex items-center gap-1.5 px-4 py-2 bg-black/60 backdrop-blur-md text-white rounded-full font-semibold shadow-xl hover:scale-105 transition-transform text-sm"
                        >
                          <X className="w-4 h-4" /> Replace
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center z-10">
                      <motion.div 
                        animate={{ y: dragActive && !prefersReducedMotion ? -10 : 0 }}
                        className="w-16 h-16 bg-white dark:bg-[#2C2C2E] rounded-full shadow-sm flex items-center justify-center mb-4 text-[#007AFF] group-hover:shadow-md transition-shadow"
                      >
                         <Camera className={`w-8 h-8 ${!prefersReducedMotion && 'group-hover:animate-bounce'}`} />
                      </motion.div>
                      <p className="text-[19px] font-semibold text-[#1C1C1E] dark:text-white tracking-tight mb-1">Upload a photo</p>
                      <p className="text-[15px] text-[#8E8E93]">Drag & drop or tap to browse</p>
                      {uploadError && <p className="text-red-500 text-sm font-medium mt-3 px-4 py-1.5 bg-red-100 dark:bg-red-900/30 rounded-lg">{uploadError}</p>}
                    </div>
                  )}
                  <input ref={fileInputRef} type="file" accept="image/*,video/*" className="hidden" onChange={handlePhotoUpload} />
                </div>
              </motion.div>

              {/* Smart Location Field */}
              <motion.div variants={itemVariants} className="space-y-3">
                <div className="relative">
                  <div 
                    onClick={locState === 'idle' || locState === 'error' ? getLocation : undefined}
                    className={`
                      w-full p-5 rounded-2xl border flex items-center gap-4 transition-all overflow-hidden
                      ${locState === 'manual' ? 'border-[#007AFF] bg-white dark:bg-[#1C1C1E] shadow-[0_4px_20px_rgba(0,122,255,0.15)]' : 'bg-white dark:bg-[#1C1C1E] border-black/5 dark:border-white/10 hover:shadow-sm'}
                      ${(locState === 'idle' || locState === 'error') ? 'cursor-pointer' : ''}
                    `}
                  >
                    <div className="shrink-0 flex items-center justify-center w-8 h-8 rounded-full bg-[#F2F2F7] dark:bg-[#2C2C2E]">
                      {locState === 'loading' ? <Loader2 className="w-4 h-4 text-[#007AFF] animate-spin" /> : 
                       locState === 'success' ? <CheckCircle2 className="w-5 h-5 text-[#34C759]" /> :
                       locState === 'error' ? <AlertCircle className="w-5 h-5 text-red-500" /> :
                       locState === 'manual' ? <PenLine className="w-4 h-4 text-[#007AFF]" /> :
                       <MapPin className="w-4 h-4 text-[#8E8E93]" />}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      {locState === 'manual' ? (
                        <input
                          autoFocus
                          type="text"
                          value={manualAddress}
                          onChange={(e) => setManualAddress(e.target.value)}
                          placeholder="Type address or landmark..."
                          className="w-full bg-transparent border-none p-0 focus:ring-0 text-[17px] text-[#1C1C1E] dark:text-white placeholder:text-[#8E8E93]"
                        />
                      ) : (
                        <p className={`text-[17px] truncate ${locState === 'success' ? 'text-[#1C1C1E] dark:text-white font-medium' : 'text-[#8E8E93]'}`}>
                          {locState === 'loading' ? 'Acquiring GPS lock...' :
                           locState === 'success' ? address :
                           locState === 'error' ? 'Location timeout. Tap to retry.' :
                           'Tap to read your GPS'}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
                
                {locState !== 'manual' && (
                  <div className="flex justify-end px-2">
                    <button type="button" onClick={() => setLocState('manual')} className="text-[13px] text-[#007AFF] font-medium hover:underline">
                      Or type address manually
                    </button>
                  </div>
                )}
                
                {/* Municipality Details (Optional/Graceful) */}
                {(loadingMuni || municipality) && locState === 'success' && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="px-1 overflow-hidden">
                     <div className="flex items-center gap-2 text-[13px] text-[#8E8E93]">
                        <Building2 className="w-4 h-4" />
                        {loadingMuni ? "Identifying local authority..." : municipality?.municipality?.name}
                     </div>
                  </motion.div>
                )}
              </motion.div>

              {/* Description Field with Floating Label */}
              <motion.div variants={itemVariants} className="relative group">
                <div className={`
                  relative rounded-2xl border border-black/5 dark:border-white/10 bg-white dark:bg-[#1C1C1E] overflow-hidden transition-shadow focus-within:border-[#007AFF] focus-within:shadow-[0_4px_20px_rgba(0,122,255,0.1)]
                `}>
                  <label className={`
                    absolute left-4 transition-all duration-200 pointer-events-none text-[#8E8E93]
                    ${description.length > 0 ? 'top-3 text-[12px] font-medium' : 'top-5 text-[17px] group-focus-within:top-3 group-focus-within:text-[12px] group-focus-within:font-medium group-focus-within:text-[#007AFF]'}
                  `}>
                    Short description {isAnalyzing && <Loader2 className="w-3 h-3 animate-spin inline ml-2" />}
                  </label>
                  <textarea
                    rows={4}
                    value={description}
                    onChange={(e) => setDescription(e.target.value.slice(0, MAX_CHARS))}
                    className="w-full bg-transparent border-none pt-9 pb-8 px-4 text-[17px] text-[#1C1C1E] dark:text-white focus:ring-0 resize-none outline-none"
                  />
                  <div className={`
                    absolute bottom-3 right-4 text-[12px] font-medium transition-colors
                    ${description.length >= MAX_CHARS ? 'text-red-500' : description.length >= MAX_CHARS * 0.9 ? 'text-[#D97706]' : 'text-[#8E8E93]'}
                  `}>
                    {description.length} / {MAX_CHARS}
                  </div>
                </div>
              </motion.div>

              {/* Submit Section */}
              <motion.div variants={itemVariants} className="pt-4 flex flex-col items-center">
                <AnimatePresence mode="wait">
                  {submitError && (
                    <motion.div 
                      key="error"
                      initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                      className="mb-4 px-4 py-2 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm font-medium rounded-full flex items-center gap-2"
                    >
                      <AlertCircle className="w-4 h-4" /> {submitError}
                    </motion.div>
                  )}
                </AnimatePresence>

                <motion.button
                  whileTap={!isSubmitting ? { scale: prefersReducedMotion ? 1 : 0.98 } : {}}
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-4 bg-[#007AFF] hover:bg-[#0A84FF] text-white text-[17px] font-semibold rounded-[20px] shadow-[0_8px_20px_rgba(0,122,255,0.25)] transition-colors flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" /> Processing...
                    </>
                  ) : (
                    "Submit Report"
                  )}
                </motion.button>
                <p className="mt-4 text-[12px] text-[#8E8E93] text-center max-w-sm">
                  Reports are securely categorized and automatically escalated to the appropriate local authority.
                </p>
              </motion.div>

            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
