import React, { useEffect } from 'react';
import { X } from 'lucide-react';
import { motion, AnimatePresence } from "motion/react";

export default function Lightbox({ src, alt, onClose }: { src: string, alt: string, onClose: () => void }) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  return (
    <AnimatePresence>
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4" 
        onClick={onClose}
      >
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 p-2 bg-black/50 text-white rounded-full hover:bg-black/70 transition-colors z-10"
        >
          <X className="w-6 h-6" />
        </button>
        <motion.img 
          drag="y"
          dragConstraints={{ top: 0, bottom: 0 }}
          dragElastic={0.8}
          onDragEnd={(e, info) => {
            if (Math.abs(info.offset.y) > 100 || Math.abs(info.velocity.y) > 500) {
              onClose();
            }
          }}
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
          src={src} 
          alt={alt} 
          crossOrigin="anonymous"
          className="max-w-full max-h-[90vh] object-contain rounded-lg shadow-2xl cursor-grab active:cursor-grabbing"
          onClick={(e) => e.stopPropagation()} 
        />
      </motion.div>
    </AnimatePresence>
  );
}
