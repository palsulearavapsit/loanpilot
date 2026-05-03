'use client';

import React, { useState, useEffect } from 'react';
import { WifiOff, CloudSync } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export const OfflineFallback: React.FC = () => {
  const [isOffline, setIsOffline] = useState(false);

  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return (
    <AnimatePresence>
      {isOffline && (
        <motion.div 
          initial={{ y: -100 }}
          animate={{ y: 0 }}
          exit={{ y: -100 }}
          className="fixed top-0 left-0 right-0 z-[100] p-4 flex justify-center"
        >
          <div className="bg-destructive text-destructive-foreground px-6 py-3 rounded-full shadow-2xl flex items-center gap-3 font-bold border border-white/20">
            <WifiOff className="w-5 h-5" />
            <span>Connection Lost. Data will be cached locally.</span>
            <div className="w-px h-4 bg-white/20 mx-2" />
            <CloudSync className="w-5 h-5 animate-spin" />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
